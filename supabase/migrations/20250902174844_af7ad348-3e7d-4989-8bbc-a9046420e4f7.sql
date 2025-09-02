
BEGIN;

-- 1) PROPOSALS: parâmetros e métricas (corridos + úteis)
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS proposal_type text
    CHECK (proposal_type IN ('avulsa','projeto')) DEFAULT 'avulsa',
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS insertions_per_hour int CHECK (insertions_per_hour BETWEEN 1 AND 12) DEFAULT 6,
  ADD COLUMN IF NOT EXISTS film_seconds int CHECK (film_seconds > 0) DEFAULT 15,
  ADD COLUMN IF NOT EXISTS impact_formula text
    CHECK (impact_formula IN ('A','B')) DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS cpm_mode text
    CHECK (cpm_mode IN ('manual','blended')) DEFAULT 'blended',
  ADD COLUMN IF NOT EXISTS cpm_value numeric,
  ADD COLUMN IF NOT EXISTS discount_pct numeric
    CHECK (discount_pct >= 0 AND discount_pct <= 100) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_fixed numeric
    CHECK (discount_fixed >= 0) DEFAULT 0,

  ADD COLUMN IF NOT EXISTS days_calendar int,
  ADD COLUMN IF NOT EXISTS days_business int,
  ADD COLUMN IF NOT EXISTS impacts_calendar numeric,
  ADD COLUMN IF NOT EXISTS impacts_business numeric,
  ADD COLUMN IF NOT EXISTS gross_calendar numeric,
  ADD COLUMN IF NOT EXISTS gross_business numeric,
  ADD COLUMN IF NOT EXISTS net_calendar numeric,
  ADD COLUMN IF NOT EXISTS net_business numeric;

CREATE INDEX IF NOT EXISTS idx_proposals_period ON public.proposals (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_proposals_type   ON public.proposals (proposal_type);

-- 2) PROPOSAL_SCREENS: overrides por tela
ALTER TABLE public.proposal_screens
  ADD COLUMN IF NOT EXISTS custom_cpm numeric,
  ADD COLUMN IF NOT EXISTS hours_on_override int,
  ADD COLUMN IF NOT EXISTS daily_traffic_override numeric;

CREATE INDEX IF NOT EXISTS idx_proposal_screens_proposal ON public.proposal_screens (proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_screens_screen   ON public.proposal_screens (screen_id);

-- 3) HOLIDAYS: feriados (sem seed nesta etapa)
CREATE TABLE IF NOT EXISTS public.holidays (
  id bigserial PRIMARY KEY,
  day date NOT NULL,
  name text,
  scope text DEFAULT 'national', -- national|state|city
  state text,
  city text
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_holidays_day_scope
  ON public.holidays (day, scope, state, city);

-- 4) VIEWS
CREATE OR REPLACE VIEW public.proposal_locales AS
SELECT DISTINCT
  ps.proposal_id,
  s.city,
  s.state
FROM public.proposal_screens ps
JOIN public.screens s ON s.id = ps.screen_id;

CREATE OR REPLACE VIEW public.proposal_kpis AS
WITH eff AS (
  SELECT
    p.id AS proposal_id,
    p.cpm_mode, p.cpm_value,
    NULLIF(
      SUM( COALESCE(ps.custom_cpm, sr.cpm, pr.cpm, p.cpm_value, 0)
           * COALESCE(vam.audience, 0) ) OVER (PARTITION BY p.id), 0
    ) /
    NULLIF(SUM(COALESCE(vam.audience,0)) OVER (PARTITION BY p.id), 0) AS blended_cpm
  FROM public.proposals p
  JOIN public.proposal_screens ps ON ps.proposal_id = p.id
  JOIN public.screens s ON s.id = ps.screen_id
  LEFT JOIN public.screen_rates sr ON sr.screen_id = s.id
  LEFT JOIN public.price_rules pr ON pr.screen_id = s.id
  LEFT JOIN public.venue_audience_monthly vam ON vam.venue_id = s.venue_id
)
, uniq AS (
  SELECT DISTINCT ON (proposal_id)
    proposal_id,
    CASE WHEN cpm_mode='manual' THEN cpm_value ELSE COALESCE(blended_cpm, cpm_value) END AS effective_cpm
  FROM eff
)
SELECT
  p.id AS proposal_id,
  uniq.effective_cpm,
  p.days_calendar, p.days_business,
  p.impacts_calendar, p.impacts_business,
  p.gross_calendar, p.gross_business,
  p.net_calendar, p.net_business
