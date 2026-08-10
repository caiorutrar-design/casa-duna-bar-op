
-- Staff helper
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','manager','bartender','garcom','barman')
  )
$$;

-- DRINKS
DROP POLICY IF EXISTS "Authenticated can insert drinks" ON public.drinks;
DROP POLICY IF EXISTS "Authenticated can update drinks" ON public.drinks;
DROP POLICY IF EXISTS "Authenticated can delete drinks" ON public.drinks;
CREATE POLICY "Managers can insert drinks" ON public.drinks FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can update drinks" ON public.drinks FOR UPDATE TO authenticated USING (public.is_manager_or_admin(auth.uid())) WITH CHECK (public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can delete drinks" ON public.drinks FOR DELETE TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- ORDERS
DROP POLICY IF EXISTS "Authenticated can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated can update orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated can read orders" ON public.orders;
CREATE POLICY "Staff can read orders" ON public.orders FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update orders" ON public.orders FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ORDER ITEMS
DROP POLICY IF EXISTS "Authenticated can insert order_items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated can update order_items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated can read order_items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated can delete order_items" ON public.order_items;
CREATE POLICY "Staff can read order_items" ON public.order_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert order_items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update order_items" ON public.order_items FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete order_items" ON public.order_items FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- INGREDIENTS
DROP POLICY IF EXISTS "Authenticated can read ingredients" ON public.ingredients;
CREATE POLICY "Staff can read ingredients" ON public.ingredients FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- STOCK MOVEMENTS
DROP POLICY IF EXISTS "Authenticated can read stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Authenticated can insert stock_movements" ON public.stock_movements;
CREATE POLICY "Staff can read stock_movements" ON public.stock_movements FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert stock_movements" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- TABLES
DROP POLICY IF EXISTS "Anyone can read tables" ON public.tables;
DROP POLICY IF EXISTS "Authenticated can insert tables" ON public.tables;
DROP POLICY IF EXISTS "Authenticated can update tables" ON public.tables;
CREATE POLICY "Staff can read tables" ON public.tables FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert tables" ON public.tables FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update tables" ON public.tables FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
REVOKE SELECT ON public.tables FROM anon;

-- AUDIT LOGS: only own identity
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert their own audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Generic stock movement reasons (no sale/order IDs)
CREATE OR REPLACE FUNCTION public.process_sale(p_drink_id uuid, p_bartender_name text, p_quantity integer DEFAULT 1)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_recipe RECORD;
  v_total_cost DECIMAL(10, 2) := 0;
  v_sale_id UUID;
  v_insufficient_stock TEXT := '';
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  FOR v_recipe IN 
    SELECT r.ingredient_id, r.quantity, i.name, i.current_stock, i.cost_per_unit
    FROM public.recipes r
    JOIN public.ingredients i ON r.ingredient_id = i.id
    WHERE r.drink_id = p_drink_id
  LOOP
    IF v_recipe.current_stock < (v_recipe.quantity * p_quantity) THEN
      v_insufficient_stock := v_insufficient_stock || v_recipe.name || ', ';
    END IF;
    v_total_cost := v_total_cost + (v_recipe.quantity * v_recipe.cost_per_unit * p_quantity);
  END LOOP;

  IF v_insufficient_stock != '' THEN
    RETURN json_build_object('success', false, 'error', 'Estoque insuficiente: ' || TRIM(TRAILING ', ' FROM v_insufficient_stock));
  END IF;

  INSERT INTO public.sales (drink_id, bartender_name, quantity, total_cost)
  VALUES (p_drink_id, p_bartender_name, p_quantity, v_total_cost)
  RETURNING id INTO v_sale_id;

  FOR v_recipe IN 
    SELECT r.ingredient_id, r.quantity
    FROM public.recipes r
    WHERE r.drink_id = p_drink_id
  LOOP
    UPDATE public.ingredients
    SET current_stock = current_stock - (v_recipe.quantity * p_quantity)
    WHERE id = v_recipe.ingredient_id;

    INSERT INTO public.stock_movements (ingredient_id, type, quantity, reason)
    VALUES (v_recipe.ingredient_id, 'exit', v_recipe.quantity * p_quantity, 'Venda');
  END LOOP;

  RETURN json_build_object('success', true, 'sale_id', v_sale_id, 'total_cost', v_total_cost);
