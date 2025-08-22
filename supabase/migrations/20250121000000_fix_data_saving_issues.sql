-- Fix data saving issues
-- Date: 2025-01-21

-- Ensure profiles table has correct structure and permissions
-- Add missing email field to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text;

-- Add missing full_name field to profiles table if it doesn't exist  
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name text;

-- Update ensure_profile function to handle all fields correctly
CREATE OR REPLACE FUNCTION public.ensure_profile()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
    user_profile RECORD;
    user_auth_data RECORD;
    result JSONB;
BEGIN
    -- Get current authenticated user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Get user auth data
    SELECT 
        email,
        raw_user_meta_data->>'full_name' as full_name,
        raw_user_meta_data->>'avatar_url' as avatar_url
    INTO user_auth_data
    FROM auth.users
    WHERE id = current_user_id;

    -- Check if profile already exists
    SELECT * INTO user_profile
    FROM public.profiles
    WHERE id = current_user_id;

    -- Create profile if it doesn't exist
    IF user_profile IS NULL THEN
        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            display_name,
            avatar_url,
            role,
            created_at,
            updated_at
        ) VALUES (
            current_user_id,
            user_auth_data.email,
            user_auth_data.full_name,
            COALESCE(user_auth_data.full_name, user_auth_data.email),
            user_auth_data.avatar_url,
            'user',
            now(),
            now()
        )
        RETURNING * INTO user_profile;
        
        -- Also ensure user has default role in user_roles table
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (current_user_id, 'user', now())
        ON CONFLICT (user_id, role) DO NOTHING;
        
        result := jsonb_build_object(
            'success', true,
            'created', true,
            'profile', row_to_json(user_profile)
        );
    ELSE
        -- Update existing profile with latest auth data if needed
        UPDATE public.profiles
        SET 
            email = COALESCE(user_auth_data.email, email),
            full_name = COALESCE(user_auth_data.full_name, full_name),
            display_name = COALESCE(user_auth_data.full_name, display_name, email),
            avatar_url = COALESCE(user_auth_data.avatar_url, avatar_url),
            updated_at = now()
        WHERE id = current_user_id
        RETURNING * INTO user_profile;
        
        -- Ensure user has at least default role
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (current_user_id, 'user', now())
        ON CONFLICT (user_id, role) DO NOTHING;
        
        result := jsonb_build_object(
            'success', true,
            'created', false,
            'profile', row_to_json(user_profile)
        );
    END IF;

    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.ensure_profile() TO authenticated;

-- Enable RLS on profiles and user_roles tables if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;

-- Create comprehensive RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "System can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (true);

-- Create comprehensive RLS policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur2
            WHERE ur2.user_id = auth.uid() 
            AND ur2.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur2
            WHERE ur2.user_id = auth.uid() 
            AND ur2.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "System can insert roles" ON public.user_roles
    FOR INSERT WITH CHECK (true);

-- Create trigger to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        display_name,
        avatar_url,
        role
    )
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        COALESCE(new.raw_user_meta_data->>'full_name', new.email),
        new.raw_user_meta_data->>'avatar_url',
        'user'
    );

    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Add unique constraint to user_roles if it doesn't exist
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key,
ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

-- Update existing users without profiles
INSERT INTO public.profiles (id, email, display_name, role)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email),
    'user'
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Update existing users without roles
INSERT INTO public.user_roles (user_id, role)
SELECT 
    au.id,
    'user'
FROM auth.users au
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;
