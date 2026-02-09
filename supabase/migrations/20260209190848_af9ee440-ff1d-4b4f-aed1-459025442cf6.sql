
-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========================================
-- CREATE PROFILES TABLE
-- ========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  bartender_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, bartender_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'bartender_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- HASH BARTENDER PINS
-- ========================================
ALTER TABLE public.bartenders ADD COLUMN IF NOT EXISTS pin_hash TEXT;
UPDATE public.bartenders SET pin_hash = crypt(pin, gen_salt('bf')) WHERE pin_hash IS NULL;

-- Create verify function (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.verify_bartender_pin(p_name TEXT, p_pin TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bartender RECORD;
BEGIN
  SELECT id, name, pin_hash
  FROM public.bartenders
  WHERE name = p_name AND active = true
  INTO v_bartender;

  IF v_bartender IS NULL THEN
    RETURN json_build_object('success', false);
  END IF;

  IF v_bartender.pin_hash = crypt(p_pin, v_bartender.pin_hash) THEN
    RETURN json_build_object('success', true, 'id', v_bartender.id, 'name', v_bartender.name);
  END IF;

  RETURN json_build_object('success', false);
END;
$$;

-- ========================================
-- DROP ALL EXISTING PERMISSIVE POLICIES
-- ========================================

-- bartenders
DROP POLICY IF EXISTS "Allow public insert access on bartenders" ON public.bartenders;
DROP POLICY IF EXISTS "Allow public read access on bartenders" ON public.bartenders;
DROP POLICY IF EXISTS "Allow public update access on bartenders" ON public.bartenders;

-- sales
DROP POLICY IF EXISTS "Allow public insert access on sales" ON public.sales;
DROP POLICY IF EXISTS "Allow public read access on sales" ON public.sales;

-- cash_closures
DROP POLICY IF EXISTS "Allow public insert access on cash_closures" ON public.cash_closures;
DROP POLICY IF EXISTS "Allow public read access on cash_closures" ON public.cash_closures;
DROP POLICY IF EXISTS "Allow public update access on cash_closures" ON public.cash_closures;

-- ingredients
DROP POLICY IF EXISTS "Allow public delete access on ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Allow public insert access on ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Allow public read access on ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Allow public update access on ingredients" ON public.ingredients;

-- stock_movements
DROP POLICY IF EXISTS "Allow public insert access on stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Allow public read access on stock_movements" ON public.stock_movements;

-- recipes
DROP POLICY IF EXISTS "Allow public delete access on recipes" ON public.recipes;
DROP POLICY IF EXISTS "Allow public insert access on recipes" ON public.recipes;
DROP POLICY IF EXISTS "Allow public read access on recipes" ON public.recipes;
DROP POLICY IF EXISTS "Allow public update access on recipes" ON public.recipes;

-- tables
DROP POLICY IF EXISTS "Allow public insert access on tables" ON public.tables;
DROP POLICY IF EXISTS "Allow public read access on tables" ON public.tables;
DROP POLICY IF EXISTS "Allow public update access on tables" ON public.tables;

-- drinks
DROP POLICY IF EXISTS "Allow public delete access on drinks" ON public.drinks;
DROP POLICY IF EXISTS "Allow public insert access on drinks" ON public.drinks;
DROP POLICY IF EXISTS "Allow public read access on drinks" ON public.drinks;
DROP POLICY IF EXISTS "Allow public update access on drinks" ON public.drinks;

-- orders
DROP POLICY IF EXISTS "Allow public insert access on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public read access on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public update access on orders" ON public.orders;

-- order_items
DROP POLICY IF EXISTS "Allow public delete access on order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow public insert access on order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow public read access on order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow public update access on order_items" ON public.order_items;

-- ========================================
-- CREATE NEW AUTH-BASED POLICIES
-- ========================================

-- bartenders (authenticated only - hides PINs from public)
CREATE POLICY "Authenticated can read bartenders" ON public.bartenders
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert bartenders" ON public.bartenders
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update bartenders" ON public.bartenders
  FOR UPDATE TO authenticated USING (true);

-- sales (authenticated only - financial data)
CREATE POLICY "Authenticated can read sales" ON public.sales
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sales" ON public.sales
  FOR INSERT TO authenticated WITH CHECK (true);

-- cash_closures (authenticated only - financial data)
CREATE POLICY "Authenticated can read cash_closures" ON public.cash_closures
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert cash_closures" ON public.cash_closures
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update cash_closures" ON public.cash_closures
  FOR UPDATE TO authenticated USING (true);

-- ingredients (authenticated only - cost data)
CREATE POLICY "Authenticated can read ingredients" ON public.ingredients
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert ingredients" ON public.ingredients
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update ingredients" ON public.ingredients
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete ingredients" ON public.ingredients
  FOR DELETE TO authenticated USING (true);

-- stock_movements (authenticated only)
CREATE POLICY "Authenticated can read stock_movements" ON public.stock_movements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert stock_movements" ON public.stock_movements
  FOR INSERT TO authenticated WITH CHECK (true);

-- recipes (authenticated only - proprietary data)
CREATE POLICY "Authenticated can read recipes" ON public.recipes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert recipes" ON public.recipes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update recipes" ON public.recipes
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete recipes" ON public.recipes
  FOR DELETE TO authenticated USING (true);

-- tables (public read for customer QR code page, write requires auth)
CREATE POLICY "Anyone can read tables" ON public.tables
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated can insert tables" ON public.tables
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update tables" ON public.tables
  FOR UPDATE TO authenticated USING (true);

-- drinks (public read for customer page, write requires auth)
CREATE POLICY "Anyone can read drinks" ON public.drinks
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated can insert drinks" ON public.drinks
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update drinks" ON public.drinks
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete drinks" ON public.drinks
  FOR DELETE TO authenticated USING (true);

-- orders (public read for customer page, write requires auth)
CREATE POLICY "Anyone can read orders" ON public.orders
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated can insert orders" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update orders" ON public.orders
  FOR UPDATE TO authenticated USING (true);

-- order_items (public read for customer page, write requires auth)
CREATE POLICY "Anyone can read order_items" ON public.order_items
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated can insert order_items" ON public.order_items
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update order_items" ON public.order_items
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete order_items" ON public.order_items
  FOR DELETE TO authenticated USING (true);

-- ========================================
-- UPDATE RPC FUNCTIONS WITH AUTH CHECKS
-- ========================================

CREATE OR REPLACE FUNCTION public.process_sale(p_drink_id uuid, p_bartender_name text, p_quantity integer DEFAULT 1)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
DECLARE
  v_recipe RECORD;
  v_total_cost DECIMAL(10, 2) := 0;
  v_sale_id UUID;
  v_insufficient_stock TEXT := '';
BEGIN
  IF auth.role() != 'authenticated' THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
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
    VALUES (v_recipe.ingredient_id, 'exit', v_recipe.quantity * p_quantity, 'Venda - Sale ID: ' || v_sale_id);
  END LOOP;

  RETURN json_build_object('success', true, 'sale_id', v_sale_id, 'total_cost', v_total_cost);
END;
$$;

CREATE OR REPLACE FUNCTION public.close_order(p_order_id uuid, p_bartender_name text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_recipe RECORD;
  v_total_cost NUMERIC := 0;
  v_table_id UUID;
BEGIN
  IF auth.role() != 'authenticated' THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
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
      VALUES (v_recipe.ingredient_id, 'exit', v_recipe.quantity * v_item.quantity, 'Order ID: ' || p_order_id);
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
$$;

CREATE OR REPLACE FUNCTION public.add_item_to_order(p_order_id uuid, p_drink_id uuid, p_quantity integer DEFAULT 1)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
DECLARE
  v_recipe RECORD;
  v_insufficient_stock TEXT := '';
  v_unit_cost NUMERIC := 0;
  v_item_id UUID;
BEGIN
  IF auth.role() != 'authenticated' THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
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
$$;

CREATE OR REPLACE FUNCTION public.update_ingredient_stock(p_ingredient_id uuid, p_quantity numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
BEGIN
  IF auth.role() != 'authenticated' THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.ingredients
  SET current_stock = current_stock + p_quantity
  WHERE id = p_ingredient_id;
END;
$$;
