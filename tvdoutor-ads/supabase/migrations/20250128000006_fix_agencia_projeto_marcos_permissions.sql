-- Corrigir permissões RLS para tabela agencia_projeto_marcos
-- Esta migração resolve definitivamente o erro "permission denied for table agencia_projeto_marcos"
-- Data: 2025-01-28

BEGIN;

-- 1. Remover todas as políticas existentes da tabela agencia_projeto_marcos (apenas se a tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_projeto_marcos' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "marcos_select_policy" ON public.agencia_projeto_marcos;
    DROP POLICY IF EXISTS "marcos_insert_policy" ON public.agencia_projeto_marcos;
    DROP POLICY IF EXISTS "marcos_update_policy" ON public.agencia_projeto_marcos;
    DROP POLICY IF EXISTS "marcos_delete_policy" ON public.agencia_projeto_marcos;
    DROP POLICY IF EXISTS "agencia_projeto_marcos_select_policy" ON public.agencia_projeto_marcos;
    DROP POLICY IF EXISTS "agencia_projeto_marcos_insert_policy" ON public.agencia_projeto_marcos;
    DROP POLICY IF EXISTS "agencia_projeto_marcos_update_policy" ON public.agencia_projeto_marcos;
    DROP POLICY IF EXISTS "agencia_projeto_marcos_delete_policy" ON public.agencia_projeto_marcos;
  END IF;
END $$;

-- 2. Garantir que a tabela agencia_projeto_marcos existe com a estrutura correta
-- Só criar se a tabela agencia_projetos existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_projetos' AND table_schema = 'public') THEN
        CREATE TABLE IF NOT EXISTS public.agencia_projeto_marcos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            projeto_id UUID NOT NULL REFERENCES public.agencia_projetos(id) ON DELETE CASCADE,
            nome_marco VARCHAR(255) NOT NULL,
            descricao TEXT,
            data_prevista DATE,
            data_conclusao DATE,
            status VARCHAR(50) DEFAULT 'pendente',
            responsavel_id UUID REFERENCES auth.users(id),
            ordem INTEGER DEFAULT 1,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            created_by UUID REFERENCES auth.users(id)
        );
    END IF;
END $$;

-- 3. Adicionar colunas se não existirem (apenas se a tabela existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_projeto_marcos' AND table_schema = 'public') THEN
        -- Adicionar colunas que podem estar faltando
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agencia_projeto_marcos' AND column_name = 'created_by') THEN
            ALTER TABLE public.agencia_projeto_marcos ADD COLUMN created_by UUID REFERENCES auth.users(id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agencia_projeto_marcos' AND column_name = 'updated_at') THEN
            ALTER TABLE public.agencia_projeto_marcos ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agencia_projeto_marcos' AND column_name = 'responsavel_id') THEN
            ALTER TABLE public.agencia_projeto_marcos ADD COLUMN responsavel_id UUID REFERENCES auth.users(id);
        END IF;
    END IF;
END $$;

-- 4. Habilitar RLS e criar políticas (apenas se a tabela existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_projeto_marcos' AND table_schema = 'public') THEN
        -- Habilitar RLS
        ALTER TABLE public.agencia_projeto_marcos ENABLE ROW LEVEL SECURITY;
        
        -- Política de leitura: usuários autenticados podem ver todos os marcos
        CREATE POLICY "agencia_projeto_marcos_select_all_authenticated"
        ON public.agencia_projeto_marcos
        FOR SELECT
        TO authenticated
        USING (true);

        -- Política de inserção: usuários autenticados podem inserir marcos
        CREATE POLICY "agencia_projeto_marcos_insert_authenticated"
        ON public.agencia_projeto_marcos
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() IS NOT NULL);

        -- Política de atualização: usuários autenticados podem atualizar marcos
        CREATE POLICY "agencia_projeto_marcos_update_authenticated"
        ON public.agencia_projeto_marcos
        FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);

        -- Política de exclusão: usuários autenticados podem excluir marcos
        CREATE POLICY "agencia_projeto_marcos_delete_authenticated"
        ON public.agencia_projeto_marcos
        FOR DELETE
        TO authenticated
        USING (true);

        -- 6. Garantir permissões básicas
        GRANT ALL ON public.agencia_projeto_marcos TO authenticated;
        GRANT USAGE ON SCHEMA public TO authenticated;

        -- 7. Trigger será criado em migração posterior

        -- 8. Comentários para documentação
        COMMENT ON TABLE public.agencia_projeto_marcos IS 'Marcos de projeto - políticas RLS corrigidas para permitir CRUD por usuários autenticados';
        COMMENT ON POLICY "agencia_projeto_marcos_select_all_authenticated" ON public.agencia_projeto_marcos IS 'Permite que usuários autenticados vejam todos os marcos';
        COMMENT ON POLICY "agencia_projeto_marcos_insert_authenticated" ON public.agencia_projeto_marcos IS 'Permite que usuários autenticados criem marcos';
        COMMENT ON POLICY "agencia_projeto_marcos_update_authenticated" ON public.agencia_projeto_marcos IS 'Permite que usuários autenticados atualizem marcos';
        COMMENT ON POLICY "agencia_projeto_marcos_delete_authenticated" ON public.agencia_projeto_marcos IS 'Permite que usuários autenticados excluam marcos';
    END IF;
END $$;

COMMIT;
