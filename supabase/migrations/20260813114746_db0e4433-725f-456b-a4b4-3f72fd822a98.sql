DROP POLICY IF EXISTS "Anyone can read active drinks" ON public.drinks;
REVOKE SELECT ON public.drinks FROM anon;

DROP POLICY IF EXISTS "Managers can manage bartenders" ON public.bartenders;

CREATE POLICY "Managers can insert bartenders"
ON public.bartenders FOR INSERT TO authenticated
WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can update bartenders"
ON public.bartenders FOR UPDATE TO authenticated
USING (public.is_manager_or_admin(auth.uid()))
WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can delete bartenders"
ON public.bartenders FOR DELETE TO authenticated
USING (public.is_manager_or_admin(auth.uid()));