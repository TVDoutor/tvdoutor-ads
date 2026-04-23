-- Categoria curada + busca unificada com especialidades reais

CREATE TABLE IF NOT EXISTS public.category_catalog (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.category_aliases (
  category_id TEXT NOT NULL REFERENCES public.category_catalog(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (category_id, alias)
);

CREATE TABLE IF NOT EXISTS public.category_specialties (
  category_id TEXT NOT NULL REFERENCES public.category_catalog(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (category_id, specialty)
);

CREATE INDEX IF NOT EXISTS idx_category_catalog_active_sort
  ON public.category_catalog(active, sort_order, label);

CREATE INDEX IF NOT EXISTS idx_category_aliases_alias
  ON public.category_aliases(alias);

CREATE INDEX IF NOT EXISTS idx_category_specialties_specialty
  ON public.category_specialties(specialty);

CREATE OR REPLACE FUNCTION public.normalize_search_text(input_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(
    regexp_replace(
      lower(
        translate(
          coalesce(input_text, ''),
          'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
          'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
        )
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_category_catalog()
RETURNS TABLE (
  id TEXT,
  label TEXT,
  aliases TEXT[],
  specialties TEXT[],
  sort_order INTEGER
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.label,
    COALESCE(
      ARRAY(
        SELECT DISTINCT ca.alias
        FROM public.category_aliases ca
        WHERE ca.category_id = c.id
        ORDER BY ca.alias
      ),
      ARRAY[]::TEXT[]
    ) AS aliases,
    COALESCE(
      ARRAY(
        SELECT DISTINCT cs.specialty
        FROM public.category_specialties cs
        WHERE cs.category_id = c.id
        ORDER BY cs.specialty
      ),
      ARRAY[]::TEXT[]
    ) AS specialties,
    c.sort_order
  FROM public.category_catalog c
  WHERE c.active = true
  ORDER BY c.sort_order, c.label;
$$;

CREATE OR REPLACE FUNCTION public.search_categories(q TEXT)
RETURNS TABLE (
  id TEXT,
  label TEXT,
  matched_by TEXT,
  specialties_count INTEGER,
  specialties TEXT[]
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH normalized AS (
    SELECT public.normalize_search_text(q) AS qn
  ),
  matched_curated AS (
    SELECT DISTINCT
      c.id,
      c.label,
      c.sort_order,
      CASE
        WHEN public.normalize_search_text(c.label) LIKE '%' || n.qn || '%' THEN c.label
        ELSE COALESCE(
          (
            SELECT ca.alias
            FROM public.category_aliases ca
            WHERE ca.category_id = c.id
              AND public.normalize_search_text(ca.alias) LIKE '%' || n.qn || '%'
            ORDER BY length(ca.alias), ca.alias
            LIMIT 1
          ),
          c.label
        )
      END AS matched_by
    FROM public.category_catalog c
    CROSS JOIN normalized n
    WHERE c.active = true
      AND n.qn <> ''
      AND (
        public.normalize_search_text(c.label) LIKE '%' || n.qn || '%'
        OR EXISTS (
          SELECT 1
          FROM public.category_aliases ca
          WHERE ca.category_id = c.id
            AND public.normalize_search_text(ca.alias) LIKE '%' || n.qn || '%'
        )
      )
  ),
  matched_curated_rows AS (
    SELECT
      mc.id,
      mc.label,
      mc.matched_by,
      COUNT(cs.specialty)::INTEGER AS specialties_count,
      COALESCE(array_agg(cs.specialty ORDER BY cs.specialty), ARRAY[]::TEXT[]) AS specialties,
      mc.sort_order AS ordering
    FROM matched_curated mc
    LEFT JOIN public.category_specialties cs
      ON cs.category_id = mc.id
    GROUP BY mc.id, mc.label, mc.matched_by, mc.sort_order
  ),
  curated_specialty_norm AS (
    SELECT DISTINCT public.normalize_search_text(cs.specialty) AS specialty_norm
    FROM public.category_specialties cs
    JOIN matched_curated mc ON mc.id = cs.category_id
  ),
  matched_auto_rows AS (
    SELECT
      'auto:' || s.specialty AS id,
      s.specialty AS label,
      s.specialty AS matched_by,
      1::INTEGER AS specialties_count,
      ARRAY[s.specialty]::TEXT[] AS specialties,
      100000 AS ordering
    FROM (
      SELECT DISTINCT trim(spec.specialty) AS specialty
      FROM public.v_screens_enriched vse
      CROSS JOIN LATERAL unnest(vse.specialty) AS spec(specialty)
      CROSS JOIN normalized n
      WHERE n.qn <> ''
        AND vse.specialty IS NOT NULL
        AND public.normalize_search_text(trim(spec.specialty)) LIKE '%' || n.qn || '%'
    ) s
    LEFT JOIN curated_specialty_norm csn
      ON csn.specialty_norm = public.normalize_search_text(s.specialty)
    WHERE s.specialty IS NOT NULL
      AND s.specialty <> ''
      AND csn.specialty_norm IS NULL
  )
  SELECT id, label, matched_by, specialties_count, specialties
  FROM (
    SELECT * FROM matched_curated_rows
    UNION ALL
    SELECT * FROM matched_auto_rows
  ) all_rows
  ORDER BY ordering, label;
$$;

INSERT INTO public.category_catalog (id, label, sort_order, active)
VALUES
  ('odonto', 'Odonto', 10, true),
  ('cardio', 'Cardio', 20, true),
  ('oftalmo', 'Oftalmo', 30, true),
  ('dermato', 'Dermato', 40, true),
  ('gineco', 'Gineco', 50, true)
ON CONFLICT (id) DO UPDATE
SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  updated_at = now();

INSERT INTO public.category_aliases (category_id, alias)
VALUES
  ('odonto', 'odonto'),
  ('odonto', 'odontologia'),
  ('odonto', 'odonto pediatria'),
  ('odonto', 'odontopediatria'),
  ('odonto', 'dentista'),
  ('odonto', 'dental'),
  ('cardio', 'cardio'),
  ('cardio', 'cardiologia'),
  ('cardio', 'cardiologista'),
  ('cardio', 'coracao'),
  ('cardio', 'coração'),
  ('oftalmo', 'oftalmo'),
  ('oftalmo', 'oftalmologia'),
  ('oftalmo', 'oftalmologista'),
  ('oftalmo', 'visao'),
  ('oftalmo', 'visão'),
  ('dermato', 'dermato'),
  ('dermato', 'dermatologia'),
  ('dermato', 'pele'),
  ('dermato', 'dermatologista'),
  ('gineco', 'gineco'),
  ('gineco', 'ginecologia'),
  ('gineco', 'ginecologista'),
  ('gineco', 'mulher'),
  ('gineco', 'saude da mulher'),
  ('gineco', 'saúde da mulher')
ON CONFLICT (category_id, alias) DO NOTHING;

INSERT INTO public.category_specialties (category_id, specialty)
VALUES
  ('odonto', 'ODONTOLOGIA'),
  ('odonto', 'ODONTOLOGIA CLINICA GERAL'),
  ('odonto', 'ODONTOLOGIA CLÍNICA GERAL'),
  ('odonto', 'ODONTOPEDIATRIA'),
  ('odonto', 'IMPLANTODONTIA'),
  ('odonto', 'ENDODONTIA'),
  ('odonto', 'ORTODONTIA'),
  ('odonto', 'ORTOPEDIA FUNCIONAL DOS MAXILARES'),
  ('odonto', 'PERIODONTIA'),
  ('odonto', 'PRÓTESE DENTÁRIA'),
  ('odonto', 'PROTESE DENTARIA'),
  ('odonto', 'PRÓTESE'),
  ('odonto', 'PROTESE'),
  ('odonto', 'BUCOMAXILO'),
  ('odonto', 'BUCOMAXILOFACIAL'),
  ('odonto', 'CIRURGIA E TRAUMATOLOGIA BUCOMAXILOFACIAL'),
  ('odonto', 'ESTOMATOLOGIA'),
  ('odonto', 'HARMONIZACAO OROFACIAL'),
  ('odonto', 'HARMONIZAÇÃO OROFACIAL'),
  ('odonto', 'DENTÍSTICA'),
  ('odonto', 'DENTISTICA'),
  ('cardio', 'CARDIOLOGIA'),
  ('cardio', 'CARDIOLOGIA CLINICA'),
  ('cardio', 'CARDIOLOGIA CLÍNICA'),
  ('cardio', 'HEMODINAMICA'),
  ('cardio', 'HEMODINÂMICA'),
  ('cardio', 'ARRITMOLOGIA'),
  ('cardio', 'ECOCARDIOGRAFIA'),
  ('oftalmo', 'OFTALMOLOGIA'),
  ('oftalmo', 'RETINA'),
  ('oftalmo', 'GLAUCOMA'),
  ('oftalmo', 'CATARATA'),
  ('oftalmo', 'PLASTICA OCULAR'),
  ('oftalmo', 'PLÁSTICA OCULAR'),
  ('oftalmo', 'ESTRABISMO'),
  ('dermato', 'DERMATOLOGIA'),
  ('dermato', 'DERMATOLOGIA CLINICA'),
  ('dermato', 'DERMATOLOGIA CLÍNICA'),
  ('dermato', 'COSMIATRIA'),
  ('dermato', 'TRICOLOGIA'),
  ('gineco', 'GINECOLOGIA'),
  ('gineco', 'OBSTETRICIA'),
  ('gineco', 'OBSTETRÍCIA'),
  ('gineco', 'GINECOLOGIA E OBSTETRICIA'),
  ('gineco', 'GINECOLOGIA E OBSTETRÍCIA'),
  ('gineco', 'MASTOLOGIA')
ON CONFLICT (category_id, specialty) DO NOTHING;

GRANT SELECT ON public.category_catalog TO authenticated, anon;
GRANT SELECT ON public.category_aliases TO authenticated, anon;
GRANT SELECT ON public.category_specialties TO authenticated, anon;

GRANT EXECUTE ON FUNCTION public.get_category_catalog() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.search_categories(TEXT) TO authenticated, anon;
