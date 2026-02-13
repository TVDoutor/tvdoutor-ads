-- ==============================================
-- MIGRAÇÃO: VIEW UNIFICADA PARA ESPECIALIDADES
-- ==============================================
-- Objetivo: Criar uma fonte única de verdade para especialidades
-- que sincroniza automaticamente entre inventory e dashboard
-- ==============================================

-- 1. CRIAR VIEW UNIFICADA PARA ESPECIALIDADES
-- Esta view consolida especialidades de todas as fontes
CREATE OR REPLACE VIEW public.v_specialties_unified AS
WITH specialties_from_screens AS (
  SELECT DISTINCT 
    unnest(specialty) as specialty_name,
    'screens' as source_table,
    id as source_id,
    updated_at,
    created_at
  FROM public.screens 
  WHERE specialty IS NOT NULL 
    AND array_length(specialty, 1) > 0
),
specialties_from_enriched AS (
  SELECT DISTINCT 
    unnest(specialty) as specialty_name,
    'v_screens_enriched' as source_table,
    id as source_id,
    updated_at,
    created_at
  FROM public.v_screens_enriched 
  WHERE specialty IS NOT NULL 
    AND array_length(specialty, 1) > 0
),
specialties_from_staging AS (
  SELECT DISTINCT 
    TRIM(unnest(string_to_array(staging_especialidades, ','))) as specialty_name,
    'staging' as source_table,
    id as source_id,
    updated_at,
    created_at
  FROM public.v_screens_enriched 
  WHERE staging_especialidades IS NOT NULL 
    AND staging_especialidades != ''
)
SELECT 
  TRIM(specialty_name) as specialty_name,
  source_table,
  source_id,
  MAX(updated_at) as last_updated,
  MIN(created_at) as first_seen,
  COUNT(*) as usage_count
FROM (
  SELECT * FROM specialties_from_screens
  UNION ALL
  SELECT * FROM specialties_from_enriched  
  UNION ALL
  SELECT * FROM specialties_from_staging
) all_specialties
WHERE TRIM(specialty_name) != ''
GROUP BY TRIM(specialty_name), source_table, source_id;

-- 2. CRIAR VIEW SIMPLIFICADA PARA USO NO DASHBOARD
-- Esta view retorna apenas as especialidades únicas para dropdowns
CREATE OR REPLACE VIEW public.v_specialties_for_dashboard AS
SELECT DISTINCT
  specialty_name,
  MAX(last_updated) as last_updated,
  COUNT(*) as total_occurrences,
  string_agg(DISTINCT source_table, ', ') as sources
FROM public.v_specialties_unified
GROUP BY specialty_name
ORDER BY specialty_name;

-- 3. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON VIEW public.v_specialties_unified IS 
'View unificada que consolida todas as especialidades do sistema. 
Atualizada automaticamente quando dados são modificados nas tabelas origem.';

COMMENT ON VIEW public.v_specialties_for_dashboard IS 
'View simplificada para uso em dropdowns e interfaces do dashboard.
Retorna especialidades únicas com informações de uso e fontes.';

-- 4. PERMISSÕES DE ACESSO
GRANT SELECT ON public.v_specialties_unified TO authenticated;
GRANT SELECT ON public.v_specialties_for_dashboard TO authenticated;

-- 5. CRIAR FUNÇÃO PARA SINCRONIZAÇÃO MANUAL (FALLBACK)
CREATE OR REPLACE FUNCTION public.refresh_specialties_views()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Forçar refresh das views
  REFRESH MATERIALIZED VIEW IF EXISTS public.v_specialties_unified;
  
  RETURN 'Views de especialidades atualizadas com sucesso em: ' || now();
END;
$$;

COMMENT ON FUNCTION public.refresh_specialties_views() IS 
'Função para forçar atualização das views de especialidades. 
Útil para sincronização manual quando necessário.';

-- 6. CRIAR ÍNDICES PARA PERFORMANCE
-- Índice na tabela screens para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_screens_specialty_gin 
ON public.screens USING GIN (specialty);

-- Índice na coluna staging_especialidades se existir
CREATE INDEX IF NOT EXISTS idx_screens_staging_especialidades 
ON public.screens (staging_especialidades) 
WHERE staging_especialidades IS NOT NULL;

-- 7. LOG DE SUCESSO
SELECT 'View unificada de especialidades criada com sucesso!' as resultado;
