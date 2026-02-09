
-- Fix 1: Restrict bartenders table (legacy/unused) to managers only
DROP POLICY IF EXISTS "Authenticated can read bartenders" ON public.bartenders;
DROP POLICY IF EXISTS "Authenticated can insert bartenders" ON public.bartenders;
DROP POLICY IF EXISTS "Authenticated can update bartenders" ON public.bartenders;

CREATE POLICY "Managers can read bartenders" ON public.bartenders
  FOR SELECT TO authenticated
  USING (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can manage bartenders" ON public.bartenders
  FOR ALL TO authenticated
  USING (public.is_manager_or_admin(auth.uid()))
  WITH CHECK (public.is_manager_or_admin(auth.uid()));

-- Fix 2: Restrict ingredients SELECT to managers only
-- Bartenders access ingredients through SECURITY DEFINER RPCs (add_item_to_order, process_sale, update_ingredient_stock)
-- so they don't need direct SELECT access
DROP POLICY IF EXISTS "Authenticated can read ingredients" ON public.ingredients;

CREATE POLICY "Managers can read ingredients" ON public.ingredients
  FOR SELECT TO authenticated
  USING (public.is_manager_or_admin(auth.uid()));
