-- ==============================================
-- MIGRAÇÃO: TRIGGERS AUTOMÁTICOS PARA SINCRONIZAÇÃO
-- ==============================================
-- Objetivo: Criar triggers que notificam mudanças nas especialidades
-- e invalidam cache automaticamente
-- ==============================================

-- 1. FUNÇÃO PARA NOTIFICAR MUDANÇAS EM ESPECIALIDADES
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

-- 2. CRIAR TABELA DE LOGS DO SISTEMA (se não existir)
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_system_logs_event_type ON public.system_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_table_name ON public.system_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at);

-- 3. TRIGGERS PARA A TABELA SCREENS
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

-- 4. TRIGGER PARA A VIEW ENRICHED (se ela for materializada)
-- Nota: Views normais não suportam triggers, mas podemos criar triggers
-- nas tabelas base que alimentam a view

-- 5. FUNÇÃO PARA SINCRONIZAÇÃO EM LOTE (para migrações grandes)
CREATE OR REPLACE FUNCTION public.batch_sync_specialties()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sync_count INTEGER := 0;
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

-- 6. FUNÇÃO PARA LIMPEZA DE LOGS ANTIGOS (manutenção)
CREATE OR REPLACE FUNCTION public.cleanup_specialties_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.system_logs 
  WHERE event_type LIKE '%specialties%' 
    AND created_at < (now() - (days_to_keep || ' days')::interval);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- 7. FUNÇÃO PARA ESTATÍSTICAS DE SINCRONIZAÇÃO
CREATE OR REPLACE FUNCTION public.get_specialties_sync_stats()
RETURNS TABLE (
  total_events BIGINT,
  events_last_24h BIGINT,
  events_last_week BIGINT,
  last_sync TIMESTAMP WITH TIME ZONE,
  sync_errors BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours') as events_last_24h,
    COUNT(*) FILTER (WHERE created_at > now() - interval '7 days') as events_last_week,
    MAX(created_at) as last_sync,
    COUNT(*) FILTER (WHERE operation = 'ERROR') as sync_errors
  FROM public.system_logs 
  WHERE event_type LIKE '%specialties%';
END;
$$;

-- 8. PERMISSÕES
GRANT SELECT ON public.system_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_specialties_changes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_sync_specialties() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_specialties_logs(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_specialties_sync_stats() TO authenticated;

-- 9. COMENTÁRIOS
COMMENT ON FUNCTION public.notify_specialties_changes() IS 
'Função trigger que notifica mudanças em especialidades via WebSocket e logs';

COMMENT ON FUNCTION public.batch_sync_specialties() IS 
'Função para sincronização em lote de especialidades (útil para migrações)';

COMMENT ON FUNCTION public.cleanup_specialties_logs(INTEGER) IS 
'Função para limpeza de logs antigos de sincronização';

COMMENT ON FUNCTION public.get_specialties_sync_stats() IS 
'Função para obter estatísticas de sincronização de especialidades';

-- 10. LOG DE SUCESSO
SELECT 'Triggers de sincronização automática criados com sucesso!' as resultado;
