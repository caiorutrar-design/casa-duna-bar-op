
CREATE TABLE public.event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  ticket_price numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized can read event_attendees" ON public.event_attendees
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['manager','admin','usuario']::app_role[]));

CREATE POLICY "Authorized can insert event_attendees" ON public.event_attendees
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['manager','admin','usuario']::app_role[]));

CREATE POLICY "Authorized can update event_attendees" ON public.event_attendees
  FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['manager','admin','usuario']::app_role[]));

CREATE POLICY "Authorized can delete event_attendees" ON public.event_attendees
  FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['manager','admin','usuario']::app_role[]));
