-- Garante que a tabela de farmácias possua o campo google_formatted_address
DO $$
BEGIN
  IF to_regclass('public.farmacias') IS NULL THEN
    RAISE NOTICE 'Tabela public.farmacias não encontrada. Migração ignorada.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'farmacias'
      AND column_name = 'google_formatted_address'
  ) THEN
    ALTER TABLE public.farmacias
      ADD COLUMN google_formatted_address text;

    COMMENT ON COLUMN public.farmacias.google_formatted_address IS 'Endereço formatado retornado por provedores de geocodificação.';
  END IF;
END $$;

