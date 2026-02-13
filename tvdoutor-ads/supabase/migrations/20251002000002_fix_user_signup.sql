-- Fix user signup by making profiles policies more permissive
-- This migration fixes the "Database error saving new user" issue

BEGIN;

-- Drop the restrictive insert policy that's causing signup failures
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can upsert own profile" ON public.profiles;

-- Create a more permissive policy for profile creation during signup
-- This allows the handle_new_user trigger to work properly
CREATE POLICY "Allow profile creation during signup"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Also allow anon users to create profiles (for signup process)
CREATE POLICY "Allow anon profile creation during signup"
    ON public.profiles
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Keep the existing policies for other operations
-- (These should already exist from previous migrations)

-- Ensure the handle_new_user function has proper permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- Grant necessary table permissions
GRANT INSERT ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO anon;

COMMIT;
