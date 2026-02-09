
-- Fix 1: Drop plain text pin column from bartenders
ALTER TABLE public.bartenders DROP COLUMN IF EXISTS pin;

-- Ensure pin_hash is NOT NULL
-- First set a default for any nulls
UPDATE public.bartenders SET pin_hash = crypt('0000', gen_salt('bf')) WHERE pin_hash IS NULL;
ALTER TABLE public.bartenders ALTER COLUMN pin_hash SET NOT NULL;

-- Fix 2: Restrict anonymous access to orders and order_items
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can read orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can read order_items" ON public.order_items;

-- Only authenticated users can read orders and order_items directly
CREATE POLICY "Authenticated can read orders" ON public.orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read order_items" ON public.order_items
  FOR SELECT TO authenticated USING (true);

-- Restrict drinks: anonymous only sees active drinks
DROP POLICY IF EXISTS "Anyone can read drinks" ON public.drinks;
CREATE POLICY "Anyone can read active drinks" ON public.drinks
  FOR SELECT TO anon USING (active = true);
CREATE POLICY "Authenticated can read all drinks" ON public.drinks
  FOR SELECT TO authenticated USING (true);
