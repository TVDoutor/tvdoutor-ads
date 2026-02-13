-- Create RPC function to ensure user profile exists
CREATE OR REPLACE FUNCTION public.ensure_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile if it doesn't exist
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    display_name,
    role
  )
  SELECT 
    auth.uid(),
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email),
    COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', u.email),
    'user'::role_kind
  FROM auth.users u
  WHERE u.id = auth.uid()
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert user role if it doesn't exist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'user'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Create RPC function to get user role (drop existing function first if it exists with different signature)
DO $$
BEGIN
  -- Drop the existing function if it exists
  DROP FUNCTION IF EXISTS public.get_user_role(uuid);
  DROP FUNCTION IF EXISTS public.get_user_role(uuid, text);
END $$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Check if super admin in profiles
  SELECT CASE WHEN super_admin THEN 'super_admin' ELSE NULL END
  INTO user_role
  FROM public.profiles
  WHERE id = _user_id;
  
  -- If not super admin, get highest role from user_roles
  IF user_role IS NULL THEN
    SELECT role::text
    INTO user_role
    FROM public.user_roles
    WHERE user_id = _user_id
    ORDER BY 
      CASE role
        WHEN 'super_admin' THEN 3
        WHEN 'admin' THEN 2
        WHEN 'user' THEN 1
        ELSE 0
      END DESC
    LIMIT 1;
  END IF;
  
  -- Default to 'user' if no role found
  RETURN COALESCE(user_role, 'user');
END;
$$;

-- Create RPC function to list venue summaries for authenticated users
CREATE OR REPLACE FUNCTION public.list_venue_summaries(
  search text DEFAULT NULL,
  limit_count int DEFAULT 20,
  offset_count int DEFAULT 0
)
RETURNS TABLE(
  venue_id bigint,
  venue_code text,
  venue_name text,
  city text,
  state text,
  cep text,
  class class_band,
  specialty text[],
  active boolean,
  screens_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  RETURN QUERY
  SELECT 
    v.id as venue_id,
    v.code as venue_code,
    v.name as venue_name,
    COALESCE(s.city, '') as city,
    COALESCE(s.state, '') as state,
    COALESCE(s.cep, '') as cep,
    COALESCE(s.class, 'ND'::class_band) as class,
    COALESCE(array_agg(DISTINCT s.specialty) FILTER (WHERE s.specialty IS NOT NULL AND array_length(s.specialty, 1) > 0), ARRAY[]::text[]) as specialty,
    COALESCE(bool_or(s.active), false) as active,
    COUNT(s.id) as screens_count
  FROM public.venues v
  LEFT JOIN public.screens s ON v.id = s.venue_id
  WHERE (search IS NULL OR 
         v.code ILIKE '%' || search || '%' OR
         v.name ILIKE '%' || search || '%' OR
         s.city ILIKE '%' || search || '%' OR
         s.state ILIKE '%' || search || '%')
  GROUP BY v.id, v.code, v.name, s.city, s.state, s.cep, s.class
  ORDER BY v.name
  LIMIT limit_count OFFSET offset_count;
END;
$$;

-- Create RPC function to get venue details for authenticated users
CREATE OR REPLACE FUNCTION public.get_venue_details(venue_id_in bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  SELECT jsonb_build_object(
    'id', v.id,
    'code', v.code,
    'name', v.name,
    'district', v.district,
    'state', v.state,
    'country', v.country,
    'lat', v.lat,
    'lng', v.lng,
    'created_at', v.created_at,
    'updated_at', v.updated_at,
    'screens', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'code', s.code,
          'name', s.name,
          'display_name', s.display_name,
          'city', s.city,
          'state', s.state,
          'cep', s.cep,
          'class', s.class,
          'specialty', s.specialty,
          'address_raw', s.address_raw,
          'active', s.active,
          'asset_url', s.asset_url,
          'venue_type_parent', s.venue_type_parent,
          'venue_type_child', s.venue_type_child,
          'venue_type_grandchildren', s.venue_type_grandchildren,
          'facing', s.facing,
          'screen_facing', s.screen_facing,
          'screen_start_time', s.screen_start_time,
          'screen_end_time', s.screen_end_time,
          'lat', s.lat,
          'lng', s.lng,
          'created_at', s.created_at,
          'updated_at', s.updated_at
        )
      ) FILTER (WHERE s.id IS NOT NULL),
      '[]'::jsonb
    )
  )
  INTO result
  FROM public.venues v
  LEFT JOIN public.screens s ON v.id = s.venue_id
  WHERE v.id = venue_id_in
  GROUP BY v.id, v.code, v.name, v.district, v.state, v.country, v.lat, v.lng, v.created_at, v.updated_at;
  
  RETURN result;
END;
$$;