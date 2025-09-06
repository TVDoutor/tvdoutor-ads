-- =====================================================================
-- SCRIPT PARA APLICAR MIGRAÇÃO: PESSOAS DO PROJETO
-- =====================================================================
-- Execute este script no Editor SQL do Supabase Dashboard
-- Acesse: https://supabase.com/dashboard/project/[SEU_PROJECT_ID]/sql

-- =====================================================================
-- PASSO 1: CRIAR A NOVA TABELA 'pessoas_projeto'
-- =====================================================================
CREATE TABLE public.pessoas_projeto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE,
  telefone TEXT,
  cargo TEXT,
  agencia_id UUID REFERENCES public.agencias(id), -- Opcional: Vincula o contato a uma agência
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.pessoas_projeto IS 'Pessoas ou contatos que podem ser responsáveis por projetos, não necessariamente usuários do sistema.';

-- =====================================================================
-- PASSO 2: ALTERAR A TABELA 'agencia_projetos'
-- =====================================================================
-- Remove a antiga chave estrangeira que apontava para 'auth.users'
ALTER TABLE public.agencia_projetos
  DROP CONSTRAINT IF EXISTS agencia_projetos_responsavel_projeto_fkey;

-- Adiciona a nova chave estrangeira apontando para 'pessoas_projeto'
-- ON DELETE SET NULL: Se uma pessoa for deletada, o campo no projeto ficará nulo
ALTER TABLE public.agencia_projetos
  ADD CONSTRAINT agencia_projetos_responsavel_projeto_fkey
  FOREIGN KEY (responsavel_projeto) REFERENCES public.pessoas_projeto(id) ON DELETE SET NULL;

-- =====================================================================
-- PASSO 3: CONFIGURAR A SEGURANÇA PARA A NOVA TABELA
-- =====================================================================
-- Concede permissões básicas para usuários autenticados
GRANT ALL ON TABLE public.pessoas_projeto TO authenticated;

-- Habilita Row Level Security (RLS)
ALTER TABLE public.pessoas_projeto ENABLE ROW LEVEL SECURITY;

-- Cria políticas de acesso
-- Leitura: Qualquer usuário autenticado pode ver a lista de pessoas para preencher seletores
CREATE POLICY "Pessoas do projeto são visíveis para usuários autenticados."
  ON public.pessoas_projeto FOR SELECT
  TO authenticated
  USING (true);

-- Escrita e Modificação: Apenas administradores podem gerenciar a lista de contatos
CREATE POLICY "Apenas administradores podem gerenciar pessoas do projeto."
  ON public.pessoas_projeto FOR ALL -- (ALL = INSERT, UPDATE, DELETE)
  TO authenticated
  USING (is_admin()) -- Permite ver os botões de editar/deletar
  WITH CHECK (is_admin()); -- Valida a permissão ao salvar

-- =====================================================================
-- PASSO 4: CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_pessoas_projeto_agencia_id ON public.pessoas_projeto(agencia_id);
CREATE INDEX IF NOT EXISTS idx_pessoas_projeto_email ON public.pessoas_projeto(email);

-- =====================================================================
-- PASSO 5: CRIAR TRIGGER PARA ATUALIZAR updated_at
-- =====================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pessoas_projeto_updated_at 
    BEFORE UPDATE ON public.pessoas_projeto 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- PASSO 6: INSERIR DADOS DE EXEMPLO (OPCIONAL)
-- =====================================================================
-- Descomente as linhas abaixo para inserir algumas pessoas de exemplo

/*
INSERT INTO public.pessoas_projeto (nome, email, telefone, cargo) VALUES
('João Silva', 'joao.silva@exemplo.com', '(11) 99999-1111', 'Gerente de Projetos'),
('Maria Santos', 'maria.santos@exemplo.com', '(11) 99999-2222', 'Coordenadora de Marketing'),
('Pedro Oliveira', 'pedro.oliveira@exemplo.com', '(11) 99999-3333', 'Diretor Criativo');
*/

-- =====================================================================
-- VERIFICAÇÃO FINAL
-- =====================================================================
SELECT 'Migração aplicada com sucesso! Tabela pessoas_projeto criada.' as resultado;

-- Verificar se a tabela foi criada
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pessoas_projeto' 
ORDER BY ordinal_position;
