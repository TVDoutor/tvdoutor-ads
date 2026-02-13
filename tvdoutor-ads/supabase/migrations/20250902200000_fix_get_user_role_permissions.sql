-- Fix permissions for get_user_role function
-- This function is being called by RLS policies and needs proper permissions

-- Drop the existing function first to avoid parameter name conflicts
DROP FUNCTION IF EXISTS public.get_user_role(UUID);

-- Recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Return null if no user_id provided
    IF _user_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get user role from profiles table
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = _user_id;
    
    -- Return the role or 'user' as default
    RETURN COALESCE(user_role, 'user');
EXCEPTION
    WHEN OTHERS THEN
        -- Return default role in case of any error
        RETURN 'user';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO anon;

-- Also create a simpler version without parameters for RLS
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Get current user role
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- Return the role or 'user' as default
    RETURN COALESCE(user_role, 'user');
EXCEPTION
    WHEN OTHERS THEN
        -- Return default role in case of any error
        RETURN 'user';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO anon;

-- Add comment
COMMENT ON FUNCTION public.get_user_role(UUID) IS 'Get user role by user ID - SECURITY DEFINER for RLS';
COMMENT ON FUNCTION public.get_current_user_role() IS 'Get current authenticated user role - SECURITY DEFINER for RLS';
