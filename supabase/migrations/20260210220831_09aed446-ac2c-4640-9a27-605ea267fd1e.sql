
-- Create event type enum
CREATE TYPE public.event_type AS ENUM ('festa', 'show', 'happy_hour', 'corporativo', 'privado', 'outro');

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_type public.event_type NOT NULL DEFAULT 'outro',
  max_capacity INTEGER,
  estimated_budget NUMERIC(12, 2) DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Only managers/admins can CRUD events
CREATE POLICY "Managers can read events" ON public.events
  FOR SELECT TO authenticated
  USING (is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can insert events" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can update events" ON public.events
  FOR UPDATE TO authenticated
  USING (is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can delete events" ON public.events
  FOR DELETE TO authenticated
  USING (is_manager_or_admin(auth.uid()));

-- Auto-update updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
