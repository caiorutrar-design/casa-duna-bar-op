ALTER TABLE public.drinks ADD COLUMN IF NOT EXISTS station text NOT NULL DEFAULT 'cozinha';
ALTER TABLE public.drinks DROP CONSTRAINT IF EXISTS drinks_station_check;
ALTER TABLE public.drinks ADD CONSTRAINT drinks_station_check CHECK (station IN ('cozinha','bar'));

ALTER TABLE public.order_items ALTER COLUMN status SET DEFAULT 'draft';

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

  INSERT INTO public.order_items (order_id, drink_id, quantity, unit_cost, status)
  VALUES (p_order_id, p_drink_id, p_quantity, v_unit_cost, 'draft')
  RETURNING id INTO v_item_id;

  RETURN json_build_object('success', true, 'item_id', v_item_id, 'unit_cost', v_unit_cost);
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_order_to_stations(p_order_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE public.order_items
  SET status = 'pending'
  WHERE order_id = p_order_id AND status = 'draft';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN json_build_object('success', true, 'sent', v_count);
END;
$function$;

REVOKE ALL ON FUNCTION public.send_order_to_stations(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_order_to_stations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_order_to_stations(uuid) TO service_role;