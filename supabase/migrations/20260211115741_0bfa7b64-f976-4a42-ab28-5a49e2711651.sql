
-- Categories for collaborators
CREATE TABLE public.collaborator_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collaborator_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can read categories" ON public.collaborator_categories FOR SELECT USING (is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can insert categories" ON public.collaborator_categories FOR INSERT WITH CHECK (is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can update categories" ON public.collaborator_categories FOR UPDATE USING (is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can delete categories" ON public.collaborator_categories FOR DELETE USING (is_manager_or_admin(auth.uid()) AND is_default = false);

-- Insert default categories
INSERT INTO public.collaborator_categories (name, is_default) VALUES
  ('Colaborador da Casa', true),
  ('Barman', true),
  ('Caixa', true),
  ('Runner', true),
  ('Gerente', true),
  ('Segurança', true);

-- Collaborators table
CREATE TABLE public.collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  cpf TEXT,
  email TEXT,
  address TEXT,
  pix_key TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_agency TEXT,
  photo_url TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  category_id UUID REFERENCES public.collaborator_categories(id) ON DELETE SET NULL,
  admission_date DATE,
  base_salary NUMERIC DEFAULT 0,
  contract_type TEXT DEFAULT 'freelancer' CHECK (contract_type IN ('clt', 'pj', 'freelancer')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can read collaborators" ON public.collaborators FOR SELECT USING (is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can insert collaborators" ON public.collaborators FOR INSERT WITH CHECK (is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can update collaborators" ON public.collaborators FOR UPDATE USING (is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can delete collaborators" ON public.collaborators FOR DELETE USING (is_manager_or_admin(auth.uid()));

CREATE TRIGGER update_collaborators_updated_at
  BEFORE UPDATE ON public.collaborators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Event history for collaborators
CREATE TABLE public.collaborator_event_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  hours_worked NUMERIC GENERATED ALWAYS AS (CASE WHEN end_time IS NOT NULL THEN EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0 ELSE NULL END) STORED,
  performance_rating INTEGER CHECK (performance_rating BETWEEN 1 AND 5),
  efficiency_metric NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collaborator_event_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can read event history" ON public.collaborator_event_history FOR SELECT USING (is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can insert event history" ON public.collaborator_event_history FOR INSERT WITH CHECK (is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can update event history" ON public.collaborator_event_history FOR UPDATE USING (is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can delete event history" ON public.collaborator_event_history FOR DELETE USING (is_manager_or_admin(auth.uid()));

-- Payments for collaborators
CREATE TABLE public.collaborator_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'pix' CHECK (payment_method IN ('pix', 'cash', 'transfer', 'other')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collaborator_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can read payments" ON public.collaborator_payments FOR SELECT USING (is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can insert payments" ON public.collaborator_payments FOR INSERT WITH CHECK (is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can update payments" ON public.collaborator_payments FOR UPDATE USING (is_manager_or_admin(auth.uid()));
CREATE POLICY "Managers can delete payments" ON public.collaborator_payments FOR DELETE USING (is_manager_or_admin(auth.uid()));
