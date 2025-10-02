-- Simple fix for profiles table issues
-- This migration only addresses the profiles table without touching user_roles

-- 1. Ensure profiles table has all required columns
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        -- Add email column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email' AND table_schema = 'public') THEN
            ALTER TABLE public.profiles ADD COLUMN email text;
        END IF;
        
        -- Add full_name column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name' AND table_schema = 'public') THEN
            ALTER TABLE public.profiles ADD COLUMN full_name text;
        END IF;
        
        -- Add super_admin column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'super_admin' AND table_schema = 'public') THEN
            ALTER TABLE public.profiles ADD COLUMN super_admin BOOLEAN DEFAULT false;
        END IF;
    END IF;
END $$;

-- 2. Fix RLS policies for profiles table
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "System functions can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- Create comprehensive policies for profiles
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "profiles_delete_policy" ON public.profiles
    FOR DELETE
    TO authenticated
    USING (true);

-- 3. Update the handle_new_user trigger to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert profile with comprehensive error handling
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        display_name,
        avatar_url,
        role,
        super_admin
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Usuário'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Usuário'),
        NEW.raw_user_meta_data->>'avatar_url',
        'user',
        false
    )
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, profiles.email),
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        updated_at = now();

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the user creation
        RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- 6. Create a function to ensure all existing users have profiles
CREATE OR REPLACE FUNCTION public.ensure_all_users_have_profiles()
RETURNS void AS $$
BEGIN
    -- Insert profiles for users that don't have them
    INSERT INTO public.profiles (id, email, full_name, display_name, role, super_admin)
    SELECT 
        u.id,
        u.email,
        COALESCE(u.raw_user_meta_data->>'full_name', u.email, 'Usuário'),
        COALESCE(u.raw_user_meta_data->>'full_name', u.email, 'Usuário'),
        'user',
        false
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL
    ON CONFLICT (id) DO NOTHING;

    -- Special case: ensure hildebrando is admin
    UPDATE public.profiles 
    SET role = 'admin', super_admin = true
    WHERE email = 'hildebrando.cardoso@tvdoutor.com.br';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Run the function to ensure all users have profiles
SELECT public.ensure_all_users_have_profiles();

-- 8. Add helpful comments
COMMENT ON FUNCTION public.ensure_all_users_have_profiles() IS 'Ensures all auth.users have corresponding profiles entries';
