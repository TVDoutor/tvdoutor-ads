-- Corrige v_screens_enriched: remove filtro WHERE lat/lng NOT NULL
-- Problema: telas sem coordenadas ficavam invisíveis no inventário e na busca
-- Fix: todos os registros da tabela screens são expostos; lat/lng podem ser NULL

DROP VIEW IF EXISTS public.v_screens_enriched CASCADE;

CREATE OR REPLACE VIEW public.v_screens_enriched AS
SELECT
  sc.id,
  sc.code,
  sc.name,
  sc.display_name,
  sc.city,
  sc.state,
  sc.cep,
  COALESCE(sc.address_raw, '') AS address,
  sc.lat,
  sc.lng,
  sc.geom,
  sc.active,
  COALESCE(sc.class::text, 'ND') AS class,
  COALESCE(sc.specialty, ARRAY[]::text[]) AS specialty,
  COALESCE(sc.board_format, 'LED') AS board_format,
  COALESCE(sc.category, 'Outdoor') AS category,
  'TV Doutor' AS rede,

  sr.standard_rate_month,
  sr.selling_rate_month,
  sr.spots_per_hour,
  sr.spot_duration_secs,

  NULL::text AS venue_name,
  NULL::text AS venue_address,
  NULL::text AS venue_country,
  NULL::text AS venue_state,
  NULL::text AS venue_district,

  sc.name AS staging_nome_ponto,
  sc.audience_monthly AS staging_audiencia,
  CASE
    WHEN sc.specialty IS NOT NULL AND array_length(sc.specialty, 1) > 0
    THEN array_to_string(sc.specialty, ', ')
    ELSE NULL
  END AS staging_especialidades,
  sc.venue_type_parent AS staging_tipo_venue,
  sc.venue_type_child AS staging_subtipo,
  COALESCE(sc.venue_type_grandchildren, sc.category) AS staging_categoria,
  sc.venue_type_grandchildren,
  sc.address_raw,

  sc.ambiente,
  sc.audiencia_pacientes,
  sc.audiencia_local,
  sc.audiencia_hcp,
  sc.audiencia_medica,
  sc.aceita_convenio,

  sc.created_at,
  sc.updated_at

FROM public.screens sc
LEFT JOIN public.screen_rates sr ON sr.screen_id = sc.id;

GRANT SELECT ON public.v_screens_enriched TO authenticated;
GRANT SELECT ON public.v_screens_enriched TO anon;

COMMENT ON VIEW public.v_screens_enriched IS 'View enriquecida com todos os pontos, incluindo os sem coordenadas geográficas';
