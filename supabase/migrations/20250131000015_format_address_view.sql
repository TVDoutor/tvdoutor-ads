-- ===============================
-- FORMAT ADDRESS IN VIEW
-- Date: 2025-01-31
-- Formatar o campo address na view v_screens_enriched como "[endereço], [cidade] – [UF]"
-- ===============================

BEGIN;

-- Recriar a view com o campo address formatado
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
  -- Formatar o endereço como "[endereço], [cidade] – [UF]"
  CASE 
    WHEN sc.address_raw IS NOT NULL AND sc.address_raw != '' 
         AND sc.city IS NOT NULL AND sc.city != ''
         AND sc.state IS NOT NULL AND sc.state != ''
    THEN CONCAT(sc.address_raw, ', ', sc.city, ' – ', sc.state)
    WHEN sc.address_raw IS NOT NULL AND sc.address_raw != ''
         AND sc.city IS NOT NULL AND sc.city != ''
    THEN CONCAT(sc.address_raw, ', ', sc.city)
    WHEN sc.address_raw IS NOT NULL AND sc.address_raw != ''
    THEN sc.address_raw
    WHEN sc.city IS NOT NULL AND sc.city != ''
         AND sc.state IS NOT NULL AND sc.state != ''
    THEN CONCAT(sc.city, ' – ', sc.state)
    WHEN sc.city IS NOT NULL AND sc.city != ''
    THEN sc.city
    ELSE ''
  END AS address,
  sc.lat,
  sc.lng,
  sc.geom,
  sc.active,
  COALESCE(sc.class::text, 'ND') AS class,
  -- Garantir que specialty seja sempre um array
  COALESCE(sc.specialty, ARRAY[]::text[]) AS specialty,
  COALESCE(sc.board_format, 'LED') AS board_format,
  COALESCE(sc.category, 'Outdoor') AS category,
  
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
COMMENT ON VIEW public.v_screens_enriched IS 'View enriquecida com endereço formatado como "[endereço], [cidade] – [UF]"';

-- Permitir acesso à view para usuários autenticados
GRANT SELECT ON public.v_screens_enriched TO authenticated;

-- Verificar se a view está funcionando
DO $$
BEGIN
  -- Testar se a view pode ser consultada
  PERFORM * FROM public.v_screens_enriched LIMIT 1;
  RAISE NOTICE 'View v_screens_enriched criada com sucesso com endereço formatado!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao criar view v_screens_enriched: %', SQLERRM;
END $$;

COMMIT;
