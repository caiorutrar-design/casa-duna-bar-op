ALTER TABLE public.events
  ADD COLUMN estimated_attendance integer DEFAULT 0,
  ADD COLUMN average_ticket_price numeric DEFAULT 0,
  ADD COLUMN average_bar_spend_per_person numeric DEFAULT 0,
  ADD COLUMN estimated_sponsor_revenue numeric DEFAULT 0,
  ADD COLUMN estimated_vip_revenue numeric DEFAULT 0,
  ADD COLUMN estimated_other_revenue numeric DEFAULT 0;

CREATE TABLE public.event_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  category text DEFAULT 'geral',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized can read event_expenses" ON public.event_expenses
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['manager','admin','usuario']::app_role[]));

CREATE POLICY "Authorized can insert event_expenses" ON public.event_expenses
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['manager','admin','usuario']::app_role[]));

CREATE POLICY "Authorized can update event_expenses" ON public.event_expenses
  FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['manager','admin','usuario']::app_role[]));

CREATE POLICY "Authorized can delete event_expenses" ON public.event_expenses
  FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['manager','admin','usuario']::app_role[]));