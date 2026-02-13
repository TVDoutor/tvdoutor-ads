-- Simple fix for user creation issues

-- 1. Ensure profiles table has permissive policies for creation
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "System functions can insert profiles" ON public.profiles;

-- Allow any authenticated user to create profiles (needed for signup)
CREATE POLICY "Allow profile creation for authenticated users" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow system functions to insert profiles
CREATE POLICY "System functions can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (true);

-- 2. Update the handle_new_user trigger to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert profile with error handling
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        display_name,
        avatar_url,
        role
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
        NEW.raw_user_meta_data->>'avatar_url',
        'user'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the user creation
        RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
