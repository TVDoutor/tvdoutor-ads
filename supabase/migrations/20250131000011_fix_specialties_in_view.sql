-- ===============================
-- FIX SPECIALTIES IN VIEW
-- Date: 2025-01-31
-- Corrigir especialidades na view para garantir que sejam retornadas como array
-- ===============================

BEGIN;

-- Recriar a view com especialidades corrigidas
DROP VIEW IF EXISTS public.v_screens_enriched;

CREATE OR REPLACE VIEW public.v_screens_enriched AS
SELECT
  -- Campos principais da tela
  sc.id,
  sc.code,
  sc.name,
  sc.display_name,
  sc.city,
  sc.state,
  sc.cep,
  sc.address_raw AS address,
  sc.lat,
  sc.lng,
  sc.geom,
  sc.active,
  sc.class,
  -- Garantir que specialty seja sempre um array
  COALESCE(sc.specialty, ARRAY[]::text[]) AS specialty,
  sc.board_format,
  sc.category,
  
  -- Dados de rates (se existirem)
  sr.standard_rate_month,
  sr.selling_rate_month,
  sr.spots_per_hour,
  sr.spot_duration_secs,
  
  -- Dados do venue (se existir)
  v.name AS venue_name,
  v.google_formatted_address AS venue_address,
  v.country AS venue_country,
  v.state AS venue_state,
  v.district AS venue_district,
  
  -- Campo rede fixo baseado no código da tela
  CASE 
    WHEN sc.code LIKE 'P2%' THEN 'TV Doutor'
    WHEN sc.code LIKE 'P1%' THEN 'LG'
    WHEN sc.code LIKE 'P3%' THEN 'Amil'
    ELSE 'TV Doutor'
  END AS rede,
  
  -- Campos de staging para compatibilidade
  sc.name AS staging_nome_ponto,
  NULL::integer AS staging_audiencia,
  -- Garantir que staging_especialidades seja uma string
  CASE 
    WHEN sc.specialty IS NOT NULL AND array_length(sc.specialty, 1) > 0 
    THEN array_to_string(sc.specialty, ',')
    ELSE NULL
  END AS staging_especialidades,
  NULL::text AS staging_tipo_venue,
  NULL::text AS staging_subtipo,
  sc.category AS staging_categoria,
  
  -- Timestamps
  sc.created_at,
  sc.updated_at
  
FROM public.screens AS sc
LEFT JOIN public.screen_rates sr ON sr.screen_id = sc.id
LEFT JOIN public.venues v ON v.id = sc.venue_id
WHERE sc.active = true
ORDER BY sc.code;

-- Comentário da view
COMMENT ON VIEW public.v_screens_enriched IS 'View enriquecida com especialidades corrigidas como arrays';

-- Permitir acesso à view para usuários autenticados
GRANT SELECT ON public.v_screens_enriched TO authenticated;

COMMIT;
