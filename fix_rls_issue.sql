-- Comprehensive fix for screens table RLS policy issue
-- Run this in the Supabase SQL Editor

-- 1. First, let's check the current user's role
SELECT 
    p.id,
    p.full_name,
    p.display_name,
    p.role as profile_role,
    p.super_admin,
    ur.role as user_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE p.id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

-- 2. Ensure the user has super_admin role in user_roles table
INSERT INTO public.user_roles (user_id, role, created_at)
VALUES ('7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3', 'super_admin', now())
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Update the user's profile to have super_admin flag
UPDATE public.profiles 
SET super_admin = true, role = 'admin'
WHERE id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

-- 4. Drop existing screens policies
DROP POLICY IF EXISTS "Authenticated users can read screens" ON public.screens;
DROP POLICY IF EXISTS "Only admins can modify screens" ON public.screens;
DROP POLICY IF EXISTS "Admins can modify screens" ON public.screens;
DROP POLICY IF EXISTS "Super admins can do everything" ON public.screens;

-- 5. Create new comprehensive policies for screens table
CREATE POLICY "Authenticated users can read screens"
    ON public.screens
    FOR SELECT
    TO authenticated
    USING (true);

-- 6. Create a more permissive policy that checks both user_roles and profiles tables
CREATE POLICY "Admins and super admins can modify screens"
    ON public.screens
    FOR ALL
    TO authenticated
    USING (
        -- Check user_roles table
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
        OR
        -- Check profiles table super_admin flag
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND super_admin = true
        )
        OR
        -- Check profiles table role field
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        -- Check user_roles table
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
        OR
        -- Check profiles table super_admin flag
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND super_admin = true
        )
        OR
        -- Check profiles table role field
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- 7. Verify the user now has admin privileges
SELECT 
    p.id,
    p.full_name,
    p.super_admin,
    p.role as profile_role,
    ur.role as user_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE p.id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

-- 8. Test the is_admin() function
SELECT 
    auth.uid() as current_user,
    public.is_admin() as is_admin_result,
    public.is_super_admin() as is_super_admin_result,
    public.get_user_role() as user_role_result;

-- 9. Test if we can insert into screens table (this should work now)
-- Note: This is just a test, you can remove this part
SELECT 'RLS policy should now allow admin users to modify screens' as status;
