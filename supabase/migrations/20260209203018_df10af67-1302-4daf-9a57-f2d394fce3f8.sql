
-- Revert ingredients SELECT to allow all authenticated users
-- Column-level restriction isn't possible via RLS; the UI already hides cost_per_unit from non-managers
-- Bartenders need ingredient access for Entry.tsx (stock entry) and the RPCs
DROP POLICY IF EXISTS "Managers can read ingredients" ON public.ingredients;

CREATE POLICY "Authenticated can read ingredients" ON public.ingredients
  FOR SELECT TO authenticated
  USING (true);
