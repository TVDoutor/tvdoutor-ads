-- =====================================================================
-- CORREÇÃO URGENTE: FIX RLS PARA PESSOAS_PROJETO
-- =====================================================================
-- Problema: A política "FOR ALL" está bloqueando inserções mesmo para admins
-- Solução: Separar políticas por operação para melhor controle

-- 1. Remover política problemática
DROP POLICY IF EXISTS "Apenas administradores podem gerenciar pessoas do projeto." ON public.pessoas_projeto;

-- 2. Criar políticas separadas e mais específicas

-- 2.1 Política para INSERT (criação)
CREATE POLICY "Admins podem criar pessoas do projeto"
  ON public.pessoas_projeto
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'super_admin')
    )
  );

-- 2.2 Política para UPDATE (atualização)
CREATE POLICY "Admins podem atualizar pessoas do projeto"
  ON public.pessoas_projeto
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'super_admin')
    )
  );

-- 2.3 Política para DELETE (remoção)
CREATE POLICY "Admins podem deletar pessoas do projeto"
  ON public.pessoas_projeto
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'super_admin')
    )
  );

-- 3. Verificar políticas aplicadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'pessoas_projeto'
ORDER BY policyname;

-- 4. Mensagem de sucesso
SELECT '✅ Políticas RLS corrigidas para pessoas_projeto!' as resultado;

