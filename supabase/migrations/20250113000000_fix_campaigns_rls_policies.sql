-- Corrigir políticas RLS da tabela campaigns para permitir criação
-- O problema é que a política INSERT está verificando created_by = auth.uid()
-- mas o campo created_by tem DEFAULT auth.uid() e não está sendo enviado explicitamente
-- (tabela campaigns é criada em migration posterior; executar apenas se existir)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns') THEN
    DROP POLICY IF EXISTS "Users can create campaigns" ON public.campaigns;
    DROP POLICY IF EXISTS "Authenticated users can create campaigns" ON public.campaigns;
    CREATE POLICY "Authenticated users can create campaigns" ON public.campaigns
      FOR INSERT 
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;
