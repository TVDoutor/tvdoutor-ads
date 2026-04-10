-- RPC usada por ImpactModelsService.getUsageStats (evita 404 PGRST202 no PostgREST)

CREATE OR REPLACE FUNCTION public.get_impact_model_usage_stats()
RETURNS TABLE (
  formula_id INTEGER,
  formula_name TEXT,
  usage_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores';
  END IF;

  RETURN QUERY
  SELECT
    im.id::INTEGER,
    im.name::TEXT,
    COALESCE(sub.cnt, 0)::BIGINT
  FROM public.impact_models im
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT AS cnt
    FROM public.proposals p
    WHERE p.impact_formula IS NOT NULL
      AND TRIM(p.impact_formula::TEXT) <> ''
      AND (
        TRIM(p.impact_formula::TEXT) = TRIM(SUBSTRING(im.name FROM 'Fórmula (.+)$'))
        OR (
          p.impact_formula::TEXT ~ '^[0-9]+$'
          AND (p.impact_formula::INTEGER) = im.id
        )
      )
  ) sub ON TRUE
  ORDER BY im.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_impact_model_usage_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_impact_model_usage_stats() TO authenticated;

COMMENT ON FUNCTION public.get_impact_model_usage_stats() IS
  'Contagem de propostas por modelo de impacto (admin); alinha impact_formula (A–J ou id) ao nome Fórmula X.';
