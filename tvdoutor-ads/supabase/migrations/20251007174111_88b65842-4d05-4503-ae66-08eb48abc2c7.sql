-- Fix permission denied error on profiles table during user signup
-- The trigger handle_new_user needs proper permissions to insert into profiles

-- First, ensure the handle_new_user function exists with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, full_name, email, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  
  -- Insert default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Fix RLS policies on profiles table
-- Drop existing problematic policies
DROP POLICY IF EXISTS "profiles_insert_trigger" ON public.profiles;
DROP POLICY IF EXISTS "profiles_all_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Create simpler, more permissive policies
-- Allow INSERT for authenticated users (for trigger execution)
CREATE POLICY "profiles_insert_authenticated"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow SELECT for all authenticated users
CREATE POLICY "profiles_select_all"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Allow UPDATE for own profile or super_admin
CREATE POLICY "profiles_update_own_or_admin"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.super_admin = true
  )
)
WITH CHECK (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.super_admin = true
  )
);

-- Allow DELETE only for super_admin
CREATE POLICY "profiles_delete_superadmin"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.super_admin = true
  )
);