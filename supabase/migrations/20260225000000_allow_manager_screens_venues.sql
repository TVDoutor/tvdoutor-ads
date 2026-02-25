-- Permite que usuários com role "manager" possam cadastrar e editar telas (screens) e venues
-- Date: 2026-02-25

-- 1. Garantir que is_manager existe
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
$$;

-- 2. Atualizar delete_screen_as_admin para permitir manager
CREATE OR REPLACE FUNCTION public.delete_screen_as_admin(screen_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT (public.is_admin() OR public.is_manager()) THEN
        RAISE EXCEPTION 'Apenas administradores e gerentes podem deletar telas';
    END IF;
    DELETE FROM public.screens WHERE id = screen_id;
    RETURN FOUND;
END;
$$;

-- 3. Screens: permitir admin OU manager modificar
DROP POLICY IF EXISTS "Only admins can modify screens" ON public.screens;
CREATE POLICY "Admins and managers can modify screens"
    ON public.screens
    FOR ALL
    TO authenticated
    USING (public.is_admin() OR public.is_manager())
    WITH CHECK (public.is_admin() OR public.is_manager());

-- Venues: permitir admin OU manager modificar
DROP POLICY IF EXISTS "Only admins can modify venues" ON public.venues;
CREATE POLICY "Admins and managers can modify venues"
    ON public.venues
    FOR ALL
    TO authenticated
    USING (public.is_admin() OR public.is_manager())
    WITH CHECK (public.is_admin() OR public.is_manager());
