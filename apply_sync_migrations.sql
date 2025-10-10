-- ==============================================
-- SCRIPT PARA APLICAR MIGRATIONS DE SINCRONIZAÇÃO
-- ==============================================
-- Execute este script diretamente no Supabase SQL Editor
-- para aplicar as funcionalidades de sincronização automática
-- ==============================================

-- 1. CRIAR VIEW UNIFICADA PARA ESPECIALIDADES
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

-- 2. CRIAR VIEW SIMPLIFICADA PARA DASHBOARD
CREATE OR REPLACE VIEW public.v_specialties_for_dashboard AS
SELECT DISTINCT
  specialty_name,
  MAX(last_updated) as last_updated,
  COUNT(*) as total_occurrences,
  string_agg(DISTINCT source_table, ', ') as sources
FROM public.v_specialties_unified
GROUP BY specialty_name
ORDER BY specialty_name;

-- 3. PERMISSÕES DE ACESSO
GRANT SELECT ON public.v_specialties_unified TO authenticated;
GRANT SELECT ON public.v_specialties_for_dashboard TO authenticated;

-- 4. FUNÇÃO PARA SINCRONIZAÇÃO MANUAL
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

-- 5. CRIAR TABELA DE LOGS DO SISTEMA
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_system_logs_event_type ON public.system_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_table_name ON public.system_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_screens_specialty_gin ON public.screens USING GIN (specialty);
CREATE INDEX IF NOT EXISTS idx_screens_staging_especialidades ON public.screens (staging_especialidades) WHERE staging_especialidades IS NOT NULL;

-- 7. FUNÇÃO PARA NOTIFICAR MUDANÇAS
CREATE OR REPLACE FUNCTION public.notify_specialties_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_type TEXT;
  specialty_data JSONB;
BEGIN
  -- Determinar tipo de evento
  IF TG_OP = 'DELETE' THEN
    event_type := 'DELETE';
    specialty_data := to_jsonb(OLD);
  ELSE
    event_type := TG_OP;
    specialty_data := to_jsonb(NEW);
  END IF;

  -- Notificar via WebSocket/Channel
  PERFORM pg_notify(
    'specialties_changes',
    json_build_object(
      'event_type', event_type,
      'table_name', TG_TABLE_NAME,
      'data', specialty_data,
      'timestamp', now()
    )::text
  );

  -- Log para debugging
  INSERT INTO public.system_logs (
    event_type,
    table_name,
    operation,
    data,
    created_at
  ) VALUES (
    'specialties_sync',
    TG_TABLE_NAME,
    TG_OP,
    specialty_data,
    now()
  );

  -- Retornar apropriadamente baseado na operação
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- 8. CRIAR TRIGGER PARA SINCRONIZAÇÃO
DROP TRIGGER IF EXISTS trigger_screens_specialties_sync ON public.screens;

CREATE TRIGGER trigger_screens_specialties_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.screens
  FOR EACH ROW
  WHEN (
    -- Só disparar se a coluna specialty foi alterada
    (TG_OP = 'INSERT' AND NEW.specialty IS NOT NULL) OR
    (TG_OP = 'UPDATE' AND (
      OLD.specialty IS DISTINCT FROM NEW.specialty OR
      OLD.staging_especialidades IS DISTINCT FROM NEW.staging_especialidades
    )) OR
    (TG_OP = 'DELETE' AND OLD.specialty IS NOT NULL)
  )
  EXECUTE FUNCTION public.notify_specialties_changes();

-- 9. FUNÇÃO PARA SINCRONIZAÇÃO EM LOTE
CREATE OR REPLACE FUNCTION public.batch_sync_specialties()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_time TIMESTAMP := now();
BEGIN
  -- Forçar refresh das views
  REFRESH MATERIALIZED VIEW IF EXISTS public.v_specialties_unified;
  
  -- Notificar mudança em lote
  PERFORM pg_notify(
    'specialties_changes',
    json_build_object(
      'event_type', 'BATCH_SYNC',
      'table_name', 'all_tables',
      'message', 'Batch synchronization completed',
      'timestamp', now()
    )::text
  );

  -- Log da operação
  INSERT INTO public.system_logs (
    event_type,
    table_name,
    operation,
    data,
    created_at
  ) VALUES (
    'specialties_batch_sync',
    'all_tables',
    'BATCH_SYNC',
    json_build_object('start_time', start_time, 'end_time', now()),
    now()
  );

  RETURN 'Sincronização em lote concluída em: ' || (now() - start_time);
END;
$$;

-- 10. PERMISSÕES FINAIS
GRANT SELECT ON public.system_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_specialties_changes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_sync_specialties() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_specialties_views() TO authenticated;

-- 11. TESTE INICIAL
SELECT 'Views de especialidades criadas com sucesso!' as resultado;
SELECT COUNT(*) as total_especialidades FROM public.v_specialties_for_dashboard;
