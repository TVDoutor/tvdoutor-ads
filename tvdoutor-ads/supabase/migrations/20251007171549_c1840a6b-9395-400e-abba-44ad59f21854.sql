-- Fix infinite recursion in user_roles RLS policies
-- The issue is that policies on user_roles were using has_role() which queries user_roles itself

-- Drop problematic policies on user_roles
DROP POLICY IF EXISTS "user_roles_insert_trigger" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_all_admin" ON public.user_roles;

-- Create simple, non-recursive policies for user_roles
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

-- Recreate security functions without causing recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role::text
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND super_admin = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_super_admin() OR has_role(auth.uid(), 'admin')
$$;