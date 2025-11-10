-- Create ingredients table
CREATE TABLE public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  unit TEXT NOT NULL CHECK (unit IN ('ml', 'g', 'un')),
  current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
  min_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
  cost_per_unit DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create drinks table
CREATE TABLE public.drinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  description TEXT,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create recipes table (many-to-many between drinks and ingredients)
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drink_id UUID NOT NULL REFERENCES public.drinks(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(drink_id, ingredient_id)
);

-- Create sales table
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drink_id UUID NOT NULL REFERENCES public.drinks(id) ON DELETE CASCADE,
  bartender_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_cost DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create stock_movements table
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('entry', 'exit', 'adjustment')),
  quantity DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create bartenders table for PIN authentication
CREATE TABLE public.bartenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  pin TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bartenders ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for now, can be refined later)
CREATE POLICY "Allow public read access on ingredients" ON public.ingredients FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on ingredients" ON public.ingredients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on ingredients" ON public.ingredients FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on ingredients" ON public.ingredients FOR DELETE USING (true);

CREATE POLICY "Allow public read access on drinks" ON public.drinks FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on drinks" ON public.drinks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on drinks" ON public.drinks FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on drinks" ON public.drinks FOR DELETE USING (true);

CREATE POLICY "Allow public read access on recipes" ON public.recipes FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on recipes" ON public.recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on recipes" ON public.recipes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on recipes" ON public.recipes FOR DELETE USING (true);

CREATE POLICY "Allow public read access on sales" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on sales" ON public.sales FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on stock_movements" ON public.stock_movements FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on stock_movements" ON public.stock_movements FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on bartenders" ON public.bartenders FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on bartenders" ON public.bartenders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on bartenders" ON public.bartenders FOR UPDATE USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON public.ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drinks_updated_at BEFORE UPDATE ON public.drinks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to process sale and update stock
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
$$ LANGUAGE plpgsql;