-- Fix: Manager não conseguia salvar alterações em venues/screens
-- Causa: is_manager() checava apenas user_roles; alguns Managers têm role apenas em profiles.role
-- Date: 2026-02-25

-- 1. is_manager deve checar user_roles E profiles.role
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'manager')
     OR public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'super_admin')
     OR EXISTS (
       SELECT 1 FROM public.profiles
       WHERE id = auth.uid()
         AND (role IN ('manager', 'admin', 'super_admin') OR super_admin = true)
     )
$$;

-- 2. screen_rates: permitir manager modificar (usado em fluxos de inventário)
DROP POLICY IF EXISTS "Only admins can modify screen_rates" ON public.screen_rates;
DROP POLICY IF EXISTS "Admins and managers can modify screen_rates" ON public.screen_rates;
CREATE POLICY "Admins and managers can modify screen_rates"
    ON public.screen_rates
    FOR ALL
    TO authenticated
    USING (public.is_admin() OR public.is_manager())
    WITH CHECK (public.is_admin() OR public.is_manager());
