-- Add ensure_profile function to handle user profile creation after OAuth login

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
            display_name,
            avatar_url,
            role,
            created_at,
            updated_at
        ) VALUES (
            current_user_id,
            user_auth_data.full_name,
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
            display_name = COALESCE(user_auth_data.full_name, display_name),
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