FROM public.proposals p
LEFT JOIN uniq ON uniq.proposal_id = p.id;

-- 5) FUNÇÕES (dias úteis, CPM efetivo, recálculo)
CREATE OR REPLACE FUNCTION public.business_days_between(p_start date, p_end date)
RETURNS int
LANGUAGE plpgsql AS $$
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
  WHERE EXTRACT(DOW FROM days.d) NOT IN (0,6) AND h.id IS NULL;

  RETURN d;
END$$;

CREATE OR REPLACE FUNCTION public.resolve_effective_cpm(p_proposal_id bigint)
RETURNS numeric
LANGUAGE sql AS $$
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
           WHEN cpm_mode = 'manual' THEN cpm_value
           ELSE NULLIF(weighted_sum / NULLIF(total_weight,0), 0)
         END
  FROM aggregated;
$$;

CREATE OR REPLACE FUNCTION public.recalc_proposal_kpis(p_proposal_id bigint)
RETURNS void
LANGUAGE plpgsql AS $$
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
    COALESCE(impact_formula, 'A'),
    COALESCE(discount_pct, 0),
    COALESCE(discount_fixed, 0)
  INTO
    v_days_calendar, v_days_business, v_cpm, v_insertions, v_formula, v_disc_pct, v_disc_fixed
  FROM public.proposals WHERE id = p_proposal_id;

  WITH per_screen AS (
    SELECT
      COALESCE(ps.daily_traffic_override, vam.audience, 0)::numeric AS daily_traffic,
      COALESCE(ps.hours_on_override,
               NULLIF(s.screen_end_time,'')::int - NULLIF(s.screen_start_time,'')::int,
               10) AS hours_on
    FROM public.proposal_screens ps
    JOIN public.screens s ON s.id = ps.screen_id
    LEFT JOIN public.venue_audience_monthly vam ON vam.venue_id = s.venue_id
    WHERE ps.proposal_id = p_proposal_id
  )
  SELECT
    COALESCE(SUM(daily_traffic * v_insertions *
      CASE WHEN v_formula = 'A' THEN 1 ELSE hours_on END), 0)
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
END$$;

-- 6) TRIGGERS
CREATE OR REPLACE FUNCTION public.trg_proposals_recalc()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.recalc_proposal_kpis(NEW.id);
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS proposals_recalc ON public.proposals;
CREATE TRIGGER proposals_recalc
AFTER INSERT OR UPDATE OF start_date, end_date, insertions_per_hour, film_seconds,
                         impact_formula, cpm_mode, cpm_value, discount_pct, discount_fixed
ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.trg_proposals_recalc();

CREATE OR REPLACE FUNCTION public.trg_proposal_screens_recalc()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_prop bigint; BEGIN
  v_prop := COALESCE(NEW.proposal_id, OLD.proposal_id);
  IF v_prop IS NOT NULL THEN
    PERFORM public.recalc_proposal_kpis(v_prop);
  END IF;
  RETURN COALESCE(NEW, OLD);
END$$;

DROP TRIGGER IF EXISTS proposal_screens_recalc ON public.proposal_screens;
CREATE TRIGGER proposal_screens_recalc
AFTER INSERT OR UPDATE OF custom_cpm, hours_on_override, daily_traffic_override
      OR DELETE
ON public.proposal_screens
FOR EACH ROW EXECUTE FUNCTION public.trg_proposal_screens_recalc();

-- 7) ÍNDICE ESPACIAL PARA O MAPA (se faltar)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='screens_geom_gix'
  ) THEN
    EXECUTE 'CREATE INDEX screens_geom_gix ON public.screens USING GIST (geom)';
  END IF;
END$$;

COMMIT;
