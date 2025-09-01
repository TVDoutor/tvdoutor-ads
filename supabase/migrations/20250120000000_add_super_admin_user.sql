-- Add super admin role for hildebrando.cardoso
-- User ID: 7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3
-- Only run if user_roles table exists

DO $$
BEGIN
    -- Only proceed if user_roles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles' AND table_schema = 'public') THEN
        INSERT INTO public.user_roles (user_id, role, created_at) 
        VALUES ('7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3', 'super_admin', now()) 
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Verify the insertion (only if profiles table exists)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
            PERFORM 
                ur.user_id,
                ur.role,
                p.email,
                p.display_name
            FROM public.user_roles ur
            JOIN public.profiles p ON p.id = ur.user_id
            WHERE ur.user_id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';
        END IF;
    END IF;
END $$;
