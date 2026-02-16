
-- Adicionar event_id à tabela sales para rastreio de consumo por evento
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

-- Função helper para verificar múltiplos roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- Sales: garcom + manager + admin podem ler
DROP POLICY IF EXISTS "Managers can read sales" ON public.sales;
CREATE POLICY "Authorized can read sales"
ON public.sales FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['manager', 'admin', 'garcom']::app_role[]));

-- Cash Closures: garcom + manager + admin
DROP POLICY IF EXISTS "Managers can read cash_closures" ON public.cash_closures;
CREATE POLICY "Authorized can read cash_closures"
ON public.cash_closures FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['manager', 'admin', 'garcom']::app_role[]));

DROP POLICY IF EXISTS "Managers can insert cash_closures" ON public.cash_closures;
CREATE POLICY "Authorized can insert cash_closures"
ON public.cash_closures FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['manager', 'admin', 'garcom']::app_role[]));

DROP POLICY IF EXISTS "Managers can update cash_closures" ON public.cash_closures;
CREATE POLICY "Authorized can update cash_closures"
ON public.cash_closures FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['manager', 'admin', 'garcom']::app_role[]));

-- Events: usuario + manager + admin
DROP POLICY IF EXISTS "Managers can read events" ON public.events;
CREATE POLICY "Authorized can read events"
ON public.events FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['manager', 'admin', 'usuario']::app_role[]));

DROP POLICY IF EXISTS "Managers can insert events" ON public.events;
CREATE POLICY "Authorized can insert events"
ON public.events FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['manager', 'admin', 'usuario']::app_role[]));

DROP POLICY IF EXISTS "Managers can update events" ON public.events;
CREATE POLICY "Authorized can update events"
ON public.events FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['manager', 'admin', 'usuario']::app_role[]));

DROP POLICY IF EXISTS "Managers can delete events" ON public.events;
CREATE POLICY "Authorized can delete events"
ON public.events FOR DELETE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['manager', 'admin', 'usuario']::app_role[]));

-- Collaborators: usuario pode ler
DROP POLICY IF EXISTS "Managers can read collaborators" ON public.collaborators;
CREATE POLICY "Authorized can read collaborators"
ON public.collaborators FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['manager', 'admin', 'usuario']::app_role[]));

-- Collaborator categories: usuario pode ler
DROP POLICY IF EXISTS "Managers can read categories" ON public.collaborator_categories;
CREATE POLICY "Authorized can read categories"
ON public.collaborator_categories FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['manager', 'admin', 'usuario']::app_role[]));

-- Collaborator event history: usuario pode ler
DROP POLICY IF EXISTS "Managers can read event history" ON public.collaborator_event_history;
CREATE POLICY "Authorized can read event history"
ON public.collaborator_event_history FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['manager', 'admin', 'usuario']::app_role[]));
