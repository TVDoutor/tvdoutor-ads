-- Fix profiles RLS policies to prevent 400 errors
-- This migration fixes the "Error ensuring profile" and 400 errors in profiles endpoint

BEGIN;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can manage all profiles" ON public.profiles;

-- Create new, more permissive policies for profiles
-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Policy 2: Users can view all profiles (for user management)
CREATE POLICY "Authenticated users can view all profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy 4: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Policy 5: Users can upsert their own profile (for profile creation/update)
CREATE POLICY "Users can upsert own profile"
    ON public.profiles
    FOR ALL
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy 6: Admins can manage all profiles
CREATE POLICY "Admins can manage all profiles"
    ON public.profiles
    FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

COMMIT;
