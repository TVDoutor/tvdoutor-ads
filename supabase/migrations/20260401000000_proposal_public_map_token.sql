-- Token opaco para URL pública do mapa da proposta (sem expor id numérico como segredo).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'proposals'
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'public_map_token'
  ) THEN
    ALTER TABLE public.proposals
      ADD COLUMN public_map_token uuid UNIQUE;
    COMMENT ON COLUMN public.proposals.public_map_token IS 'UUID para link público do mapa; preenchido sob demanda.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'public_map_token_created_at'
  ) THEN
    ALTER TABLE public.proposals
      ADD COLUMN public_map_token_created_at timestamptz;
  END IF;

  CREATE INDEX IF NOT EXISTS idx_proposals_public_map_token ON public.proposals (public_map_token)
    WHERE public_map_token IS NOT NULL;
END $$;
