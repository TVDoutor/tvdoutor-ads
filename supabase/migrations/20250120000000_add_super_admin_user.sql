-- Add super admin role for hildebrando.cardoso
-- User ID: 7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3

INSERT INTO public.user_roles (user_id, role, created_at) 
VALUES ('7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3', 'super_admin', now()) 
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the insertion
SELECT 
    ur.user_id,
    ur.role,
    p.email,
    p.full_name
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.user_id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';
