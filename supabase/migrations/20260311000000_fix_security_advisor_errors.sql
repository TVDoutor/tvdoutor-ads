-- =============================================================================
-- Correção dos erros do Security Advisor (Supabase)
-- 1. Views com SECURITY DEFINER -> SECURITY INVOKER
-- 2. RLS desabilitado em spatial_ref_sys (PostGIS)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. mv_venue_farmacia_distancia: usar SECURITY INVOKER
-- As permissões e RLS das tabelas subjacentes (venues, farmacias) passam a
-- ser aplicadas ao usuário que consulta a view.
-- -----------------------------------------------------------------------------
ALTER VIEW IF EXISTS public.mv_venue_farmacia_distancia
  SET (security_invoker = true);

-- -----------------------------------------------------------------------------
-- 2. v_screens_enriched: usar SECURITY INVOKER
-- As permissões e RLS das tabelas subjacentes (screens, screen_rates) passam
-- a ser aplicadas ao usuário que consulta a view.
-- -----------------------------------------------------------------------------
ALTER VIEW IF EXISTS public.v_screens_enriched
  SET (security_invoker = true);

-- -----------------------------------------------------------------------------
-- 3. spatial_ref_sys: habilitar RLS (tabela PostGIS de referência)
-- A tabela contém definições de sistemas de coordenadas (SRID). É dados de
-- referência somente leitura. O PostGIS pode criar em public ou extensions.
-- Só altera se existir em public (conforme reportado pelo Security Advisor).
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'spatial_ref_sys'
  ) AND EXISTS (
    SELECT 1
    FROM pg_catalog.pg_tables t
    WHERE t.schemaname = 'public'
      AND t.tablename = 'spatial_ref_sys'
      AND t.tableowner = current_user
  ) THEN
    ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow read spatial_ref_sys" ON public.spatial_ref_sys;
    CREATE POLICY "Allow read spatial_ref_sys"
      ON public.spatial_ref_sys
      FOR SELECT
      USING (true);
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping spatial_ref_sys RLS changes (insufficient privileges for current user).';
END $$;
