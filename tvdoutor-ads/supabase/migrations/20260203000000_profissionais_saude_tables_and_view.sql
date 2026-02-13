-- =====================================================
-- Profissionais da Saúde: tabelas, view e RLS
-- =====================================================
-- Cria profissionais_saude, profissional_venue, profissional_especialidades
-- e a view view_detalhes_profissionais para o módulo corpo clínico.
-- =====================================================

-- 1. Tabela profissionais_saude
CREATE TABLE IF NOT EXISTS public.profissionais_saude (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo_profissional text NOT NULL,
  tipo_registro text,
  registro_profissional text NOT NULL,
  email text,
  telefone text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

COMMENT ON TABLE public.profissionais_saude IS 'Profissionais da saúde (corpo clínico)';

-- 2. Tabela profissional_venue (vínculos profissional <-> venue)
CREATE TABLE IF NOT EXISTS public.profissional_venue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id uuid NOT NULL REFERENCES public.profissionais_saude(id) ON DELETE CASCADE,
  venue_id bigint NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  cargo_na_unidade text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profissional_id, venue_id)
);

COMMENT ON TABLE public.profissional_venue IS 'Vínculos entre profissionais da saúde e unidades (venues)';

CREATE INDEX IF NOT EXISTS idx_profissional_venue_profissional ON public.profissional_venue(profissional_id);
CREATE INDEX IF NOT EXISTS idx_profissional_venue_venue ON public.profissional_venue(venue_id);

-- 3. Tabela profissional_especialidades (se specialties existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'specialties') THEN
    CREATE TABLE IF NOT EXISTS public.profissional_especialidades (
      profissional_id uuid NOT NULL REFERENCES public.profissionais_saude(id) ON DELETE CASCADE,
      specialty_id uuid NOT NULL REFERENCES public.specialties(id) ON DELETE CASCADE,
      PRIMARY KEY (profissional_id, specialty_id)
    );
    COMMENT ON TABLE public.profissional_especialidades IS 'Especialidades por profissional';
  END IF;
END $$;

-- 4. View view_detalhes_profissionais (agrega profissional + venue + especialidades)
DO $$
BEGIN
  DROP VIEW IF EXISTS public.view_detalhes_profissionais;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profissional_especialidades')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'specialties') THEN
    CREATE VIEW public.view_detalhes_profissionais AS
    SELECT
      p.id AS profissional_id,
      p.nome AS profissional_nome,
      p.registro_profissional,
      p.tipo_profissional,
      p.tipo_registro,
      pv.venue_id,
      v.name AS venue_nome,
      v.cidade AS venue_cidade,
      pv.cargo_na_unidade,
      (
        SELECT array_agg(s.name ORDER BY s.name)
        FROM public.profissional_especialidades pe
        JOIN public.specialties s ON s.id = pe.specialty_id
        WHERE pe.profissional_id = p.id
      ) AS especialidades
    FROM public.profissionais_saude p
    JOIN public.profissional_venue pv ON pv.profissional_id = p.id
    JOIN public.venues v ON v.id = pv.venue_id;
  ELSE
    CREATE VIEW public.view_detalhes_profissionais AS
    SELECT
      p.id AS profissional_id,
      p.nome AS profissional_nome,
      p.registro_profissional,
      p.tipo_profissional,
      p.tipo_registro,
      pv.venue_id,
      v.name AS venue_nome,
      v.cidade AS venue_cidade,
      pv.cargo_na_unidade,
      NULL::text[] AS especialidades
    FROM public.profissionais_saude p
    JOIN public.profissional_venue pv ON pv.profissional_id = p.id
    JOIN public.venues v ON v.id = pv.venue_id;
  END IF;
END $$;

-- 5. RLS profissionais_saude
ALTER TABLE public.profissionais_saude ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profissionais_saude_select_authenticated" ON public.profissionais_saude;
CREATE POLICY "profissionais_saude_select_authenticated"
  ON public.profissionais_saude FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profissionais_saude_insert_authenticated" ON public.profissionais_saude;
CREATE POLICY "profissionais_saude_insert_authenticated"
  ON public.profissionais_saude FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "profissionais_saude_update_authenticated" ON public.profissionais_saude;
CREATE POLICY "profissionais_saude_update_authenticated"
  ON public.profissionais_saude FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "profissionais_saude_delete_authenticated" ON public.profissionais_saude;
CREATE POLICY "profissionais_saude_delete_authenticated"
  ON public.profissionais_saude FOR DELETE
  TO authenticated
  USING (true);

-- 6. RLS profissional_venue
ALTER TABLE public.profissional_venue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profissional_venue_select_authenticated" ON public.profissional_venue;
CREATE POLICY "profissional_venue_select_authenticated"
  ON public.profissional_venue FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profissional_venue_insert_authenticated" ON public.profissional_venue;
CREATE POLICY "profissional_venue_insert_authenticated"
  ON public.profissional_venue FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "profissional_venue_update_authenticated" ON public.profissional_venue;
CREATE POLICY "profissional_venue_update_authenticated"
  ON public.profissional_venue FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "profissional_venue_delete_authenticated" ON public.profissional_venue;
CREATE POLICY "profissional_venue_delete_authenticated"
  ON public.profissional_venue FOR DELETE
  TO authenticated
  USING (true);

-- 7. RLS profissional_especialidades (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profissional_especialidades') THEN
    ALTER TABLE public.profissional_especialidades ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "profissional_especialidades_select_authenticated" ON public.profissional_especialidades;
    CREATE POLICY "profissional_especialidades_select_authenticated"
      ON public.profissional_especialidades FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "profissional_especialidades_insert_authenticated" ON public.profissional_especialidades;
    CREATE POLICY "profissional_especialidades_insert_authenticated"
      ON public.profissional_especialidades FOR INSERT TO authenticated WITH CHECK (true);
    DROP POLICY IF EXISTS "profissional_especialidades_delete_authenticated" ON public.profissional_especialidades;
    CREATE POLICY "profissional_especialidades_delete_authenticated"
      ON public.profissional_especialidades FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- 8. Grants para a view (leitura para authenticated)
GRANT SELECT ON public.view_detalhes_profissionais TO authenticated;
