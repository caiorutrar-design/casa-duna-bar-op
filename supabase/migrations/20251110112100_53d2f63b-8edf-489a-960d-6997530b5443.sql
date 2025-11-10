-- Fix search_path for all functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_ingredient_stock(
  p_ingredient_id UUID,
  p_quantity DECIMAL(10, 2)
)
RETURNS void AS $$
BEGIN
  UPDATE public.ingredients
  SET current_stock = current_stock + p_quantity
  WHERE id = p_ingredient_id;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION public.process_sale(
  p_drink_id UUID,
  p_bartender_name TEXT,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  v_recipe RECORD;
  v_total_cost DECIMAL(10, 2) := 0;
  v_sale_id UUID;
  v_insufficient_stock TEXT := '';
BEGIN
  -- Check if all ingredients are available
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

  -- If any ingredient is insufficient, return error
  IF v_insufficient_stock != '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Estoque insuficiente: ' || TRIM(TRAILING ', ' FROM v_insufficient_stock)
    );
  END IF;

  -- Create sale record
  INSERT INTO public.sales (drink_id, bartender_name, quantity, total_cost)
  VALUES (p_drink_id, p_bartender_name, p_quantity, v_total_cost)
  RETURNING id INTO v_sale_id;

  -- Update stock and create movements
  FOR v_recipe IN 
    SELECT r.ingredient_id, r.quantity
    FROM public.recipes r
    WHERE r.drink_id = p_drink_id
  LOOP
    -- Update ingredient stock
    UPDATE public.ingredients
    SET current_stock = current_stock - (v_recipe.quantity * p_quantity)
    WHERE id = v_recipe.ingredient_id;

    -- Create stock movement record
    INSERT INTO public.stock_movements (ingredient_id, type, quantity, reason)
    VALUES (v_recipe.ingredient_id, 'exit', v_recipe.quantity * p_quantity, 'Venda - Sale ID: ' || v_sale_id);
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'sale_id', v_sale_id,
    'total_cost', v_total_cost
  );
END;
$$ LANGUAGE plpgsql
SET search_path = public;