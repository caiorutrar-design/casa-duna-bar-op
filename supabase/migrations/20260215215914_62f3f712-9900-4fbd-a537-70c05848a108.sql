
-- Restrict INSERT to managers only
DROP POLICY "Authenticated can insert cash_closures" ON public.cash_closures;
CREATE POLICY "Managers can insert cash_closures"
  ON public.cash_closures FOR INSERT TO authenticated
  WITH CHECK (public.is_manager_or_admin(auth.uid()));

-- Restrict UPDATE to managers only
DROP POLICY "Authenticated can update cash_closures" ON public.cash_closures;
CREATE POLICY "Managers can update cash_closures"
  ON public.cash_closures FOR UPDATE TO authenticated
  USING (public.is_manager_or_admin(auth.uid()));
