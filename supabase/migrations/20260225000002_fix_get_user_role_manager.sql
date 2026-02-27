-- Fix: get_user_role não considerava profiles.role, então Managers só em profiles não passavam na checagem do handleSaveEdit
-- Usuários como Rose (Gerente) com role em profiles.role mas não em user_roles recebiam 'user' e não conseguiam salvar
-- Date: 2026-02-25

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN 'user';
  END IF;

  -- 1. Super admin em profiles
  SELECT CASE WHEN super_admin THEN 'super_admin' ELSE NULL END
  INTO user_role
  FROM public.profiles
  WHERE id = _user_id;

  -- 2. Se não for super_admin, checar profiles.role (admin, manager, client)
  IF user_role IS NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='role') THEN
    SELECT (p.role)::text
    INTO user_role
    FROM public.profiles p
    WHERE p.id = _user_id
      AND (p.role)::text IN ('admin', 'super_admin', 'manager', 'client');
  END IF;

  -- 3. Fallback: user_roles (inclui manager na ordenação)
  IF user_role IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_roles') THEN
    SELECT ur.role::text
    INTO user_role
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
    ORDER BY CASE ur.role::text
      WHEN 'super_admin' THEN 4
      WHEN 'admin' THEN 3
      WHEN 'manager' THEN 2
      WHEN 'client' THEN 1
      ELSE 0
    END DESC
    LIMIT 1;
  END IF;

  RETURN COALESCE(user_role, 'user');
EXCEPTION WHEN OTHERS THEN
  RETURN 'user';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO anon;
COMMENT ON FUNCTION public.get_user_role(uuid) IS 'Retorna a role do usuário - considera profiles.role e user_roles, incluindo manager';
