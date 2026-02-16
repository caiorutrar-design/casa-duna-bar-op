
-- Adicionar novos roles ao enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'garcom';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'barman';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'usuario';
