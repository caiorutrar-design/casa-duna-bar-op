-- Add item_number to drinks table
ALTER TABLE public.drinks ADD COLUMN item_number INTEGER UNIQUE;

-- Create tables table for restaurant tables
CREATE TABLE public.tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_number INTEGER NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table (comandas)
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES public.tables(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  total_cost NUMERIC DEFAULT 0,
  bartender_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  drink_id UUID NOT NULL REFERENCES public.drinks(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivered')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access on tables" ON public.tables FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on tables" ON public.tables FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on tables" ON public.tables FOR UPDATE USING (true);

CREATE POLICY "Allow public read access on orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on orders" ON public.orders FOR UPDATE USING (true);

CREATE POLICY "Allow public read access on order_items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on order_items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on order_items" ON public.order_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on order_items" ON public.order_items FOR DELETE USING (true);

-- Add trigger for orders updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to add item to order
CREATE OR REPLACE FUNCTION public.add_item_to_order(
  p_order_id UUID,
  p_drink_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  v_recipe RECORD;
  v_insufficient_stock TEXT := '';
  v_unit_cost NUMERIC := 0;
  v_item_id UUID;
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
    v_unit_cost := v_unit_cost + (v_recipe.quantity * v_recipe.cost_per_unit);
  END LOOP;

  -- If any ingredient is insufficient, return error
  IF v_insufficient_stock != '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Estoque insuficiente: ' || TRIM(TRAILING ', ' FROM v_insufficient_stock)
    );
  END IF;

  -- Create order item
  INSERT INTO public.order_items (order_id, drink_id, quantity, unit_cost)
  VALUES (p_order_id, p_drink_id, p_quantity, v_unit_cost)
  RETURNING id INTO v_item_id;

  RETURN json_build_object(
    'success', true,
    'item_id', v_item_id,
    'unit_cost', v_unit_cost
  );
END;
$$;

-- Create function to close order and process stock
CREATE OR REPLACE FUNCTION public.close_order(p_order_id UUID, p_bartender_name TEXT)
RETURNS JSON
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  v_item RECORD;
  v_recipe RECORD;
  v_total_cost NUMERIC := 0;
  v_table_id UUID;
BEGIN
  -- Get all items in order
  FOR v_item IN 
    SELECT oi.id, oi.drink_id, oi.quantity, oi.unit_cost
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id AND oi.status != 'delivered'
  LOOP
    -- Update stock for each ingredient
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

    -- Mark item as delivered
    UPDATE public.order_items SET status = 'delivered' WHERE id = v_item.id;
    
    v_total_cost := v_total_cost + (v_item.unit_cost * v_item.quantity);
  END LOOP;

  -- Close order
  UPDATE public.orders
  SET status = 'closed',
      total_cost = v_total_cost,
      bartender_name = p_bartender_name,
      closed_at = now()
  WHERE id = p_order_id
  RETURNING table_id INTO v_table_id;

  -- Free up table
  UPDATE public.tables
  SET status = 'available'
  WHERE id = v_table_id;

  -- Create sale record for reporting
  INSERT INTO public.sales (drink_id, bartender_name, quantity, total_cost)
  SELECT oi.drink_id, p_bartender_name, SUM(oi.quantity), SUM(oi.unit_cost * oi.quantity)
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id
  GROUP BY oi.drink_id;

  RETURN json_build_object(
    'success', true,
    'order_id', p_order_id,
    'total_cost', v_total_cost
  );
END;
$$;