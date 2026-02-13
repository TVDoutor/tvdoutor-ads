-- =============================================================================
-- View venue–farmácia distância + RPCs para raio e especialidade
-- Permite: (1) filtrar venues/telas por "tem farmácia a até X km"
--          (2) contar farmácias por especialidade e raio
-- =============================================================================

-- Função Haversine (distância em km entre dois pontos)
CREATE OR REPLACE FUNCTION public.haversine_km(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT 6371.0 * 2 * asin(sqrt(
    sin(radians(lat2 - lat1) / 2) * sin(radians(lat2 - lat1) / 2)
    + cos(radians(lat1)) * cos(radians(lat2))
    * sin(radians(lon2 - lon1) / 2) * sin(radians(lon2 - lon1) / 2)
  ))
$$;

COMMENT ON FUNCTION public.haversine_km IS 'Distância em km entre dois pontos (Haversine).';

-- View: pares venue–farmácia com distância (limitada a 30 km para evitar explosão)
-- Remover materialized view ou view existente (no remoto pode existir como MV)
DROP MATERIALIZED VIEW IF EXISTS public.mv_venue_farmacia_distancia;
DROP VIEW IF EXISTS public.mv_venue_farmacia_distancia;

CREATE OR REPLACE VIEW public.mv_venue_farmacia_distancia AS
SELECT
  v.id AS venue_id,
  v.name AS nome_venue,
  f.id AS farmacia_id,
  COALESCE(f.nome, f.fantasia, '') AS nome_farmacia,
  public.haversine_km(
    v.lat,
    v.lng,
    COALESCE(f.lat, f.latitude)::double precision,
    COALESCE(f.lng, f.longitude)::double precision
  ) AS distancia_km,
  f.cidade AS cidade_farmacia,
  f.grupo
FROM public.venues v
JOIN public.farmacias f
  ON v.lat IS NOT NULL
  AND v.lng IS NOT NULL
  AND (f.lat IS NOT NULL OR f.latitude IS NOT NULL)
  AND (f.lng IS NOT NULL OR f.longitude IS NOT NULL)
WHERE public.haversine_km(
  v.lat,
  v.lng,
  COALESCE(f.lat, f.latitude)::double precision,
  COALESCE(f.lng, f.longitude)::double precision
) <= 30;

COMMENT ON VIEW public.mv_venue_farmacia_distancia IS 'Pares venue–farmácia com distância em km (máx 30 km). Usado para filtros por raio e relatórios.';

GRANT SELECT ON public.mv_venue_farmacia_distancia TO authenticated;

-- RPC: retorna venue_ids que possuem ao menos uma farmácia dentro do raio (km)
CREATE OR REPLACE FUNCTION public.get_venue_ids_with_pharmacy_in_radius(radius_km double precision)
RETURNS SETOF bigint
LANGUAGE sql
STABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT venue_id
  FROM public.mv_venue_farmacia_distancia
  WHERE distancia_km <= radius_km
  ORDER BY venue_id;
$$;

COMMENT ON FUNCTION public.get_venue_ids_with_pharmacy_in_radius IS 'Lista de venue_id que têm pelo menos uma farmácia a até radius_km.';

GRANT EXECUTE ON FUNCTION public.get_venue_ids_with_pharmacy_in_radius(double precision) TO authenticated;

-- RPC: conta farmácias distintas no raio de venues que têm a especialidade informada
CREATE OR REPLACE FUNCTION public.get_pharmacy_count_by_specialty_and_radius(
  p_specialty text,
  p_radius_km double precision
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_farmacias jsonb;
BEGIN
  WITH venues_com_especialidade AS (
    SELECT DISTINCT s.venue_id
    FROM public.screens s
    WHERE s.active = true
      AND s.venue_id IS NOT NULL
      AND s.specialty IS NOT NULL
      AND s.specialty @> ARRAY[p_specialty]
  ),
  farmacias_no_raio AS (
    SELECT DISTINCT d.farmacia_id, d.nome_farmacia, d.distancia_km
    FROM public.mv_venue_farmacia_distancia d
    JOIN venues_com_especialidade v ON v.venue_id = d.venue_id
    WHERE d.distancia_km <= p_radius_km
  )
  SELECT COUNT(*)::int INTO v_count FROM farmacias_no_raio;
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object(
      'farmacia_id', farmacia_id,
      'nome_farmacia', nome_farmacia,
      'distancia_km', distancia_km
    )),
    '[]'::jsonb
  ) INTO v_farmacias
  FROM farmacias_no_raio;

  RETURN jsonb_build_object(
    'specialty', p_specialty,
    'radius_km', p_radius_km,
    'count', v_count,
    'farmacias', v_farmacias
  );
END;
$$;

COMMENT ON FUNCTION public.get_pharmacy_count_by_specialty_and_radius IS 'Conta e lista farmácias a até p_radius_km de venues que têm a especialidade p_specialty.';

GRANT EXECUTE ON FUNCTION public.get_pharmacy_count_by_specialty_and_radius(text, double precision) TO authenticated;

-- RPC: resumo por raios (quantidade de venues e de telas com farmácia no raio)
CREATE OR REPLACE FUNCTION public.get_venues_by_pharmacy_radius_summary(radii_km double precision[] DEFAULT ARRAY[1,2,3,4,5])
RETURNS TABLE(radius_km double precision, venue_count bigint, screen_count bigint)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r double precision;
BEGIN
  FOREACH r IN ARRAY radii_km
  LOOP
    RETURN QUERY
    WITH venue_ids_in_radius AS (
      SELECT DISTINCT d.venue_id
      FROM public.mv_venue_farmacia_distancia d
      WHERE d.distancia_km <= r
    ),
    counts AS (
      SELECT
        (SELECT COUNT(*) FROM venue_ids_in_radius) AS vcnt,
        (SELECT COUNT(*) FROM public.screens s
         WHERE s.active = true AND s.venue_id IN (SELECT venue_id FROM venue_ids_in_radius)) AS scnt
    )
    SELECT r, counts.vcnt::bigint, counts.scnt::bigint
    FROM counts;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.get_venues_by_pharmacy_radius_summary IS 'Para cada raio em radii_km, retorna quantidade de venues e de telas com farmácia no raio.';

GRANT EXECUTE ON FUNCTION public.get_venues_by_pharmacy_radius_summary(double precision[]) TO authenticated;
