-- Migration: Create heatmap function with filters
-- Date: 2025-09-09
-- Description: Creates a function to get heatmap data with filters for date range, city, and class

-- Remove a view se ela já existir, para podermos atualizá-la.
DROP VIEW IF EXISTS public.screen_proposal_popularity;

-- Cria a view que calcula a popularidade de cada tela (versão básica)
CREATE OR REPLACE VIEW public.screen_proposal_popularity AS
SELECT
  s.id AS screen_id,
  s.lat,
  s.lng,
  s.name,
  s.city,
  s.class,
  COUNT(ps.id) AS proposal_count -- A "temperatura" da nossa tela
FROM
  public.screens AS s
JOIN
  public.proposal_screens AS ps ON s.id = ps.screen_id
WHERE
  s.lat IS NOT NULL AND s.lng IS NOT NULL -- Apenas telas com geolocalização válida
GROUP BY
  s.id, s.lat, s.lng, s.name, s.city, s.class
ORDER BY
  proposal_count DESC;

-- Função para obter dados do heatmap com filtros
CREATE OR REPLACE FUNCTION public.get_heatmap_data(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_class TEXT DEFAULT NULL,
  p_normalize BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  screen_id BIGINT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  name TEXT,
  city TEXT,
  class TEXT,
  proposal_count BIGINT,
  normalized_intensity DOUBLE PRECISION,
  total_proposals_in_period BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_proposals BIGINT;
BEGIN
  -- Calcular total de propostas no período (para normalização)
  SELECT COUNT(DISTINCT p.id)
  INTO v_total_proposals
  FROM public.proposals p
  WHERE (p_start_date IS NULL OR p.created_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR p.created_at::DATE <= p_end_date);

  -- Se não há propostas no período, retornar vazio
  IF v_total_proposals = 0 THEN
    RETURN;
  END IF;

  -- Retornar dados filtrados
  RETURN QUERY
  SELECT
    s.id AS screen_id,
    s.lat,
    s.lng,
    s.name,
    s.city,
    s.class,
    COUNT(DISTINCT ps.proposal_id) AS proposal_count,
    CASE 
      WHEN p_normalize AND v_total_proposals > 0 THEN 
        (COUNT(DISTINCT ps.proposal_id)::DOUBLE PRECISION / v_total_proposals::DOUBLE PRECISION)
      ELSE 
        COUNT(DISTINCT ps.proposal_id)::DOUBLE PRECISION
    END AS normalized_intensity,
    v_total_proposals AS total_proposals_in_period
  FROM
    public.screens AS s
  JOIN
    public.proposal_screens AS ps ON s.id = ps.screen_id
  JOIN
    public.proposals AS p ON ps.proposal_id = p.id
  WHERE
    s.lat IS NOT NULL 
    AND s.lng IS NOT NULL
    AND (p_start_date IS NULL OR p.created_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR p.created_at::DATE <= p_end_date)
    AND (p_city IS NULL OR s.city ILIKE '%' || p_city || '%')
    AND (p_class IS NULL OR s.class = p_class)
  GROUP BY
    s.id, s.lat, s.lng, s.name, s.city, s.class
  ORDER BY
    proposal_count DESC;
END;
$$;

-- Função para obter estatísticas do heatmap
CREATE OR REPLACE FUNCTION public.get_heatmap_stats(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_class TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_screens BIGINT,
  total_proposals BIGINT,
  max_intensity BIGINT,
  avg_intensity DOUBLE PRECISION,
  cities_count BIGINT,
  classes_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH heatmap_data AS (
    SELECT * FROM public.get_heatmap_data(p_start_date, p_end_date, p_city, p_class, false)
  )
  SELECT
    COUNT(*) AS total_screens,
    COALESCE(SUM(proposal_count), 0) AS total_proposals,
    COALESCE(MAX(proposal_count), 0) AS max_intensity,
    COALESCE(AVG(proposal_count), 0) AS avg_intensity,
    COUNT(DISTINCT city) AS cities_count,
    COUNT(DISTINCT class) AS classes_count
  FROM heatmap_data;
END;
$$;

-- Função para obter lista de cidades disponíveis
CREATE OR REPLACE FUNCTION public.get_available_cities(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  city TEXT,
  screen_count BIGINT,
  proposal_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.city,
    COUNT(DISTINCT s.id) AS screen_count,
    COUNT(DISTINCT ps.proposal_id) AS proposal_count
  FROM
    public.screens AS s
  JOIN
    public.proposal_screens AS ps ON s.id = ps.screen_id
  JOIN
    public.proposals AS p ON ps.proposal_id = p.id
  WHERE
    s.lat IS NOT NULL 
    AND s.lng IS NOT NULL
    AND s.city IS NOT NULL
    AND (p_start_date IS NULL OR p.created_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR p.created_at::DATE <= p_end_date)
  GROUP BY
    s.city
  ORDER BY
    proposal_count DESC;
END;
$$;

-- Função para obter lista de classes disponíveis
CREATE OR REPLACE FUNCTION public.get_available_classes(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  class TEXT,
  screen_count BIGINT,
  proposal_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.class,
    COUNT(DISTINCT s.id) AS screen_count,
    COUNT(DISTINCT ps.proposal_id) AS proposal_count
  FROM
    public.screens AS s
  JOIN
    public.proposal_screens AS ps ON s.id = ps.screen_id
  JOIN
    public.proposals AS p ON ps.proposal_id = p.id
  WHERE
    s.lat IS NOT NULL 
    AND s.lng IS NOT NULL
    AND s.class IS NOT NULL
    AND (p_start_date IS NULL OR p.created_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR p.created_at::DATE <= p_end_date)
  GROUP BY
    s.class
  ORDER BY
    proposal_count DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_heatmap_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_heatmap_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_cities TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_classes TO authenticated;

