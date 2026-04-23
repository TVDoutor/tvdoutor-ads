-- =============================================================================
-- Reaplica SECURITY INVOKER nas views que perderam a configuração
-- após DROP/RECREATE em migrations posteriores a 20260311.
--
-- Contexto:
--   * 20260311000000 já havia setado security_invoker = true
--   * 20260408000000 e 20260410110000 fizeram DROP VIEW ... CREATE VIEW
--     sem reaplicar a opção, revertendo para SECURITY DEFINER (padrão).
--
-- Esta migration é IDEMPOTENTE e NÃO altera:
--   * definição/colunas da view
--   * dados retornados
--   * grants (authenticated, anon)
--
-- Impacto funcional:
--   Nenhum para usuários autenticados. As policies de SELECT em
--   screens/screen_rates/venues são USING (true) TO authenticated, então
--   continuam retornando todos os registros como antes.
-- =============================================================================

ALTER VIEW IF EXISTS public.v_screens_enriched
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.mv_venue_farmacia_distancia
  SET (security_invoker = true);

-- -----------------------------------------------------------------------------
-- spatial_ref_sys (PostGIS): habilitar RLS somente se for o owner.
-- Em instâncias Supabase gerenciadas, essa tabela geralmente pertence a
-- supabase_admin e o comando é ignorado com segurança.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_tables t
    WHERE t.schemaname = 'public'
      AND t.tablename = 'spatial_ref_sys'
      AND t.tableowner = current_user
  ) THEN
    EXECUTE 'ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY';

    DROP POLICY IF EXISTS "Allow read spatial_ref_sys" ON public.spatial_ref_sys;
    CREATE POLICY "Allow read spatial_ref_sys"
      ON public.spatial_ref_sys
      FOR SELECT
      USING (true);
  ELSE
    RAISE NOTICE 'Skipping spatial_ref_sys RLS: current user is not the owner.';
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping spatial_ref_sys RLS (insufficient privileges).';
END $$;

-- -----------------------------------------------------------------------------
-- Verificação: logar o status atual (aparece em supabase db push)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_invoker boolean;
BEGIN
  SELECT (reloptions::text LIKE '%security_invoker=true%')
    INTO v_invoker
  FROM pg_class
  WHERE relname = 'v_screens_enriched'
    AND relnamespace = 'public'::regnamespace;

  IF v_invoker THEN
    RAISE NOTICE 'OK: v_screens_enriched agora usa SECURITY INVOKER.';
  ELSE
    RAISE WARNING 'ATENÇÃO: v_screens_enriched ainda NÃO está com security_invoker=true.';
  END IF;
END $$;
