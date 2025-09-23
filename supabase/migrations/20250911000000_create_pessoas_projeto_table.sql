-- =====================================================================
-- MIGRAÇÃO: CRIAR TABELA PESSOAS_PROJETO E ALTERAR AGENCIA_PROJETOS
-- =====================================================================
-- Esta migração desacopla o campo "Responsável pelo Projeto" da tabela de usuários
-- criando uma tabela dedicada para contatos que podem ser responsáveis por projetos.

-- =====================================================================
-- PASSO 1.1: CRIAR A NOVA TABELA 'pessoas_projeto'
-- Armazenará os contatos que podem ser responsáveis por projetos.
-- =====================================================================
DO $$ 
BEGIN
  -- Só cria a tabela se agencias existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencias' AND table_schema = 'public') THEN
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
  END IF;
END $$;

-- =====================================================================
-- PASSO 1.2: ALTERAR A TABELA 'agencia_projetos'
-- Atualiza a referência da coluna 'responsavel_projeto'.
-- =====================================================================
DO $$ 
BEGIN
  -- Só altera agencia_projetos se ela existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_projetos' AND table_schema = 'public') THEN
    -- 1.2.1 Remove a antiga chave estrangeira que apontava para 'auth.users'.
    ALTER TABLE public.agencia_projetos
      DROP CONSTRAINT IF EXISTS agencia_projetos_responsavel_projeto_fkey;

    -- 1.2.2 Adiciona a nova chave estrangeira apontando para 'pessoas_projeto'.
    -- ON DELETE SET NULL: Se uma pessoa for deletada, o campo no projeto ficará nulo.
    -- Só adiciona se pessoas_projeto existir
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pessoas_projeto' AND table_schema = 'public') THEN
      ALTER TABLE public.agencia_projetos
        ADD CONSTRAINT agencia_projetos_responsavel_projeto_fkey
        FOREIGN KEY (responsavel_projeto) REFERENCES public.pessoas_projeto(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- =====================================================================
-- PASSO 1.3: CONFIGURAR A SEGURANÇA PARA A NOVA TABELA 'pessoas_projeto'
-- Aplica permissões e políticas de RLS.
-- =====================================================================
DO $$ 
BEGIN
  -- Só configura RLS se pessoas_projeto existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pessoas_projeto' AND table_schema = 'public') THEN
    -- 1.3.1 Concede permissões básicas para usuários autenticados.
    GRANT ALL ON TABLE public.pessoas_projeto TO authenticated;

    -- 1.3.2 Habilita Row Level Security (RLS).
    ALTER TABLE public.pessoas_projeto ENABLE ROW LEVEL SECURITY;

    -- 1.3.3 Cria políticas de acesso.
    -- Leitura: Qualquer usuário autenticado pode ver a lista de pessoas para preencher seletores.
    DROP POLICY IF EXISTS "Pessoas do projeto são visíveis para usuários autenticados." ON public.pessoas_projeto;
    CREATE POLICY "Pessoas do projeto são visíveis para usuários autenticados."
      ON public.pessoas_projeto FOR SELECT
      TO authenticated
      USING (true);

    -- Escrita e Modificação: Apenas administradores podem gerenciar a lista de contatos.
    DROP POLICY IF EXISTS "Apenas administradores podem gerenciar pessoas do projeto." ON public.pessoas_projeto;
    CREATE POLICY "Apenas administradores podem gerenciar pessoas do projeto."
      ON public.pessoas_projeto FOR ALL -- (ALL = INSERT, UPDATE, DELETE)
      TO authenticated
      USING (is_admin()) -- Permite ver os botões de editar/deletar
      WITH CHECK (is_admin()); -- Valida a permissão ao salvar
  END IF;
END $$;

-- =====================================================================
-- PASSO 1.4: CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================================
DO $$ 
BEGIN
  -- Só cria índices se pessoas_projeto existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pessoas_projeto' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_pessoas_projeto_agencia_id ON public.pessoas_projeto(agencia_id);
    CREATE INDEX IF NOT EXISTS idx_pessoas_projeto_email ON public.pessoas_projeto(email);
  END IF;
END $$;

-- =====================================================================
-- PASSO 1.5: CRIAR TRIGGER PARA ATUALIZAR updated_at
-- =====================================================================
DO $$ 
BEGIN
  -- Só cria trigger se pessoas_projeto existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pessoas_projeto' AND table_schema = 'public') THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $func$ language ''plpgsql''';

    DROP TRIGGER IF EXISTS update_pessoas_projeto_updated_at ON public.pessoas_projeto;
    CREATE TRIGGER update_pessoas_projeto_updated_at 
        BEFORE UPDATE ON public.pessoas_projeto 
        FOR EACH ROW 
        EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

SELECT 'Banco de dados atualizado com sucesso para usar a tabela pessoas_projeto!' as resultado;
