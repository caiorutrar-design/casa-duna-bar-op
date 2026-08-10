ALTER TABLE public.drinks ADD COLUMN IF NOT EXISTS price NUMERIC NOT NULL DEFAULT 0;

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
  v_has_recipe BOOLEAN := false;
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
    v_has_recipe := true;
    IF v_recipe.current_stock < (v_recipe.quantity * p_quantity) THEN
      v_insufficient_stock := v_insufficient_stock || v_recipe.name || ', ';
    END IF;
    v_unit_cost := v_unit_cost + (v_recipe.quantity * v_recipe.cost_per_unit);
  END LOOP;

  IF v_insufficient_stock != '' THEN
    RETURN json_build_object('success', false, 'error', 'Estoque insuficiente: ' || TRIM(TRAILING ', ' FROM v_insufficient_stock));
  END IF;

  IF NOT v_has_recipe THEN
    SELECT COALESCE(price, 0) INTO v_unit_cost FROM public.drinks WHERE id = p_drink_id;
  END IF;

  INSERT INTO public.order_items (order_id, drink_id, quantity, unit_cost)
  VALUES (p_order_id, p_drink_id, p_quantity, v_unit_cost)
  RETURNING id INTO v_item_id;

  RETURN json_build_object('success', true, 'item_id', v_item_id, 'unit_cost', v_unit_cost);
END;
$function$;

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
  v_has_recipe BOOLEAN := false;
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
    v_has_recipe := true;
    IF v_recipe.current_stock < (v_recipe.quantity * p_quantity) THEN
      v_insufficient_stock := v_insufficient_stock || v_recipe.name || ', ';
    END IF;
    v_total_cost := v_total_cost + (v_recipe.quantity * v_recipe.cost_per_unit * p_quantity);
  END LOOP;

  IF v_insufficient_stock != '' THEN
    RETURN json_build_object('success', false, 'error', 'Estoque insuficiente: ' || TRIM(TRAILING ', ' FROM v_insufficient_stock));
  END IF;

  IF NOT v_has_recipe THEN
    SELECT COALESCE(price, 0) * p_quantity INTO v_total_cost FROM public.drinks WHERE id = p_drink_id;
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