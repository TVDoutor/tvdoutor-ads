-- ===============================
-- COMPREHENSIVE FIX: Holidays permissions, SECURITY DEFINER functions, and sequence grants
-- Date: 2025-09-02
-- ===============================

BEGIN;

-- ===============================
-- 1. HOLIDAYS TABLE: Permissions and RLS
-- ===============================

-- Garantir que a tabela holidays existe (já deve existir da migração anterior)
-- Permissão de leitura para usuários autenticados
GRANT SELECT ON TABLE public.holidays TO authenticated;

-- Habilitar RLS na tabela holidays
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes que possam estar conflitando
DROP POLICY IF EXISTS "holidays_read_all" ON public.holidays;
DROP POLICY IF EXISTS "holidays_admin_write" ON public.holidays;
DROP POLICY IF EXISTS "holidays_admin_insert" ON public.holidays;
DROP POLICY IF EXISTS "holidays_admin_update" ON public.holidays;
DROP POLICY IF EXISTS "holidays_admin_delete" ON public.holidays;
DROP POLICY IF EXISTS "sel_holidays_authenticated" ON public.holidays;

-- Política de SELECT: qualquer usuário autenticado pode ler feriados
CREATE POLICY "sel_holidays_authenticated"
ON public.holidays
FOR SELECT
TO authenticated
USING (true);

-- Políticas de modificação: apenas admins podem gerenciar feriados
CREATE POLICY "holidays_admin_insert"
ON public.holidays
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "holidays_admin_update"
ON public.holidays
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "holidays_admin_delete"
ON public.holidays
FOR DELETE
TO authenticated
USING (is_admin());

-- ===============================
-- 2. FUNÇÕES COM SECURITY DEFINER
-- (para quando forem chamadas por triggers)
-- ===============================

-- business_days_between: Atualizar para SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.business_days_between(p_start date, p_end date)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d int := 0;
BEGIN
  IF p_start IS NULL OR p_end IS NULL OR p_end < p_start THEN
    RETURN 0;
  END IF;

  WITH days AS (
    SELECT dd::date AS d
    FROM generate_series(p_start, p_end, interval '1 day') dd
  )
  SELECT COUNT(*)
    INTO d
  FROM days
  LEFT JOIN public.holidays h
    ON h.day = days.d AND h.scope = 'national'
  WHERE EXTRACT(DOW FROM days.d) NOT IN (0,6)
    AND h.id IS NULL;

  RETURN d;
END$$;

