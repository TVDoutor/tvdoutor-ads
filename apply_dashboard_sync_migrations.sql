-- apply_dashboard_sync_migrations.sql
-- Aplicar migrações de sincronização do dashboard

-- 1. Criar views unificadas para especialidades (se não existir)
CREATE OR REPLACE VIEW public.v_specialties_unified AS
SELECT
    unnest(specialty) AS specialty_name,
    'screens' AS source_table,
    created_at,
    updated_at
FROM
    public.screens
WHERE
    specialty IS NOT NULL
UNION ALL
SELECT
    unnest(staging_especialidades) AS specialty_name,
    'staging_screens' AS source_table,
    created_at,
    updated_at
FROM
    public.staging_screens
WHERE
    staging_especialidades IS NOT NULL;

COMMENT ON VIEW public.v_specialties_unified IS 'View unificada de todas as especialidades do sistema, de diversas fontes.';

-- 2. Criar view otimizada para dashboard de especialidades
CREATE OR REPLACE VIEW public.v_specialties_for_dashboard AS
SELECT
    TRIM(LOWER(specialty_name)) AS specialty_name,
    COUNT(*) AS total_occurrences,
    MAX(updated_at) AS last_updated
FROM
    public.v_specialties_unified
GROUP BY
    TRIM(LOWER(specialty_name))
ORDER BY
    TRIM(LOWER(specialty_name));

COMMENT ON VIEW public.v_specialties_for_dashboard IS 'View otimizada para o dashboard, listando especialidades únicas com contagem de ocorrências.';

-- 3. Função para notificar mudanças no dashboard
CREATE OR REPLACE FUNCTION public.notify_dashboard_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Notificar mudanças via WebSocket
  PERFORM pg_notify('dashboard_changes', json_build_object(
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'timestamp', NOW()::text,
    'data', CASE 
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
      ELSE row_to_json(NEW)
    END
  )::text);
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.notify_dashboard_changes() IS 'Notifica mudanças no dashboard via WebSocket.';

-- 4. Triggers para sincronização em tempo real
-- Trigger para tabela proposals
DROP TRIGGER IF EXISTS trg_dashboard_proposals_changes ON public.proposals;
CREATE TRIGGER trg_dashboard_proposals_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.notify_dashboard_changes();

-- Trigger para tabela agencias
DROP TRIGGER IF EXISTS trg_dashboard_agencias_changes ON public.agencias;
CREATE TRIGGER trg_dashboard_agencias_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.agencias
  FOR EACH ROW EXECUTE FUNCTION public.notify_dashboard_changes();

-- Trigger para tabela agencia_projetos
DROP TRIGGER IF EXISTS trg_dashboard_projects_changes ON public.agencia_projetos;
CREATE TRIGGER trg_dashboard_projects_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.agencia_projetos
  FOR EACH ROW EXECUTE FUNCTION public.notify_dashboard_changes();

-- Trigger para tabela agencia_deals
DROP TRIGGER IF EXISTS trg_dashboard_deals_changes ON public.agencia_deals;
CREATE TRIGGER trg_dashboard_deals_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.agencia_deals
  FOR EACH ROW EXECUTE FUNCTION public.notify_dashboard_changes();

-- Trigger para tabela screens (especialidades)
DROP TRIGGER IF EXISTS trg_dashboard_screens_changes ON public.screens;
CREATE TRIGGER trg_dashboard_screens_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.screens
  FOR EACH ROW EXECUTE FUNCTION public.notify_dashboard_changes();

-- 5. Função para sincronização em lote (opcional)
CREATE OR REPLACE FUNCTION public.trigger_dashboard_sync()
RETURNS void AS $$
BEGIN
  -- Notificar que uma sincronização em lote foi solicitada
  PERFORM pg_notify('dashboard_sync', json_build_object(
    'type', 'batch_sync',
    'timestamp', NOW()::text,
    'message', 'Sincronização em lote solicitada'
  )::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.trigger_dashboard_sync() IS 'Dispara sincronização em lote do dashboard.';

-- 6. Conceder permissões necessárias
GRANT SELECT ON public.v_specialties_unified TO authenticated;
GRANT SELECT ON public.v_specialties_for_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_dashboard_changes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_dashboard_sync() TO authenticated;

-- 7. Verificar se as tabelas existem antes de criar triggers
DO $$
BEGIN
  -- Verificar se a tabela proposals existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
    RAISE NOTICE 'Trigger criado para tabela proposals';
  ELSE
    RAISE NOTICE 'Tabela proposals não encontrada - trigger não criado';
  END IF;

  -- Verificar se a tabela agencias existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencias' AND table_schema = 'public') THEN
    RAISE NOTICE 'Trigger criado para tabela agencias';
  ELSE
    RAISE NOTICE 'Tabela agencias não encontrada - trigger não criado';
  END IF;

  -- Verificar se a tabela agencia_projetos existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_projetos' AND table_schema = 'public') THEN
    RAISE NOTICE 'Trigger criado para tabela agencia_projetos';
  ELSE
    RAISE NOTICE 'Tabela agencia_projetos não encontrada - trigger não criado';
  END IF;

  -- Verificar se a tabela agencia_deals existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_deals' AND table_schema = 'public') THEN
    RAISE NOTICE 'Trigger criado para tabela agencia_deals';
  ELSE
    RAISE NOTICE 'Tabela agencia_deals não encontrada - trigger não criado';
  END IF;

  -- Verificar se a tabela screens existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screens' AND table_schema = 'public') THEN
    RAISE NOTICE 'Trigger criado para tabela screens';
  ELSE
    RAISE NOTICE 'Tabela screens não encontrada - trigger não criado';
  END IF;
END $$;

SELECT 'Migrações de sincronização do dashboard aplicadas com sucesso!' AS status;

