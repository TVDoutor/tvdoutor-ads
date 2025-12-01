-- Adiciona a coluna "nome" na tabela de farmácias para suportar o cadastro completo
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
      AND column_name = 'nome'
  ) THEN
    ALTER TABLE public.farmacias
      ADD COLUMN nome text;

    COMMENT ON COLUMN public.farmacias.nome IS 'Nome oficial ou razão social da farmácia.';
  END IF;

  UPDATE public.farmacias
     SET nome = COALESCE(nome, fantasia)
   WHERE nome IS NULL
     AND fantasia IS NOT NULL;
END $$;

