-- Política mais permissiva para permitir leitura dos nomes de marcos para templates
-- Esta migração corrige o problema de permissão no dropdown "Nome do Marco"

-- Remover a política restritiva atual
DROP POLICY IF EXISTS projeto_marcos_policy ON agencia_projeto_marcos;

-- Criar nova política que permite leitura de nomes de marcos para usuários autenticados
-- mas mantém restrições para operações de escrita
CREATE POLICY projeto_marcos_read_policy ON agencia_projeto_marcos
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

-- Política separada para operações de escrita (INSERT, UPDATE, DELETE)
CREATE POLICY projeto_marcos_write_policy ON agencia_projeto_marcos
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      is_super_admin() OR
      responsavel_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM agencia_projetos ap 
        WHERE ap.id = projeto_id AND ap.responsavel_projeto = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM agencia_projeto_equipe ape
        WHERE ape.projeto_id = projeto_id AND ape.usuario_id = auth.uid() AND ape.ativo = true
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      is_super_admin() OR
      responsavel_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM agencia_projetos ap 
        WHERE ap.id = projeto_id AND ap.responsavel_projeto = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM agencia_projeto_equipe ape
        WHERE ape.projeto_id = projeto_id AND ape.usuario_id = auth.uid() AND ape.ativo = true
      )
    )
  );