-- =====================================================================
-- PASSO 1.1: CRIAR A NOVA TABELA 'pessoas_projeto'
-- Armazenará os contatos que podem ser responsáveis por projetos.
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
-- PASSO 1.2: ALTERAR A TABELA 'agencia_projetos'
-- Atualiza a referência da coluna 'responsavel_projeto'.
-- =====================================================================
-- 1.2.1 Remove a antiga chave estrangeira que apontava para 'auth.users'.
ALTER TABLE public.agencia_projetos
  DROP CONSTRAINT IF EXISTS agencia_projetos_responsavel_projeto_fkey;

-- 1.2.2 Adiciona a nova chave estrangeira apontando para 'pessoas_projeto'.
-- ON DELETE SET NULL: Se uma pessoa for deletada, o campo no projeto ficará nulo.
ALTER TABLE public.agencia_projetos
  ADD CONSTRAINT agencia_projetos_responsavel_projeto_fkey
  FOREIGN KEY (responsavel_projeto) REFERENCES public.pessoas_projeto(id) ON DELETE SET NULL;


-- =====================================================================
-- PASSO 1.3: CONFIGURAR A SEGURANÇA PARA A NOVA TABELA 'pessoas_projeto'
-- Aplica permissões e políticas de RLS.
-- =====================================================================
-- 1.3.1 Concede permissões básicas para usuários autenticados.
GRANT ALL ON TABLE public.pessoas_projeto TO authenticated;

-- 1.3.2 Habilita Row Level Security (RLS).
ALTER TABLE public.pessoas_projeto ENABLE ROW LEVEL SECURITY;

-- 1.3.3 Cria políticas de acesso.
-- Leitura: Qualquer usuário autenticado pode ver a lista de pessoas para preencher seletores.
CREATE POLICY \
Pessoas
do
projeto
são
visíveis
para
usuários
autenticados.\
  ON public.pessoas_projeto FOR SELECT
  TO authenticated
  USING (true);

-- Escrita e Modificação: Apenas administradores podem gerenciar a lista de contatos.
CREATE POLICY \Apenas
administradores
podem
gerenciar
pessoas
do
projeto.\
  ON public.pessoas_projeto FOR ALL -- (ALL = INSERT, UPDATE, DELETE)
  TO authenticated
  USING (is_admin()) -- Permite ver os botões de editar/deletar
  WITH CHECK (is_admin()); -- Valida a permissão ao salvar


SELECT 'Banco de dados atualizado com sucesso para usar a tabela pessoas_projeto!' as resultado;
