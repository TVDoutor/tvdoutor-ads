-- ===============================
-- CRITICAL FIX: RLS Policies and updated_at column
-- Date: 2025-09-02
-- ATENÇÃO: Migração segura para não quebrar o sistema
-- ===============================

BEGIN;

-- ===============================
-- 1. VERIFICAÇÕES DE SEGURANÇA ANTES DE APLICAR
-- ===============================

-- Função para verificar se a tabela tem a coluna necessária
CREATE OR REPLACE FUNCTION public.check_column_exists(p_table_name text, p_column_name text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = p_table_name 
        AND column_name = p_column_name
    );
END$$;

-- ===============================
-- 2. ADICIONAR COLUNAS FALTANTES (SE NECESSÁRIO)
-- ===============================

-- Adicionar created_by se não existir (com segurança) - apenas se tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        IF NOT public.check_column_exists('proposals', 'created_by') THEN
            ALTER TABLE public.proposals 
            ADD COLUMN created_by UUID REFERENCES auth.users(id);
            
            -- Definir um valor padrão para registros existentes (primeiro super_admin ou NULL)
            UPDATE public.proposals 
            SET created_by = (
                SELECT ur.user_id 
                FROM public.user_roles ur 
                WHERE ur.role = 'super_admin' 
                LIMIT 1
            )
            WHERE created_by IS NULL;
        END IF;
    END IF;
END$$;

-- Adicionar updated_at se não existir - apenas se tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        IF NOT public.check_column_exists('proposals', 'updated_at') THEN
            ALTER TABLE public.proposals 
            ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
            
            -- Definir valor inicial baseado em created_at ou now()
            UPDATE public.proposals 
            SET updated_at = COALESCE(created_at, now())
            WHERE updated_at IS NULL;
        END IF;
    END IF;
END$$;

-- ===============================
-- 3. TRIGGER PARA UPDATED_AT
-- ===============================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END$$;

-- Aplicar trigger apenas se a coluna updated_at existir e tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        IF public.check_column_exists('proposals', 'updated_at') THEN
            DROP TRIGGER IF EXISTS update_proposals_updated_at ON public.proposals;
            CREATE TRIGGER update_proposals_updated_at
                BEFORE UPDATE ON public.proposals
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        END IF;
    END IF;
END$$;

-- ===============================
-- 4. RLS POLICIES PARA PROPOSALS (SEGURAS)
-- ===============================

-- Habilitar RLS na tabela proposals (se ainda não estiver) - apenas se tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

        -- Remover policies antigas que podem estar conflitando
        DROP POLICY IF EXISTS "proposals.insert.owner" ON public.proposals;
        DROP POLICY IF EXISTS "proposals.read.owner_or_admin" ON public.proposals;
        DROP POLICY IF EXISTS "proposals.update.owner_or_admin" ON public.proposals;
        DROP POLICY IF EXISTS "proposals_owner_insert" ON public.proposals;
        DROP POLICY IF EXISTS "proposals_owner_read" ON public.proposals;
        DROP POLICY IF EXISTS "proposals_owner_update" ON public.proposals;

        -- Policy INSERT: Usuários autenticados podem criar propostas
        CREATE POLICY "proposals_insert_authenticated"
        ON public.proposals
        FOR INSERT
        TO authenticated
        WITH CHECK (
            -- Definir created_by como o usuário atual no insert
            auth.uid() IS NOT NULL
        );

        -- Policy SELECT: Donos podem ver suas propostas, admins veem tudo
        CREATE POLICY "proposals_select_owner_or_admin"
        ON public.proposals
        FOR SELECT
        TO authenticated
        USING (
            -- Admin pode ver tudo
            is_admin() OR 
            -- Dono pode ver suas propostas
            created_by = auth.uid() OR
            -- Propostas sem dono (legacy) podem ser vistas por todos autenticados
            created_by IS NULL
        );

        -- Policy UPDATE: Donos podem editar suas propostas, admins podem editar tudo
        CREATE POLICY "proposals_update_owner_or_admin"
        ON public.proposals
        FOR UPDATE
        TO authenticated
        USING (
            -- Admin pode editar tudo
            is_admin() OR 
            -- Dono pode editar suas propostas
            created_by = auth.uid() OR
            -- Propostas sem dono (legacy) podem ser editadas por todos autenticados
            created_by IS NULL
        )
        WITH CHECK (
            -- Admin pode fazer qualquer coisa, outros mantêm as mesmas regras
            is_admin() OR 
            created_by = auth.uid() OR
            created_by IS NULL
        );

        -- Policy DELETE já existe: "Only admins can delete proposals"
    END IF;
END $$;

-- ===============================
-- 5. RLS POLICIES PARA PROPOSAL_SCREENS (NOVA)
-- ===============================

