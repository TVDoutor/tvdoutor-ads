-- ===============================
-- PARTE 1: Sistema de Status para Propostas
-- Date: 2025-09-02
-- Implementação incremental - não quebra o sistema existente
-- ===============================

BEGIN;

-- ===============================
-- 1. CRIAR ENUM DE STATUS (SE NÃO EXISTIR)
-- ===============================

-- Criar tipo enum para status das propostas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proposal_status') THEN
        CREATE TYPE public.proposal_status AS ENUM (
            'rascunho',      -- Proposta sendo criada/editada
            'enviada',       -- Proposta enviada para cliente
            'em_analise',    -- Cliente analisando proposta
            'aceita',        -- Cliente aceitou proposta
            'rejeitada'      -- Cliente rejeitou proposta
        );
    END IF;
END$$;

-- ===============================
-- 2. ADICIONAR COLUNA STATUS (SEGURO)
-- ===============================

-- Adicionar coluna status se não existir - apenas se tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'proposals' 
            AND column_name = 'status' 
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.proposals 
            ADD COLUMN status public.proposal_status DEFAULT 'rascunho';
            
            -- Definir status inicial para propostas existentes
            -- Propostas existentes ficam como 'enviada' (já estão prontas)
            UPDATE public.proposals 
            SET status = 'enviada'
            WHERE status IS NULL;
        END IF;
    END IF;
END$$;

-- ===============================
-- 3. ADICIONAR CAMPOS COMPLEMENTARES
-- ===============================

-- Adicionar campos para controle de envio de email - apenas se tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        -- Campo para controlar se email foi enviado
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'proposals' 
            AND column_name = 'email_sent_at' 
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.proposals 
            ADD COLUMN email_sent_at TIMESTAMP WITH TIME ZONE;
        END IF;
        
        -- Campo para armazenar observações/notas
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'proposals' 
            AND column_name = 'notes' 
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.proposals 
            ADD COLUMN notes TEXT;
        END IF;
        
        -- Campo para data de última alteração de status
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'proposals' 
            AND column_name = 'status_updated_at' 
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.proposals 
            ADD COLUMN status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        END IF;
    END IF;
END$$;

-- ===============================
-- 4. TRIGGER PARA ATUALIZAR STATUS_UPDATED_AT
-- ===============================

-- Função para atualizar status_updated_at quando status muda
CREATE OR REPLACE FUNCTION public.update_proposal_status_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Se o status mudou, atualizar timestamp
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.status_updated_at = now();
    END IF;
    RETURN NEW;
END$$;

-- Aplicar trigger apenas se a coluna status_updated_at existir e tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'proposals' 
            AND column_name = 'status_updated_at' 
            AND table_schema = 'public'
        ) THEN
            DROP TRIGGER IF EXISTS update_proposal_status_timestamp ON public.proposals;
            CREATE TRIGGER update_proposal_status_timestamp
                BEFORE UPDATE ON public.proposals
                FOR EACH ROW
                EXECUTE FUNCTION public.update_proposal_status_timestamp();
        END IF;
    END IF;
END$$;

-- ===============================
-- 5. ÍNDICES PARA PERFORMANCE
-- ===============================

-- Índices condicionais - apenas se tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        -- Índice para consultas por status
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status)';
        
        -- Índice composto para consultas por usuário e status
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_proposals_user_status ON public.proposals(created_by, status)';
        
        -- Índice para ordenação por data de atualização de status
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_proposals_status_updated ON public.proposals(status_updated_at DESC)';
    END IF;
END $$;

-- ===============================
-- 6. VIEW PARA ESTATÍSTICAS DE PROPOSTAS
-- ===============================

-- View para estatísticas rápidas por status - apenas se tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        EXECUTE 'CREATE OR REPLACE VIEW public.proposal_status_stats AS
        SELECT 
            status,
            COUNT(*) as total,
            COUNT(CASE WHEN created_by = auth.uid() THEN 1 END) as my_count
        FROM public.proposals
        WHERE (
            -- Aplicar mesma lógica RLS da tabela
            is_admin() OR 
            created_by = auth.uid() OR
            created_by IS NULL
        )
        GROUP BY status';
    END IF;
