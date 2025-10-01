-- Ultra minimal fix: just correct the active column mapping
-- Only use columns that definitely exist

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
  sc.active, -- CORRIGIDO: usar 'active' diretamente em vez de 'screen_active'
  COALESCE(sc.class::text, 'ND') AS class,
  COALESCE(sc.specialty, ARRAY[]::text[]) AS specialty,
  COALESCE(sc.board_format, 'LED') AS board_format,
  COALESCE(sc.category, 'Outdoor') AS category,
  'TV Doutor' AS rede

FROM public.screens sc
WHERE sc.lat IS NOT NULL AND sc.lng IS NOT NULL;

-- Grant permissions
GRANT SELECT ON public.v_screens_enriched TO authenticated;
GRANT SELECT ON public.v_screens_enriched TO anon;
