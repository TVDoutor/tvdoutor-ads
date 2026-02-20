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

-- 2. Update user_roles table to use the new enum (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_roles') THEN
    ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;
    UPDATE public.user_roles SET role = 'admin'::app_role WHERE role::text IN ('super_admin', 'admin');
    UPDATE public.user_roles SET role = 'manager'::app_role WHERE role::text = 'manager';
    UPDATE public.user_roles SET role = 'user'::app_role WHERE role::text = 'user';
  END IF;
END $$;

-- 4. Update profiles table to use the new role system (se colunas existirem)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='role') THEN
      UPDATE public.profiles SET role = 'admin' WHERE role IN ('super_admin', 'admin');
      UPDATE public.profiles SET role = 'manager' WHERE role = 'manager';
      UPDATE public.profiles SET role = 'user' WHERE role = 'user' OR role IS NULL;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='super_admin') THEN
        UPDATE public.profiles SET role = 'admin' WHERE super_admin = true;
      END IF;
    END IF;
  END IF;
END $$;

-- 5. Update security functions to use the new role system
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

-- Update is_admin function (robusto quando super_admin não existir)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN has_role(auth.uid(), 'admin');
EXCEPTION WHEN OTHERS THEN RETURN false;
END;
$$;

-- Update is_super_admin function (now just checks for admin)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN is_admin();
EXCEPTION WHEN OTHERS THEN RETURN false;
END;
$$;

-- 6. Update RLS policies to use the new role system (user_roles pode não existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_roles') THEN
    DROP POLICY IF EXISTS "user_roles_all_superadmin" ON public.user_roles;
    DROP POLICY IF EXISTS "user_roles_all_admin" ON public.user_roles;
    CREATE POLICY "user_roles_all_admin"
    ON public.user_roles FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());
  END IF;
END $$;

-- 7. Update handle_new_user trigger to use the new role system
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, display_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_roles') THEN
    BEGIN
      INSERT INTO public.user_roles (user_id, role, created_at)
      VALUES (NEW.id, 'user'::app_role, now());
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 8. Add comments to document the role system
COMMENT ON TYPE public.app_role IS 'Application roles: admin (full access), manager (create/read/edit), client (view assigned), user (standard access)';
COMMENT ON COLUMN public.profiles.role IS 'User role: admin, manager, client, or user';