END $$;

-- ===============================
-- 7. FUNÇÃO PARA ALTERAR STATUS (SEGURA)
-- ===============================

-- Função para alterar status de proposta com validação - apenas se tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        EXECUTE 'CREATE OR REPLACE FUNCTION public.update_proposal_status(
            p_proposal_id bigint,
            p_new_status public.proposal_status,
            p_notes text DEFAULT NULL
        )
        RETURNS boolean
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $func$
        DECLARE
            v_current_status public.proposal_status;
            v_can_update boolean := false;
        BEGIN
            -- Verificar se usuário pode editar esta proposta
            SELECT status INTO v_current_status
            FROM public.proposals
            WHERE id = p_proposal_id
            AND (
                is_admin() OR 
                created_by = auth.uid() OR
                created_by IS NULL
            );
            
            IF NOT FOUND THEN
                RAISE EXCEPTION ''Proposta não encontrada ou sem permissão para editar'';
            END IF;
            
            -- Validar transições de status (regras de negócio)
            CASE v_current_status
                WHEN ''rascunho'' THEN
                    v_can_update := p_new_status IN (''enviada'', ''rascunho'');
                WHEN ''enviada'' THEN
                    v_can_update := p_new_status IN (''em_analise'', ''aceita'', ''rejeitada'');
                WHEN ''em_analise'' THEN
                    v_can_update := p_new_status IN (''aceita'', ''rejeitada'', ''enviada'');
                WHEN ''aceita'' THEN
                    v_can_update := is_admin(); -- Só admin pode alterar proposta aceita
                WHEN ''rejeitada'' THEN
                    v_can_update := p_new_status IN (''enviada'', ''rascunho''); -- Pode reenviar
            END CASE;
            
            IF NOT v_can_update THEN
                RAISE EXCEPTION ''Transição de status inválida de % para %'', v_current_status, p_new_status;
            END IF;
            
            -- Atualizar status e notas
            UPDATE public.proposals
            SET 
                status = p_new_status,
                notes = COALESCE(p_notes, notes),
                updated_at = now()
            WHERE id = p_proposal_id;
            
            RETURN true;
        END$func$';
    END IF;
END $$;

-- ===============================
-- 8. COMENTÁRIOS DE DOCUMENTAÇÃO
-- ===============================

-- Comentários apenas se os objetos existirem
DO $$
BEGIN
    -- Comentário no tipo ENUM
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proposal_status' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        COMMENT ON TYPE public.proposal_status IS 'Status das propostas: rascunho -> enviada -> em_analise -> aceita/rejeitada';
    END IF;
    
    -- Comentários nas colunas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'status' AND table_schema = 'public') THEN
            COMMENT ON COLUMN public.proposals.status IS 'Status atual da proposta seguindo fluxo de aprovação';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'email_sent_at' AND table_schema = 'public') THEN
            COMMENT ON COLUMN public.proposals.email_sent_at IS 'Timestamp de quando o email da proposta foi enviado ao cliente';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'notes' AND table_schema = 'public') THEN
            COMMENT ON COLUMN public.proposals.notes IS 'Observações e notas sobre a proposta';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposals' AND column_name = 'status_updated_at' AND table_schema = 'public') THEN
            COMMENT ON COLUMN public.proposals.status_updated_at IS 'Timestamp da última alteração de status';
        END IF;
    END IF;
    
    -- Comentário na função
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_proposal_status' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        COMMENT ON FUNCTION public.update_proposal_status(bigint, public.proposal_status, text) IS 'Função segura para alterar status de proposta com validação de regras de negócio';
    END IF;
    
    -- Comentário na view
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'proposal_status_stats' AND schemaname = 'public') THEN
        COMMENT ON VIEW public.proposal_status_stats IS 'Estatísticas de propostas por status respeitando RLS do usuário';
    END IF;
END $$;

COMMIT;

