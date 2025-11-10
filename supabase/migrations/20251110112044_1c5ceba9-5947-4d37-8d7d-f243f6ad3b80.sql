-- Create function to update ingredient stock (for entries)
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
$$ LANGUAGE plpgsql;