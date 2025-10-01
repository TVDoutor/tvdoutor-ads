-- Fix v_screens_enriched view to include missing rate columns
-- This fixes the error: column v_screens_enriched.standard_rate_month does not exist

DROP VIEW IF EXISTS public.v_screens_enriched;

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
  
  -- Dados de rates (se existirem)
  sr.standard_rate_month,
  sr.selling_rate_month,
  sr.spots_per_hour,
  sr.spot_duration_secs,
  
  -- Dados do venue (campos nulos por enquanto)
  NULL::text AS venue_name,
  NULL::text AS venue_address,
  NULL::text AS venue_country,
  NULL::text AS venue_state,
  NULL::text AS venue_district,
  
  -- Campos de staging para compatibilidade
  sc.name AS staging_nome_ponto,
  NULL::integer AS staging_audiencia,
  CASE 
    WHEN sc.specialty IS NOT NULL AND array_length(sc.specialty, 1) > 0 
    THEN array_to_string(sc.specialty, ', ')
    ELSE NULL
  END AS staging_especialidades,
  NULL::text AS staging_tipo_venue,
  NULL::text AS staging_subtipo,
  sc.category AS staging_categoria,
  
  -- Timestamps
  sc.created_at,
  sc.updated_at

FROM public.screens sc
LEFT JOIN public.screen_rates sr ON sr.screen_id = sc.id
WHERE sc.lat IS NOT NULL AND sc.lng IS NOT NULL;

-- Grant permissions
GRANT SELECT ON public.v_screens_enriched TO authenticated;
GRANT SELECT ON public.v_screens_enriched TO anon;

-- Comentário da view
COMMENT ON VIEW public.v_screens_enriched IS 'View enriquecida com dados de rates e compatibilidade com staging';
