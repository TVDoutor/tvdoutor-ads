-- Create RPC functions for admin operations that bypass RLS
-- Run this in the Supabase SQL Editor

-- Function to add a screen with admin privileges
CREATE OR REPLACE FUNCTION public.add_screen_as_admin(screen_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    inserted_screen jsonb;
    current_user_id uuid;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Check if user has admin privileges
    IF NOT (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = current_user_id 
            AND role IN ('admin', 'super_admin')
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = current_user_id 
            AND super_admin = true
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = current_user_id 
            AND role IN ('admin', 'super_admin')
        )
    ) THEN
        RAISE EXCEPTION 'Insufficient privileges';
    END IF;

    -- Insert the screen (bypassing RLS due to SECURITY DEFINER)
    INSERT INTO public.screens (
        code,
        name,
        display_name,
        city,
        state,
        address_raw,
        class,
        active,
        venue_type_parent,
        venue_type_child,
        venue_type_grandchildren,
        specialty,
        lat,
        lng
    )
    VALUES (
        (screen_data->>'code')::text,
        (screen_data->>'code')::text,
        (screen_data->>'display_name')::text,
        (screen_data->>'city')::text,
        (screen_data->>'state')::text,
        (screen_data->>'address_raw')::text,
        (screen_data->>'class')::class_band,
        COALESCE((screen_data->>'active')::boolean, true),
        (screen_data->>'venue_type_parent')::text,
        (screen_data->>'venue_type_child')::text,
        (screen_data->>'venue_type_grandchildren')::text,
        (screen_data->>'specialty')::text[],
        (screen_data->>'lat')::numeric,
        (screen_data->>'lng')::numeric
    )
    RETURNING to_jsonb(screens.*) INTO inserted_screen;

    RETURN inserted_screen;
END;
$$;

-- Function to delete a screen with admin privileges
CREATE OR REPLACE FUNCTION public.delete_screen_as_admin(screen_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid;
    deleted_count integer;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Check if user has admin privileges
    IF NOT (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = current_user_id 
            AND role IN ('admin', 'super_admin')
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = current_user_id 
            AND super_admin = true
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = current_user_id 
            AND role IN ('admin', 'super_admin')
        )
    ) THEN
        RAISE EXCEPTION 'Insufficient privileges';
    END IF;

    -- Delete the screen (bypassing RLS due to SECURITY DEFINER)
    DELETE FROM public.screens WHERE id = screen_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count > 0;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.add_screen_as_admin(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_screen_as_admin(bigint) TO authenticated;
