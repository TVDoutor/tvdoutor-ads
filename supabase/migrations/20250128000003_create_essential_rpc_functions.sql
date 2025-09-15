-- Create essential RPC functions that are being called by the application
-- This migration creates the missing RPC functions to prevent 404 errors

-- 1. Create get_user_role function
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
        RETURN 'user';
    END IF;

    -- Check if super admin in profiles
    SELECT CASE WHEN super_admin THEN 'super_admin' ELSE NULL END
    INTO user_role
    FROM public.profiles
    WHERE id = _user_id;

    -- If not super admin, check user_roles table
    IF user_role IS NULL THEN
        SELECT role::TEXT
        INTO user_role
        FROM public.user_roles
        WHERE user_id = _user_id
        ORDER BY CASE role
            WHEN 'super_admin' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'user' THEN 3
        END
        LIMIT 1;
    END IF;

    -- Return default role if none found
    RETURN COALESCE(user_role, 'user');
END;
$$;

-- 2. Drop and recreate ensure_profile function to fix return type conflict
DROP FUNCTION IF EXISTS public.ensure_profile();

CREATE FUNCTION public.ensure_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile if it doesn't exist
  INSERT INTO public.profiles (id, email, full_name, display_name, role)
  SELECT 
    auth.uid(),
    auth.jwt() ->> 'email',
    COALESCE(auth.jwt() ->> 'full_name', auth.jwt() ->> 'email'),
    COALESCE(auth.jwt() ->> 'full_name', auth.jwt() ->> 'email'),
    'user'
  WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid()
  );

  -- Insert user role if it doesn't exist
  INSERT INTO public.user_roles (user_id, role)
  SELECT auth.uid(), 'user'
  WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
  )
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- 3. Create get_equipe_stats function (conditional on table existence)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_projeto_equipe') THEN
    EXECUTE '
    CREATE OR REPLACE FUNCTION public.get_equipe_stats(projeto_uuid UUID)
    RETURNS TABLE (
      total_membros BIGINT,
      total_coordenadores BIGINT,
      total_gerentes BIGINT,
      total_diretores BIGINT,
      membros_ativos BIGINT
    ) 
    LANGUAGE SQL
    STABLE
    AS $func$
      SELECT 
        COUNT(*) FILTER (WHERE papel = ''membro'') as total_membros,
        COUNT(*) FILTER (WHERE papel = ''coordenador'') as total_coordenadores,
        COUNT(*) FILTER (WHERE papel = ''gerente'') as total_gerentes,
        COUNT(*) FILTER (WHERE papel = ''diretor'') as total_diretores,
        COUNT(*) FILTER (WHERE ativo = true) as membros_ativos
      FROM agencia_projeto_equipe
      WHERE projeto_id = projeto_uuid;
    $func$;';
  ELSE
    -- Create a stub function that returns zeros if table doesn't exist
    CREATE OR REPLACE FUNCTION public.get_equipe_stats(projeto_uuid UUID)
    RETURNS TABLE (
      total_membros BIGINT,
      total_coordenadores BIGINT,
      total_gerentes BIGINT,
      total_diretores BIGINT,
      membros_ativos BIGINT
    ) 
    LANGUAGE SQL
    STABLE
    AS $func$
      SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT;
    $func$;
  END IF;
END
$$;

-- 4. Create email_stats table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.email_stats (
  id SERIAL PRIMARY KEY,
  email_type text NOT NULL,
  status text NOT NULL,
  total integer DEFAULT 0,
  today integer DEFAULT 0,
  last_7_days integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 5. Note: email_stats is now a view, no initial data insertion needed

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile() TO anon;
GRANT EXECUTE ON FUNCTION public.get_equipe_stats(UUID) TO authenticated;
GRANT ALL ON public.email_stats TO authenticated;

-- 7. Add comments
COMMENT ON FUNCTION public.get_user_role(UUID) IS 'Get user role by user ID - SECURITY DEFINER for RLS';
COMMENT ON FUNCTION public.ensure_profile() IS 'Ensure user profile exists - SECURITY DEFINER for RLS';
COMMENT ON FUNCTION public.get_equipe_stats(UUID) IS 'Get team statistics for a project';
