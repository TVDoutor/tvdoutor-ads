-- Professionalize venues fields: restricao, programatica, rede + admin catalogs.

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS restricao text NOT NULL DEFAULT 'Livre',
  ADD COLUMN IF NOT EXISTS programatica boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rede text;

ALTER TABLE public.screens
  ADD COLUMN IF NOT EXISTS rede text;

-- Drop dependent view before changing screens.programatica type.
DROP VIEW IF EXISTS public.v_screens_enriched CASCADE;

-- Normalize + cast only when column is still text (safe if already boolean).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'screens'
      AND column_name = 'programatica'
      AND data_type IN ('text', 'character varying')
  ) THEN
    UPDATE public.screens
    SET programatica = CASE
      WHEN lower(trim(programatica::text)) IN ('sim', 's', 'true', '1', 'yes') THEN 'true'
      WHEN lower(trim(programatica::text)) IN ('nao', 'não', 'n', 'false', '0', 'no') THEN 'false'
      ELSE NULL
    END
    WHERE programatica IS NOT NULL;

    ALTER TABLE public.screens
      ALTER COLUMN programatica TYPE boolean
      USING CASE
        WHEN programatica IS NULL THEN NULL
        WHEN lower(trim(programatica::text)) IN ('true', 't', '1') THEN true
        WHEN lower(trim(programatica::text)) IN ('false', 'f', '0') THEN false
        ELSE NULL
      END;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.venue_restrictions (
  id bigserial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.venue_networks (
  id bigserial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.venue_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_networks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read venue restrictions" ON public.venue_restrictions;
CREATE POLICY "Authenticated users can read venue restrictions"
  ON public.venue_restrictions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can read venue networks" ON public.venue_networks;
CREATE POLICY "Authenticated users can read venue networks"
  ON public.venue_networks
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Only admins manage venue restrictions" ON public.venue_restrictions;
CREATE POLICY "Only admins manage venue restrictions"
  ON public.venue_restrictions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (coalesce(p.super_admin, false) = true OR p.role IN ('admin', 'super_admin'))
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (coalesce(p.super_admin, false) = true OR p.role IN ('admin', 'super_admin'))
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Only admins manage venue networks" ON public.venue_networks;
CREATE POLICY "Only admins manage venue networks"
  ON public.venue_networks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (coalesce(p.super_admin, false) = true OR p.role IN ('admin', 'super_admin'))
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (coalesce(p.super_admin, false) = true OR p.role IN ('admin', 'super_admin'))
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  );

INSERT INTO public.venue_restrictions (name) VALUES
  ('Livre'),
  ('Vacina'),
  ('Hospital'),
  ('Financeiras'),
  ('Cremesp'),
  ('Farmacia')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.venue_networks (name) VALUES
  ('LG'),
  ('TV Doutor'),
  ('Cuidar e Educar'),
  ('Amil')
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE VIEW public.v_screens_enriched AS
SELECT
  sc.id,
  sc.code,
  sc.name,
  sc.display_name,
  sc.city,
  sc.state,
  sc.cep,
  COALESCE(sc.address_raw, '') AS address,
  sc.lat,
  sc.lng,
  sc.geom,
  sc.active,
  COALESCE(sc.class::text, 'ND') AS class,
  COALESCE(sc.specialty, ARRAY[]::text[]) AS specialty,
  COALESCE(sc.board_format, 'LED') AS board_format,
  COALESCE(sc.category, 'Outdoor') AS category,
  COALESCE(sc.rede, v.rede, 'TV Doutor') AS rede,
  sr.standard_rate_month,
  sr.selling_rate_month,
  sr.spots_per_hour,
  sr.spot_duration_secs,
  v.name AS venue_name,
  v.google_formatted_address AS venue_address,
  v.country AS venue_country,
  v.state AS venue_state,
  v.district AS venue_district,
  sc.name AS staging_nome_ponto,
  sc.audience_monthly AS staging_audiencia,
  CASE
    WHEN sc.specialty IS NOT NULL AND array_length(sc.specialty, 1) > 0
    THEN array_to_string(sc.specialty, ', ')
    ELSE NULL
  END AS staging_especialidades,
  sc.venue_type_parent AS staging_tipo_venue,
  sc.venue_type_child AS staging_subtipo,
  COALESCE(sc.venue_type_grandchildren, sc.category) AS staging_categoria,
  sc.venue_type_grandchildren,
  sc.address_raw,
  sc.ambiente,
  sc.audiencia_pacientes,
  sc.audiencia_local,
  sc.audiencia_hcp,
  sc.audiencia_medica,
  sc.aceita_convenio,
  COALESCE(sc.restricoes, v.restricao, 'Livre') AS restricoes,
  COALESCE(sc.programatica, v.programatica, false) AS programatica,
  v.restricao AS venue_restricao,
  v.programatica AS venue_programatica,
  v.rede AS venue_rede,
  sc.created_at,
  sc.updated_at
FROM public.screens sc
LEFT JOIN public.venues v ON v.id = sc.venue_id
LEFT JOIN public.screen_rates sr ON sr.screen_id = sc.id;

GRANT SELECT ON public.v_screens_enriched TO authenticated;
GRANT SELECT ON public.v_screens_enriched TO anon;
