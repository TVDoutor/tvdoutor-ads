-- Fix admin permissions - make admin users have super_admin permissions
-- This migration ensures that admin users can edit screens and have full permissions

-- Update the get_user_role function to return super_admin for admin users
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
    
    -- Check if super admin in profiles table first
    SELECT CASE WHEN super_admin THEN 'super_admin' ELSE NULL END
    INTO user_role
    FROM public.profiles
    WHERE id = _user_id;
    
    -- If not super admin, check role from profiles table
    IF user_role IS NULL THEN
        SELECT role INTO user_role
        FROM public.profiles
        WHERE id = _user_id;
        
        -- If user is admin, give them super_admin permissions
        IF user_role = 'admin' THEN
            user_role = 'super_admin';
        END IF;
    END IF;
    
    -- Return the role or 'user' as default
    RETURN COALESCE(user_role, 'user');
EXCEPTION
    WHEN OTHERS THEN
        -- Return default role in case of any error
        RETURN 'user';
END;
$$;

-- Update the current user role function as well
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Check if super admin in profiles table first
    SELECT CASE WHEN super_admin THEN 'super_admin' ELSE NULL END
    INTO user_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- If not super admin, check role from profiles table
    IF user_role IS NULL THEN
        SELECT role INTO user_role
        FROM public.profiles
        WHERE id = auth.uid();
        
        -- If user is admin, give them super_admin permissions
        IF user_role = 'admin' THEN
            user_role = 'super_admin';
        END IF;
    END IF;
    
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
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO anon;

-- Add comments
COMMENT ON FUNCTION public.get_user_role(UUID) IS 'Get user role by user ID - Admin users get super_admin permissions';
COMMENT ON FUNCTION public.get_current_user_role() IS 'Get current authenticated user role - Admin users get super_admin permissions';
