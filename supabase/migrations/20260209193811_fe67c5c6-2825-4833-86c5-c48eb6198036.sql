
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('bartender', 'manager', 'admin');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create helper functions BEFORE policies that reference them
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('manager', 'admin')
  )
$$;

-- 4. RLS on user_roles
CREATE POLICY "Users can read own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Assign admin to all existing users
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role FROM auth.users u
ON CONFLICT DO NOTHING;

-- 6. Restrict ingredient writes to managers
DROP POLICY IF EXISTS "Authenticated can insert ingredients" ON public.ingredients;
CREATE POLICY "Managers can insert ingredients"
ON public.ingredients FOR INSERT TO authenticated
WITH CHECK (public.is_manager_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can update ingredients" ON public.ingredients;
CREATE POLICY "Managers can update ingredients"
ON public.ingredients FOR UPDATE TO authenticated
USING (public.is_manager_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can delete ingredients" ON public.ingredients;
CREATE POLICY "Managers can delete ingredients"
ON public.ingredients FOR DELETE TO authenticated
USING (public.is_manager_or_admin(auth.uid()));

-- 7. Restrict recipes to managers
DROP POLICY IF EXISTS "Authenticated can read recipes" ON public.recipes;
CREATE POLICY "Managers can read recipes"
ON public.recipes FOR SELECT TO authenticated
USING (public.is_manager_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can insert recipes" ON public.recipes;
CREATE POLICY "Managers can insert recipes"
ON public.recipes FOR INSERT TO authenticated
WITH CHECK (public.is_manager_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can update recipes" ON public.recipes;
CREATE POLICY "Managers can update recipes"
ON public.recipes FOR UPDATE TO authenticated
USING (public.is_manager_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can delete recipes" ON public.recipes;
CREATE POLICY "Managers can delete recipes"
ON public.recipes FOR DELETE TO authenticated
USING (public.is_manager_or_admin(auth.uid()));

-- 8. Restrict cash_closures reads to managers
DROP POLICY IF EXISTS "Authenticated can read cash_closures" ON public.cash_closures;
CREATE POLICY "Managers can read cash_closures"
ON public.cash_closures FOR SELECT TO authenticated
USING (public.is_manager_or_admin(auth.uid()));

-- 9. Restrict sales reads to managers
DROP POLICY IF EXISTS "Authenticated can read sales" ON public.sales;
CREATE POLICY "Managers can read sales"
ON public.sales FOR SELECT TO authenticated
USING (public.is_manager_or_admin(auth.uid()));
