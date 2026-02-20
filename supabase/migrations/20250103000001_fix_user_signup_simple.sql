-- Fix user signup issues - Simple version
-- Focus on the main problem: RLS policies preventing profile creation

BEGIN;

-- 0. Garantir que a tabela profiles existe (esta migration pode rodar antes de create_profiles_table)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    display_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. Fix profiles table policies to allow signup
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.profiles;
DROP POLICY IF EXISTS "Allow anon profile creation during signup" ON public.profiles;

-- Create comprehensive policies for profiles
CREATE POLICY "Allow profile creation during signup"
    ON public.profiles
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

CREATE POLICY "Allow profile updates by owner"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow profile viewing"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- 2. Ensure handle_new_user function is robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert profile with error handling
    BEGIN
        INSERT INTO public.profiles (
            id, 
            display_name, 
            full_name,
            email,
            avatar_url, 
            role,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            NEW.email,
            NEW.raw_user_meta_data->>'avatar_url',
            'user',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            updated_at = NOW();
            
    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the user creation
        RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$;

-- 3. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT INSERT ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO anon;

COMMIT;
