-- Atualiza RPC administrativa para aceitar campos de exportação comercial.
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
    restricoes,
    programatica,
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
    screen_data->>'restricoes',
    screen_data->>'programatica',
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

GRANT EXECUTE ON FUNCTION public.add_screen_as_admin(jsonb) TO authenticated;
