-- Auditoria semanal: snapshot de distribuição em venues e divergência screens vs venues.
-- Agendamento no projeto Supabase (manual): após instalar pg_cron, por exemplo:
--   SELECT cron.schedule(
--     'weekly_venue_audit',
--     '0 8 * * 1',
--     $$SELECT public.run_weekly_venue_audit();$$
--   );

CREATE TABLE IF NOT EXISTS public.venue_audit_runs (
  id bigserial PRIMARY KEY,
  run_at timestamptz NOT NULL DEFAULT now(),
  total_relacionados int NOT NULL,
  diverg_restricao int NOT NULL,
  diverg_programatica int NOT NULL,
  diverg_rede int NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  notes text NULL
);

CREATE TABLE IF NOT EXISTS public.venue_audit_distribution (
  id bigserial PRIMARY KEY,
  run_id bigint NOT NULL REFERENCES public.venue_audit_runs(id) ON DELETE CASCADE,
  restricao text NOT NULL,
  programatica boolean NOT NULL,
  rede text NOT NULL,
  total int NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_venue_audit_runs_run_at ON public.venue_audit_runs(run_at DESC);
CREATE INDEX IF NOT EXISTS idx_venue_audit_distribution_run_id ON public.venue_audit_distribution(run_id);

ALTER TABLE public.venue_audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_audit_distribution ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read venue audit runs" ON public.venue_audit_runs;
CREATE POLICY "read venue audit runs"
  ON public.venue_audit_runs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "read venue audit distribution" ON public.venue_audit_distribution;
CREATE POLICY "read venue audit distribution"
  ON public.venue_audit_distribution FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "manage venue audit runs admin" ON public.venue_audit_runs;
CREATE POLICY "manage venue audit runs admin"
  ON public.venue_audit_runs FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "manage venue audit distribution admin" ON public.venue_audit_distribution;
CREATE POLICY "manage venue audit distribution admin"
  ON public.venue_audit_distribution FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin'))
  );

CREATE OR REPLACE FUNCTION public.run_weekly_venue_audit()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_div_restr int;
  v_div_prog int;
  v_div_rede int;
  v_status text;
  v_run_id bigint;
BEGIN
  SELECT
    count(*)::int,
    count(*) FILTER (WHERE coalesce(s.restricoes, 'Livre') <> coalesce(v.restricao, 'Livre'))::int,
    count(*) FILTER (WHERE coalesce(s.programatica, false) <> coalesce(v.programatica, false))::int,
    count(*) FILTER (WHERE coalesce(s.rede, 'TV Doutor') <> coalesce(v.rede, 'TV Doutor'))::int
  INTO v_total, v_div_restr, v_div_prog, v_div_rede
  FROM public.screens s
  JOIN public.venues v ON v.id = s.venue_id;

  v_status := CASE
    WHEN coalesce(v_div_restr, 0) + coalesce(v_div_prog, 0) + coalesce(v_div_rede, 0) = 0 THEN 'ok'
    ELSE 'warning'
  END;

  INSERT INTO public.venue_audit_runs (
    total_relacionados, diverg_restricao, diverg_programatica, diverg_rede, status
  )
  VALUES (
    coalesce(v_total, 0),
    coalesce(v_div_restr, 0),
    coalesce(v_div_prog, 0),
    coalesce(v_div_rede, 0),
    v_status
  )
  RETURNING id INTO v_run_id;

  INSERT INTO public.venue_audit_distribution (run_id, restricao, programatica, rede, total)
  SELECT
    v_run_id,
    coalesce(restricao, 'Livre'),
    coalesce(programatica, false),
    coalesce(rede, 'TV Doutor'),
    count(*)::int
  FROM public.venues
  GROUP BY 1, 2, 3, 4;

  RETURN v_run_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_weekly_venue_audit() TO authenticated;
