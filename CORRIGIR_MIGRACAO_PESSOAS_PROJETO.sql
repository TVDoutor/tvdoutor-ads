-- =====================================================================
-- SCRIPT CORRIGIDO: PESSOAS DO PROJETO
-- =====================================================================
-- Este script corrige o problema de chave estrangeira
-- Execute no Editor SQL do Supabase Dashboard

-- =====================================================================
-- PASSO 1: LIMPAR REFERÊNCIAS INVÁLIDAS
-- =====================================================================
-- Primeiro, vamos limpar as referências inválidas na tabela agencia_projetos
-- que apontam para IDs que não existem na tabela pessoas_projeto

-- Remover a constraint temporariamente para limpar os dados
ALTER TABLE public.agencia_projetos
  DROP CONSTRAINT IF EXISTS agencia_projetos_responsavel_projeto_fkey;

-- Limpar referências inválidas (definir como NULL)
UPDATE public.agencia_projetos 
SET responsavel_projeto = NULL 
WHERE responsavel_projeto IS NOT NULL 
  AND responsavel_projeto NOT IN (
    SELECT id FROM auth.users WHERE id IS NOT NULL
  );

-- =====================================================================
-- PASSO 2: CRIAR A NOVA TABELA 'pessoas_projeto'
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.pessoas_projeto (
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
-- PASSO 3: RECRIAR A CHAVE ESTRANGEIRA
-- =====================================================================
-- Adiciona a nova chave estrangeira apontando para 'pessoas_projeto'
-- ON DELETE SET NULL: Se uma pessoa for deletada, o campo no projeto ficará nulo
ALTER TABLE public.agencia_projetos
  ADD CONSTRAINT agencia_projetos_responsavel_projeto_fkey
  FOREIGN KEY (responsavel_projeto) REFERENCES public.pessoas_projeto(id) ON DELETE SET NULL;

-- =====================================================================
-- PASSO 4: CONFIGURAR A SEGURANÇA PARA A NOVA TABELA
-- =====================================================================
-- Concede permissões básicas para usuários autenticados
GRANT ALL ON TABLE public.pessoas_projeto TO authenticated;

-- Habilita Row Level Security (RLS)
ALTER TABLE public.pessoas_projeto ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se existirem
DROP POLICY IF EXISTS "Pessoas do projeto são visíveis para usuários autenticados." ON public.pessoas_projeto;
DROP POLICY IF EXISTS "Apenas administradores podem gerenciar pessoas do projeto." ON public.pessoas_projeto;

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
-- PASSO 5: CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_pessoas_projeto_agencia_id ON public.pessoas_projeto(agencia_id);
CREATE INDEX IF NOT EXISTS idx_pessoas_projeto_email ON public.pessoas_projeto(email);

-- =====================================================================
-- PASSO 6: CRIAR TRIGGER PARA ATUALIZAR updated_at
-- =====================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS update_pessoas_projeto_updated_at ON public.pessoas_projeto;

-- Cria o trigger
CREATE TRIGGER update_pessoas_projeto_updated_at 
    BEFORE UPDATE ON public.pessoas_projeto 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- PASSO 7: INSERIR DADOS DE EXEMPLO
-- =====================================================================
-- Inserir algumas pessoas de exemplo
INSERT INTO public.pessoas_projeto (nome, email, telefone, cargo) VALUES
('João Silva', 'joao.silva@exemplo.com', '(11) 99999-1111', 'Gerente de Projetos'),
('Maria Santos', 'maria.santos@exemplo.com', '(11) 99999-2222', 'Coordenadora de Marketing'),
('Pedro Oliveira', 'pedro.oliveira@exemplo.com', '(11) 99999-3333', 'Diretor Criativo')
ON CONFLICT (email) DO NOTHING; -- Evita duplicatas se executar o script várias vezes

-- =====================================================================
-- VERIFICAÇÃO FINAL
-- =====================================================================
SELECT 'Migração aplicada com sucesso! Tabela pessoas_projeto criada e dados de exemplo inseridos.' as resultado;

-- Verificar se a tabela foi criada
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pessoas_projeto' 
ORDER BY ordinal_position;

-- Verificar quantas pessoas foram inseridas
SELECT COUNT(*) as total_pessoas FROM public.pessoas_projeto;

-- Verificar se há projetos com responsáveis nulos (esperado após a limpeza)
SELECT COUNT(*) as projetos_sem_responsavel 
FROM public.agencia_projetos 
WHERE responsavel_projeto IS NULL;