-- Habilitar RLS na tabela proposal_screens - apenas se tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposal_screens' AND table_schema = 'public') THEN
        ALTER TABLE public.proposal_screens ENABLE ROW LEVEL SECURITY;

        -- Remover policies antigas que podem estar conflitando
        DROP POLICY IF EXISTS "proposal_screens_insert" ON public.proposal_screens;
        DROP POLICY IF EXISTS "proposal_screens_select" ON public.proposal_screens;
        DROP POLICY IF EXISTS "proposal_screens_update" ON public.proposal_screens;
        DROP POLICY IF EXISTS "proposal_screens_delete" ON public.proposal_screens;

        -- Policy INSERT: Usuários que podem editar a proposta podem adicionar telas
        CREATE POLICY "proposal_screens_insert_proposal_owner"
        ON public.proposal_screens
        FOR INSERT
        TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.proposals p
                WHERE p.id = proposal_id
                AND (
                    is_admin() OR 
                    p.created_by = auth.uid() OR
                    p.created_by IS NULL
                )
            )
        );

        -- Policy SELECT: Usuários que podem ver a proposta podem ver suas telas
        CREATE POLICY "proposal_screens_select_proposal_owner"
        ON public.proposal_screens
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.proposals p
                WHERE p.id = proposal_id
                AND (
                    is_admin() OR 
                    p.created_by = auth.uid() OR
                    p.created_by IS NULL
                )
            )
        );

        -- Policy UPDATE: Usuários que podem editar a proposta podem editar suas telas
        CREATE POLICY "proposal_screens_update_proposal_owner"
        ON public.proposal_screens
        FOR UPDATE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.proposals p
                WHERE p.id = proposal_id
                AND (
                    is_admin() OR 
                    p.created_by = auth.uid() OR
                    p.created_by IS NULL
                )
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.proposals p
                WHERE p.id = proposal_id
                AND (
                    is_admin() OR 
                    p.created_by = auth.uid() OR
                    p.created_by IS NULL
                )
            )
        );

        -- Policy DELETE: Usuários que podem editar a proposta podem remover telas
        CREATE POLICY "proposal_screens_delete_proposal_owner"
        ON public.proposal_screens
        FOR DELETE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.proposals p
                WHERE p.id = proposal_id
                AND (
                    is_admin() OR 
                    p.created_by = auth.uid() OR
                    p.created_by IS NULL
                )
            )
        );
    END IF;
END $$;

-- ===============================
-- 6. TRIGGER PARA DEFINIR CREATED_BY AUTOMATICAMENTE
-- ===============================

-- Função para definir created_by automaticamente no insert
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Se created_by não foi definido, usar o usuário atual
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    RETURN NEW;
END$$;

-- Aplicar trigger apenas se a coluna created_by existir e tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        IF public.check_column_exists('proposals', 'created_by') THEN
            DROP TRIGGER IF EXISTS set_proposals_created_by ON public.proposals;
            CREATE TRIGGER set_proposals_created_by
                BEFORE INSERT ON public.proposals
                FOR EACH ROW
                EXECUTE FUNCTION public.set_created_by();
        END IF;
    END IF;
END$$;

-- ===============================
-- 7. LIMPEZA E DOCUMENTAÇÃO
-- ===============================

-- Remover função temporária
DROP FUNCTION IF EXISTS public.check_column_exists(text, text);

-- Comentários de documentação (condicionais)
DO $$
BEGIN
    -- Comentários para policies de proposals (apenas se existirem)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'proposals_insert_authenticated' AND tablename = 'proposals') THEN
            EXECUTE 'COMMENT ON POLICY "proposals_insert_authenticated" ON public.proposals IS ''Permite que usuários autenticados criem propostas. O created_by é definido automaticamente.''';
        END IF;
        
        IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'proposals_select_owner_or_admin' AND tablename = 'proposals') THEN
            EXECUTE 'COMMENT ON POLICY "proposals_select_owner_or_admin" ON public.proposals IS ''Permite que donos vejam suas propostas e admins vejam tudo. Propostas legacy (sem dono) são visíveis para todos.''';
        END IF;
        
        IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'proposals_update_owner_or_admin' AND tablename = 'proposals') THEN
            EXECUTE 'COMMENT ON POLICY "proposals_update_owner_or_admin" ON public.proposals IS ''Permite que donos editem suas propostas e admins editem tudo. Protege contra alteração maliciosa do created_by.''';
        END IF;
    END IF;
    
    -- Comentários para policies de proposal_screens (apenas se existirem)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposal_screens' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'proposal_screens_select_proposal_owner' AND tablename = 'proposal_screens') THEN
            EXECUTE 'COMMENT ON POLICY "proposal_screens_select_proposal_owner" ON public.proposal_screens IS ''Permite acesso às telas de proposta baseado nas permissões da proposta pai.''';
        END IF;
    END IF;
    
    -- Comentários para funções (apenas se existirem)
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        EXECUTE 'COMMENT ON FUNCTION public.update_updated_at_column() IS ''Função para atualizar automaticamente a coluna updated_at em triggers BEFORE UPDATE.''';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_created_by' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        EXECUTE 'COMMENT ON FUNCTION public.set_created_by() IS ''Função para definir automaticamente created_by como auth.uid() em triggers BEFORE INSERT.''';
    END IF;
END $$;

COMMIT;
