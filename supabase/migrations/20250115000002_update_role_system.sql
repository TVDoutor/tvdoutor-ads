-- Update role system to match database role table
-- This migration updates the system to use the correct roles: admin, client, manager, user

-- 1. Update app_role enum to include all roles from the role table
DO $$
BEGIN
    -- Drop existing enum if it exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        -- First, drop all dependencies
        DROP TYPE public.app_role CASCADE;
    END IF;
    
    -- Create new enum with all roles
    CREATE TYPE public.app_role AS ENUM ('admin', 'client', 'manager', 'user');
END $$;

-- 2. Update user_roles table to use the new enum
ALTER TABLE public.user_roles 
ALTER COLUMN role TYPE public.app_role 
USING role::text::public.app_role;

-- 3. Update existing roles to match the new system
UPDATE public.user_roles 
SET role = 'admin'::app_role 
WHERE role::text IN ('super_admin', 'admin');

UPDATE public.user_roles 
SET role = 'manager'::app_role 
WHERE role::text = 'manager';

UPDATE public.user_roles 
SET role = 'user'::app_role 
WHERE role::text = 'user';

-- 4. Update profiles table to use the new role system
UPDATE public.profiles 
SET role = 'admin' 
WHERE role IN ('super_admin', 'admin') OR super_admin = true;

UPDATE public.profiles 
SET role = 'manager' 
WHERE role = 'manager';

UPDATE public.profiles 
SET role = 'user' 
WHERE role = 'user' OR role IS NULL;

-- 5. Update security functions to use the new role system
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
      AND role = _role::app_role
  )
$$;

-- Update is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (super_admin = true OR role = 'admin')
  )
$$;

-- Update is_super_admin function (now just checks for admin)
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
    AND (super_admin = true OR role = 'admin')
  )
$$;

-- 6. Update RLS policies to use the new role system
DROP POLICY IF EXISTS "user_roles_all_superadmin" ON public.user_roles;
CREATE POLICY "user_roles_all_admin"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.super_admin = true OR profiles.role = 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.super_admin = true OR profiles.role = 'admin')
  )
);

-- 7. Update handle_new_user trigger to use the new role system
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, display_name, avatar_url, role, super_admin)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    'user', -- Default role is user
    false   -- Default super_admin is false
  );
  
  -- Insert default role in user_roles table
  INSERT INTO public.user_roles (user_id, role, created_at)
  VALUES (NEW.id, 'user'::app_role, now());
  
  RETURN NEW;
END;
$$;

-- 8. Add comments to document the role system
COMMENT ON TYPE public.app_role IS 'Application roles: admin (full access), manager (create/read/edit), client (view assigned), user (standard access)';
COMMENT ON COLUMN public.profiles.role IS 'User role: admin, manager, client, or user';
COMMENT ON COLUMN public.user_roles.role IS 'User role from app_role enum';
