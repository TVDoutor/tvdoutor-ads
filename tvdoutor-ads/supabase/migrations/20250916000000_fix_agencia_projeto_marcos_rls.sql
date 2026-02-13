-- Corrigir políticas RLS da tabela agencia_projeto_marcos
-- Esta migração resolve o problema de permissão ao criar marcos

-- Remover políticas existentes
DROP POLICY IF EXISTS projeto_marcos_read_policy ON agencia_projeto_marcos;
DROP POLICY IF EXISTS projeto_marcos_write_policy ON agencia_projeto_marcos;
DROP POLICY IF EXISTS projeto_marcos_policy ON agencia_projeto_marcos;

-- Política para leitura (SELECT) - permite usuários autenticados lerem marcos
CREATE POLICY agencia_projeto_marcos_select_policy ON agencia_projeto_marcos
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

-- Política para inserção (INSERT) - permite usuários autenticados criarem marcos
CREATE POLICY agencia_projeto_marcos_insert_policy ON agencia_projeto_marcos
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      is_super_admin() OR
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

-- Política para atualização (UPDATE) - permite usuários autenticados atualizarem marcos
CREATE POLICY agencia_projeto_marcos_update_policy ON agencia_projeto_marcos
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      is_super_admin() OR
      responsavel_id = auth.uid() OR
      created_by = auth.uid() OR
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
      created_by = auth.uid() OR
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

-- Política para exclusão (DELETE) - permite usuários autenticados excluírem marcos
CREATE POLICY agencia_projeto_marcos_delete_policy ON agencia_projeto_marcos
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND (
      is_super_admin() OR
      responsavel_id = auth.uid() OR
      created_by = auth.uid() OR
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

-- Garantir que RLS está habilitado
ALTER TABLE agencia_projeto_marcos ENABLE ROW LEVEL SECURITY;

-- Adicionar trigger para definir created_by automaticamente
CREATE OR REPLACE FUNCTION set_agencia_projeto_marcos_created_by()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_agencia_projeto_marcos_created_by_trigger ON agencia_projeto_marcos;
CREATE TRIGGER set_agencia_projeto_marcos_created_by_trigger
    BEFORE INSERT ON agencia_projeto_marcos
    FOR EACH ROW
    EXECUTE FUNCTION set_agencia_projeto_marcos_created_by();

-- Comentários para documentação
COMMENT ON POLICY agencia_projeto_marcos_select_policy ON agencia_projeto_marcos IS 'Permite usuários autenticados lerem marcos';
COMMENT ON POLICY agencia_projeto_marcos_insert_policy ON agencia_projeto_marcos IS 'Permite criação de marcos por responsáveis do projeto ou membros da equipe';
COMMENT ON POLICY agencia_projeto_marcos_update_policy ON agencia_projeto_marcos IS 'Permite atualização de marcos por responsáveis ou criadores';
COMMENT ON POLICY agencia_projeto_marcos_delete_policy ON agencia_projeto_marcos IS 'Permite exclusão de marcos por responsáveis ou criadores';