END;
$function$;

CREATE OR REPLACE FUNCTION public.close_order(p_order_id uuid, p_bartender_name text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item RECORD;
  v_recipe RECORD;
  v_total_cost NUMERIC := 0;
  v_table_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  FOR v_item IN 
    SELECT oi.id, oi.drink_id, oi.quantity, oi.unit_cost
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id AND oi.status != 'delivered'
  LOOP
    FOR v_recipe IN 
      SELECT r.ingredient_id, r.quantity
      FROM public.recipes r
      WHERE r.drink_id = v_item.drink_id
    LOOP
      UPDATE public.ingredients
      SET current_stock = current_stock - (v_recipe.quantity * v_item.quantity)
      WHERE id = v_recipe.ingredient_id;

      INSERT INTO public.stock_movements (ingredient_id, type, quantity, reason)
      VALUES (v_recipe.ingredient_id, 'exit', v_recipe.quantity * v_item.quantity, 'Comanda');
    END LOOP;

    UPDATE public.order_items SET status = 'delivered' WHERE id = v_item.id;
    v_total_cost := v_total_cost + (v_item.unit_cost * v_item.quantity);
  END LOOP;

  UPDATE public.orders
  SET status = 'closed', total_cost = v_total_cost, bartender_name = p_bartender_name, closed_at = now()
  WHERE id = p_order_id
  RETURNING table_id INTO v_table_id;

  UPDATE public.tables SET status = 'available' WHERE id = v_table_id;

  INSERT INTO public.sales (drink_id, bartender_name, quantity, total_cost)
  SELECT oi.drink_id, p_bartender_name, SUM(oi.quantity), SUM(oi.unit_cost * oi.quantity)
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id
  GROUP BY oi.drink_id;

  RETURN json_build_object('success', true, 'order_id', p_order_id, 'total_cost', v_total_cost);
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_item_to_order(p_order_id uuid, p_drink_id uuid, p_quantity integer DEFAULT 1)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_recipe RECORD;
  v_insufficient_stock TEXT := '';
  v_unit_cost NUMERIC := 0;
  v_item_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 100 THEN
    RETURN json_build_object('success', false, 'error', 'Quantidade inválida');
  END IF;

  FOR v_recipe IN 
    SELECT r.ingredient_id, r.quantity, i.name, i.current_stock, i.cost_per_unit
    FROM public.recipes r
    JOIN public.ingredients i ON r.ingredient_id = i.id
    WHERE r.drink_id = p_drink_id
  LOOP
    IF v_recipe.current_stock < (v_recipe.quantity * p_quantity) THEN
      v_insufficient_stock := v_insufficient_stock || v_recipe.name || ', ';
    END IF;
    v_unit_cost := v_unit_cost + (v_recipe.quantity * v_recipe.cost_per_unit);
  END LOOP;

  IF v_insufficient_stock != '' THEN
    RETURN json_build_object('success', false, 'error', 'Estoque insuficiente: ' || TRIM(TRAILING ', ' FROM v_insufficient_stock));
  END IF;

  INSERT INTO public.order_items (order_id, drink_id, quantity, unit_cost)
  VALUES (p_order_id, p_drink_id, p_quantity, v_unit_cost)
  RETURNING id INTO v_item_id;

  RETURN json_build_object('success', true, 'item_id', v_item_id, 'unit_cost', v_unit_cost);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_ingredient_stock(p_ingredient_id uuid, p_quantity numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.ingredients
  SET current_stock = current_stock + p_quantity
  WHERE id = p_ingredient_id;
END;
$function$;

-- Lock down EXECUTE on SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_any_role(uuid, app_role[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_manager_or_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_bartender_pin(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_sale(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.close_order(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_item_to_order(uuid, uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_ingredient_stock(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_order(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_item_to_order(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_ingredient_stock(uuid, numeric) TO authenticated;
