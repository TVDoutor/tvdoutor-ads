-- Script rápido para corrigir permissões RLS da tabela agencia_projeto_marcos
-- Execute este script diretamente no SQL Editor do Supabase Dashboard
-- Data: 2025-01-28

-- 1. Remover políticas específicas que podem estar causando conflito
DROP POLICY IF EXISTS "agencia_projeto_marcos_select_all_authenticated" ON public.agencia_projeto_marcos;
DROP POLICY IF EXISTS "agencia_projeto_marcos_insert_authenticated" ON public.agencia_projeto_marcos;
DROP POLICY IF EXISTS "agencia_projeto_marcos_update_authenticated" ON public.agencia_projeto_marcos;
DROP POLICY IF EXISTS "agencia_projeto_marcos_delete_authenticated" ON public.agencia_projeto_marcos;

-- 2. Criar políticas permissivas simples
CREATE POLICY "agencia_projeto_marcos_select_all_authenticated"
ON public.agencia_projeto_marcos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "agencia_projeto_marcos_insert_authenticated"
ON public.agencia_projeto_marcos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "agencia_projeto_marcos_update_authenticated"
ON public.agencia_projeto_marcos
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "agencia_projeto_marcos_delete_authenticated"
ON public.agencia_projeto_marcos
FOR DELETE
TO authenticated
USING (true);

-- 3. Garantir permissões básicas
GRANT ALL ON public.agencia_projeto_marcos TO authenticated;

-- 4. Verificar se funcionou
SELECT 'Políticas criadas com sucesso!' as status;
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'agencia_projeto_marcos' 
AND schemaname = 'public';