-- resolve_effective_cpm: Atualizar para SECURITY DEFINER (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposal_screens' AND table_schema = 'public') THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION public.resolve_effective_cpm(p_proposal_id bigint)
    RETURNS numeric
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
      WITH base AS (
        SELECT
          p.cpm_mode, p.cpm_value, ps.custom_cpm,
          COALESCE(sr.cpm, pr.cpm) AS cpm_rule,
          COALESCE(vam.audience, 0)::numeric AS weight
        FROM public.proposals p
        JOIN public.proposal_screens ps ON ps.proposal_id = p.id
        JOIN public.screens s ON s.id = ps.screen_id
        LEFT JOIN public.screen_rates sr ON sr.screen_id = s.id
        LEFT JOIN public.price_rules pr ON pr.screen_id = s.id
        LEFT JOIN public.venue_audience_monthly vam ON vam.venue_id = s.venue_id
        WHERE p.id = p_proposal_id
      ),
      aggregated AS (
        SELECT 
          MAX(cpm_mode) as cpm_mode,
          MAX(cpm_value) as cpm_value,
          SUM(COALESCE(custom_cpm, cpm_rule, cpm_value) * NULLIF(weight,0)) as weighted_sum,
          SUM(NULLIF(weight,0)) as total_weight
        FROM base
      )
      SELECT CASE
               WHEN cpm_mode = ''manual'' THEN cpm_value
               ELSE NULLIF(weighted_sum / NULLIF(total_weight,0), 0)
             END
      FROM aggregated;
    $func$';

    EXECUTE 'CREATE OR REPLACE FUNCTION public.recalc_proposal_kpis(p_proposal_id bigint)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    DECLARE
      v_days_calendar int;
      v_days_business int;
      v_cpm numeric;
      v_insertions int;
      v_formula text;
      v_disc_pct numeric;
      v_disc_fixed numeric;
      v_impacts_day numeric := 0;
      v_impacts_calendar numeric;
      v_impacts_business numeric;
      v_gross_calendar numeric;
      v_gross_business numeric;
      v_net_calendar numeric;
      v_net_business numeric;
    BEGIN
      SELECT
        GREATEST(1, (end_date - start_date) + 1),
        public.business_days_between(start_date, end_date),
        COALESCE(public.resolve_effective_cpm(id), cpm_value),
        COALESCE(insertions_per_hour, 6),
        COALESCE(impact_formula, ''A''),
        COALESCE(discount_pct, 0),
        COALESCE(discount_fixed, 0)
      INTO
        v_days_calendar, v_days_business, v_cpm, v_insertions, v_formula, v_disc_pct, v_disc_fixed
      FROM public.proposals WHERE id = p_proposal_id;

      WITH per_screen AS (
        SELECT
          COALESCE(ps.daily_traffic_override, vam.audience, 0)::numeric AS daily_traffic,
          COALESCE(ps.hours_on_override,
                   NULLIF(s.screen_end_time,'''')::int - NULLIF(s.screen_start_time,'''')::int,
                   10) AS hours_on
        FROM public.proposal_screens ps
        JOIN public.screens s ON s.id = ps.screen_id
        LEFT JOIN public.venue_audience_monthly vam ON vam.venue_id = s.venue_id
        WHERE ps.proposal_id = p_proposal_id
      )
      SELECT
        COALESCE(SUM(daily_traffic * v_insertions *
          CASE WHEN v_formula = ''A'' THEN 1 ELSE hours_on END), 0)
      INTO v_impacts_day
      FROM per_screen;

      v_impacts_calendar := v_impacts_day * COALESCE(v_days_calendar, 0);
      v_impacts_business := v_impacts_day * COALESCE(v_days_business, 0);

      v_gross_calendar := ROUND((v_impacts_calendar / 1000.0) * COALESCE(v_cpm,0), 2);
      v_gross_business := ROUND((v_impacts_business / 1000.0) * COALESCE(v_cpm,0), 2);

      v_net_calendar := GREATEST(v_gross_calendar - (v_gross_calendar * v_disc_pct/100.0) - v_disc_fixed, 0);
      v_net_business := GREATEST(v_gross_business - (v_gross_business * v_disc_pct/100.0) - v_disc_fixed, 0);

      UPDATE public.proposals
      SET
        days_calendar     = v_days_calendar,
        days_business     = v_days_business,
        impacts_calendar  = v_impacts_calendar,
        impacts_business  = v_impacts_business,
        gross_calendar    = v_gross_calendar,
        gross_business    = v_gross_business,
        net_calendar      = v_net_calendar,
        net_business      = v_net_business,
        updated_at        = now()
      WHERE id = p_proposal_id;
    END
    $func$';
  END IF;
END $$;

-- ===============================
-- 3. GRANTS ADICIONAIS EM SEQUENCES
-- (para evitar novos 403 em inserts)
-- ===============================

DO $$
BEGIN
  -- proposals_id_seq
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'proposals_id_seq' AND relkind = 'S') THEN
    EXECUTE 'GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.proposals_id_seq TO authenticated';
  END IF;
  
  -- proposal_screens_id_seq
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'proposal_screens_id_seq' AND relkind = 'S') THEN
    EXECUTE 'GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.proposal_screens_id_seq TO authenticated';
  END IF;
  
  -- holidays_id_seq (caso exista)
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'holidays_id_seq' AND relkind = 'S') THEN
    EXECUTE 'GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.holidays_id_seq TO authenticated';
  END IF;
  
  -- Outras sequences que podem ser necessárias para o sistema de propostas
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'campaigns_id_seq' AND relkind = 'S') THEN
    EXECUTE 'GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.campaigns_id_seq TO authenticated';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'campaign_screens_id_seq' AND relkind = 'S') THEN
    EXECUTE 'GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.campaign_screens_id_seq TO authenticated';
  END IF;
END$$;

-- ===============================
-- 4. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ===============================

COMMENT ON POLICY "sel_holidays_authenticated" ON public.holidays IS 
'Permite que qualquer usuário autenticado leia a tabela holidays (feriados são dados públicos)';

COMMENT ON FUNCTION public.business_days_between(date, date) IS 
'Calcula dias úteis entre duas datas, excluindo fins de semana e feriados nacionais. SECURITY DEFINER para uso em triggers.';

-- Add comments only if functions exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'resolve_effective_cpm' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    EXECUTE 'COMMENT ON FUNCTION public.resolve_effective_cpm(bigint) IS ''Resolve o CPM efetivo de uma proposta baseado no modo (manual/blended). SECURITY DEFINER para uso em triggers.''';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'recalc_proposal_kpis' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    EXECUTE 'COMMENT ON FUNCTION public.recalc_proposal_kpis(bigint) IS ''Recalcula todos os KPIs de uma proposta (dias, impactos, valores). SECURITY DEFINER para uso em triggers.''';
  END IF;
END $$;

COMMIT;
