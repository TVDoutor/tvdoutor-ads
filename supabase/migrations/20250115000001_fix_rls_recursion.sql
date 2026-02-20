-- Fix infinite recursion in user_roles RLS policies
-- The issue is that is_admin() function calls has_role() which queries user_roles itself
-- (user_roles pode não existir ainda; executar políticas apenas se existir)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_roles') THEN
    DROP POLICY IF EXISTS "user_roles_insert_trigger" ON public.user_roles;
    DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
    DROP POLICY IF EXISTS "user_roles_select_admin" ON public.user_roles;
    DROP POLICY IF EXISTS "user_roles_all_admin" ON public.user_roles;
    DROP POLICY IF EXISTS "user_roles_insert_service" ON public.user_roles;
    DROP POLICY IF EXISTS "user_roles_all_superadmin" ON public.user_roles;
    DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Only super admins can manage roles" ON public.user_roles;
-- Allow service role (trigger) to insert
CREATE POLICY "user_roles_insert_service"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (true); -- Trigger runs as service role, will bypass this anyway

-- Allow users to view their own roles
CREATE POLICY "user_roles_select_own"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow super_admins to manage all roles (check profiles.super_admin directly to avoid recursion)
CREATE POLICY "user_roles_all_superadmin"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.super_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.super_admin = true
  )
);
  END IF;
END $$;

-- Fix security functions to avoid recursion (user_roles pode não existir ainda)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_roles') THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  );
END;
$$;

-- Fix is_super_admin to avoid recursion (super_admin pode não existir em profiles ainda)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='super_admin') THEN
    RETURN false;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND super_admin = true);
END;
$$;

-- Fix is_admin to avoid recursion by checking profiles directly (role/super_admin podem não existir ainda)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fallback para has_role quando user_roles não existir
  RETURN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin');
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;
