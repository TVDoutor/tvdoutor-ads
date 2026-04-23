-- Deduplica resultados auto por especialidade normalizada
-- para evitar duplicatas como "Geriatria" e "GERIATRIA".

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
      mc.sort_order AS ordering,
      0 AS relevance
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
  auto_candidates AS (
    SELECT DISTINCT
      trim(spec.specialty) AS specialty,
      public.normalize_search_text(trim(spec.specialty)) AS specialty_norm,
      array_length(regexp_split_to_array(public.normalize_search_text(trim(spec.specialty)), '\s+'), 1) AS words_count
    FROM public.v_screens_enriched vse
    CROSS JOIN LATERAL unnest(vse.specialty) AS spec(specialty)
    CROSS JOIN normalized n
    WHERE n.qn <> ''
      AND vse.specialty IS NOT NULL
      AND trim(spec.specialty) <> ''
  ),
  matched_auto_ranked AS (
    SELECT
      'auto:' || ac.specialty AS id,
      ac.specialty AS label,
      ac.specialty AS matched_by,
      1::INTEGER AS specialties_count,
      ARRAY[ac.specialty]::TEXT[] AS specialties,
      100000 AS ordering,
      CASE
        WHEN ac.specialty_norm = n.qn THEN 0
        WHEN ac.specialty_norm LIKE n.qn || ' %' THEN 1
        WHEN ac.specialty_norm LIKE '% ' || n.qn || ' %' THEN 2
        WHEN ac.specialty_norm LIKE '% ' || n.qn THEN 3
        ELSE 9
      END AS relevance,
      row_number() OVER (
        PARTITION BY ac.specialty_norm
        ORDER BY
          CASE
            WHEN ac.specialty = upper(ac.specialty) THEN 0
            ELSE 1
          END,
          length(ac.specialty),
          ac.specialty
      ) AS rn
    FROM auto_candidates ac
    CROSS JOIN normalized n
    LEFT JOIN curated_specialty_norm csn
      ON csn.specialty_norm = ac.specialty_norm
    WHERE csn.specialty_norm IS NULL
      AND (
        ac.specialty_norm = n.qn
        OR ac.specialty_norm LIKE n.qn || ' %'
        OR ac.specialty_norm LIKE '% ' || n.qn || ' %'
        OR ac.specialty_norm LIKE '% ' || n.qn
      )
      AND (
        ac.words_count IS NULL
        OR ac.words_count <= 4
        OR ac.specialty_norm = n.qn
      )
  ),
  matched_auto_rows AS (
    SELECT id, label, matched_by, specialties_count, specialties, ordering, relevance
    FROM matched_auto_ranked
    WHERE rn = 1
  )
  SELECT id, label, matched_by, specialties_count, specialties
  FROM (
    SELECT * FROM matched_curated_rows
    UNION ALL
    SELECT * FROM matched_auto_rows
  ) all_rows
  ORDER BY relevance, ordering, label;
$$;

GRANT EXECUTE ON FUNCTION public.search_categories(TEXT) TO authenticated, anon;
