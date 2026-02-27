-- Fix: Erro ao cadastrar tela - null value in venue_type_grandchildren
-- Causa 1: Coluna venue_type_grandchildren pode ter NOT NULL constraint no banco remoto
-- Causa 2: Função RPC add_screen_as_admin não existia nas migrations
-- Date: 2026-02-27

-- 1. Garantir que venue_type_grandchildren aceita NULL (caso o banco remoto tenha NOT NULL)
ALTER TABLE public.screens ALTER COLUMN venue_type_grandchildren DROP NOT NULL;

-- 2. Criar a função add_screen_as_admin para bypass de RLS ao inserir telas
DROP FUNCTION IF EXISTS public.add_screen_as_admin(jsonb);
CREATE OR REPLACE FUNCTION public.add_screen_as_admin(screen_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_row public.screens;
  result jsonb;
BEGIN
  -- Verificar se o usuário tem permissão (admin, super_admin ou manager)
  IF NOT (public.is_admin() OR public.is_manager()) THEN
    RAISE EXCEPTION 'Apenas administradores e gerentes podem adicionar telas';
  END IF;

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
    lng,
    ambiente,
    audiencia_pacientes,
    audiencia_local,
    audiencia_hcp,
    audiencia_medica,
    aceita_convenio,
    audience_monthly
  ) VALUES (
    screen_data->>'code',
    screen_data->>'name',
    screen_data->>'display_name',
    screen_data->>'city',
    screen_data->>'state',
    screen_data->>'address_raw',
    COALESCE((screen_data->>'class')::public.class_band, 'ND'::public.class_band),
    COALESCE((screen_data->>'active')::boolean, true),
    screen_data->>'venue_type_parent',
    screen_data->>'venue_type_child',
    screen_data->>'venue_type_grandchildren',
    CASE
      WHEN screen_data->'specialty' IS NOT NULL AND jsonb_typeof(screen_data->'specialty') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(screen_data->'specialty'))
      ELSE ARRAY[]::TEXT[]
    END,
    NULLIF(screen_data->>'lat', '')::float8,
    NULLIF(screen_data->>'lng', '')::float8,
    screen_data->>'ambiente',
    NULLIF(screen_data->>'audiencia_pacientes', '')::int,
    NULLIF(screen_data->>'audiencia_local', '')::int,
    NULLIF(screen_data->>'audiencia_hcp', '')::int,
    NULLIF(screen_data->>'audiencia_medica', '')::int,
    NULLIF(screen_data->>'aceita_convenio', '')::boolean,
    NULLIF(screen_data->>'audience_monthly', '')::int
  )
  RETURNING * INTO inserted_row;

  SELECT to_jsonb(inserted_row) INTO result;
  RETURN result;
END;
$$;

-- Garantir que a função pode ser executada por usuários autenticados
GRANT EXECUTE ON FUNCTION public.add_screen_as_admin(jsonb) TO authenticated;
