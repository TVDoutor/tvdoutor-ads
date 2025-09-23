-- ===============================
-- PARTE 4: Sistema de Notificação por Email
-- Date: 2025-09-02
-- Implementação incremental - sistema de emails
-- ===============================

BEGIN;

-- ===============================
-- 1. TABELA DE LOG DE EMAILS
-- ===============================

-- Criar tabela para rastrear emails enviados
CREATE TABLE IF NOT EXISTS public.email_logs (
    id BIGSERIAL PRIMARY KEY,
    proposal_id BIGINT REFERENCES public.proposals(id) ON DELETE CASCADE,
    email_type VARCHAR(50) NOT NULL, -- 'proposal_created', 'status_changed', 'proposal_sent'
    recipient_email VARCHAR(255) NOT NULL,
    recipient_type VARCHAR(50) NOT NULL, -- 'client', 'user'
    subject TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Adicionar coluna created_by se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_logs' AND column_name = 'created_by' AND table_schema = 'public') THEN
        ALTER TABLE public.email_logs ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- ===============================
-- 2. ÍNDICES PARA PERFORMANCE
-- ===============================

CREATE INDEX IF NOT EXISTS idx_email_logs_proposal_id ON public.email_logs(proposal_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON public.email_logs(email_type);

-- ===============================
-- 3. RLS PARA SEGURANÇA
-- ===============================

-- Habilitar RLS e criar políticas apenas se a tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_logs' AND table_schema = 'public') THEN
        ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
        
        -- Política de leitura: usuários veem logs das suas propostas, admins veem tudo
        DROP POLICY IF EXISTS "email_logs_read_policy" ON public.email_logs;
        CREATE POLICY "email_logs_read_policy"
        ON public.email_logs
        FOR SELECT
        TO authenticated
        USING (
            is_admin() OR 
            created_by = auth.uid()
        );
        
        -- Política de inserção: apenas sistema pode inserir logs
        DROP POLICY IF EXISTS "email_logs_insert_policy" ON public.email_logs;
        CREATE POLICY "email_logs_insert_policy"
        ON public.email_logs
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- ===============================
-- 4. FUNÇÃO PARA CRIAR LOG DE EMAIL
-- ===============================

-- Função para criar log de email - apenas se tabelas existirem
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_logs' AND table_schema = 'public') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        EXECUTE 'CREATE OR REPLACE FUNCTION public.create_email_log(
            p_proposal_id BIGINT,
            p_email_type VARCHAR(50),
            p_recipient_email VARCHAR(255),
            p_recipient_type VARCHAR(50),
            p_subject TEXT
        )
        RETURNS BIGINT
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $func$
        DECLARE
            v_log_id BIGINT;
        BEGIN
            INSERT INTO public.email_logs (
                proposal_id,
                email_type,
                recipient_email,
                recipient_type,
                subject,
                created_by
            ) VALUES (
                p_proposal_id,
                p_email_type,
                p_recipient_email,
                p_recipient_type,
                p_subject,
                auth.uid()
            )
            RETURNING id INTO v_log_id;
            
            RETURN v_log_id;
        END$func$';
    END IF;
END $$;

-- ===============================
-- 5. FUNÇÃO PARA ATUALIZAR STATUS DO EMAIL
-- ===============================

-- Função para atualizar status do email - apenas se tabelas existirem
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_logs' AND table_schema = 'public') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        EXECUTE 'CREATE OR REPLACE FUNCTION public.update_email_status(
            p_log_id BIGINT,
            p_status VARCHAR(20),
            p_error_message TEXT DEFAULT NULL
        )
        RETURNS BOOLEAN
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $func$
        BEGIN
            UPDATE public.email_logs
            SET 
                status = p_status,
                error_message = p_error_message,
                sent_at = CASE WHEN p_status = ''sent'' THEN now() ELSE sent_at END
            WHERE id = p_log_id;
            
            -- Se o email foi enviado com sucesso, atualizar proposta
            IF p_status = ''sent'' THEN
                UPDATE public.proposals
                SET email_sent_at = now()
                WHERE id = (
                    SELECT proposal_id 
                    FROM public.email_logs 
                    WHERE id = p_log_id
                );
            END IF;
            
            RETURN FOUND;
        END$func$';
    END IF;
END $$;

-- ===============================
-- 6. TRIGGER PARA ENVIO AUTOMÁTICO DE EMAILS
-- ===============================

-- Função e trigger para notificações - apenas se tabelas existirem
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_logs' AND table_schema = 'public') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        
        -- Função que será chamada quando uma proposta for criada ou status alterado
        EXECUTE 'CREATE OR REPLACE FUNCTION public.trigger_proposal_email_notifications()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $func$
        DECLARE
            v_user_email TEXT;
            v_client_email TEXT;
            v_user_name TEXT;
            v_proposal_id BIGINT;
            v_customer_name TEXT;
            v_old_status TEXT;
            v_new_status TEXT;
        BEGIN
            v_proposal_id := COALESCE(NEW.id, OLD.id);
            v_client_email := COALESCE(NEW.customer_email, OLD.customer_email);
            v_customer_name := COALESCE(NEW.customer_name, OLD.customer_name);
            v_old_status := OLD.status;
            v_new_status := NEW.status;
            
            -- Buscar informações do usuário
            SELECT 
                u.email,
                COALESCE(u.raw_user_meta_data->>''full_name'', u.email) as name
            INTO v_user_email, v_user_name
            FROM auth.users u
            WHERE u.id = COALESCE(NEW.created_by, OLD.created_by, auth.uid());
            
            -- CASO 1: Nova proposta criada
            IF TG_OP = ''INSERT'' THEN
                -- Log para email do cliente
                PERFORM public.create_email_log(
                    v_proposal_id,
                    ''proposal_created'',
                    v_client_email,
                    ''client'',
                    ''Nova Proposta Comercial - Proposta #'' || v_proposal_id
                );
                
                -- Log para email do usuário (se diferente)
                IF v_user_email IS NOT NULL AND v_user_email != v_client_email THEN
                    PERFORM public.create_email_log(
                        v_proposal_id,
                        ''proposal_created'',
                        v_user_email,
                        ''user'',
                        ''Proposta #'' || v_proposal_id || '' criada com sucesso''
                    );
                END IF;
            END IF;
            
            -- CASO 2: Status da proposta alterado
            IF TG_OP = ''UPDATE'' AND v_old_status IS DISTINCT FROM v_new_status THEN
                -- Log para email do cliente (apenas se status for relevante para cliente)
                IF v_new_status IN (''enviada'', ''aceita'', ''rejeitada'') THEN
                    PERFORM public.create_email_log(
                        v_proposal_id,
                        ''status_changed'',
                        v_client_email,
                        ''client'',
                        ''Proposta #'' || v_proposal_id || '' - Status: '' || 
                        CASE v_new_status
                            WHEN ''enviada'' THEN ''Proposta Enviada''
                            WHEN ''aceita'' THEN ''Proposta Aceita''
                            WHEN ''rejeitada'' THEN ''Proposta Rejeitada''
                            ELSE INITCAP(v_new_status)
                        END
                    );
                END IF;
                
                -- Log para email do usuário
                IF v_user_email IS NOT NULL THEN
                    PERFORM public.create_email_log(
                        v_proposal_id,
                        ''status_changed'',
                        v_user_email,
                        ''user'',
                        ''Proposta #'' || v_proposal_id || '' - Status alterado para '' || v_new_status
                    );
                END IF;
            END IF;
            
            RETURN COALESCE(NEW, OLD);
        END$func$';
        
        -- Criar trigger na tabela proposals
        DROP TRIGGER IF EXISTS trigger_proposal_email_notifications ON public.proposals;
        CREATE TRIGGER trigger_proposal_email_notifications
            AFTER INSERT OR UPDATE OF status ON public.proposals
            FOR EACH ROW
            EXECUTE FUNCTION public.trigger_proposal_email_notifications();
    END IF;
END $$;

-- ===============================
-- 7. VIEW PARA ESTATÍSTICAS DE EMAIL
-- ===============================

-- View para estatísticas de email - apenas se tabelas existirem
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_logs' AND table_schema = 'public') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        EXECUTE 'CREATE OR REPLACE VIEW public.email_stats AS
        SELECT 
            email_type,
            status,
            COUNT(*) as total,
            COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today,
            COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL ''7 days'' THEN 1 END) as last_7_days
        FROM public.email_logs
        WHERE (
            -- Aplicar mesma lógica RLS
            is_admin() OR 
            created_by = auth.uid()
        )
        GROUP BY email_type, status';
    END IF;
END $$;

-- ===============================
-- 8. FUNÇÃO PARA BUSCAR EMAILS PENDENTES
-- ===============================

-- Função para buscar emails pendentes - apenas se tabelas existirem
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_logs' AND table_schema = 'public') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        EXECUTE 'CREATE OR REPLACE FUNCTION public.get_pending_emails(p_limit INTEGER DEFAULT 10)
        RETURNS TABLE (
            log_id BIGINT,
            proposal_id BIGINT,
            email_type VARCHAR(50),
            recipient_email VARCHAR(255),
            recipient_type VARCHAR(50),
            subject TEXT,
            customer_name VARCHAR(255),
            proposal_type VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE
        )
        LANGUAGE sql
        SECURITY DEFINER
        SET search_path = public
        AS $func$
            SELECT 
                el.id as log_id,
                el.proposal_id,
                el.email_type,
                el.recipient_email,
                el.recipient_type,
                el.subject,
                p.customer_name,
                p.proposal_type,
                el.created_at
            FROM public.email_logs el
            JOIN public.proposals p ON p.id = el.proposal_id
            WHERE el.status = ''pending''
            ORDER BY el.created_at ASC
            LIMIT p_limit;
        $func$';
    END IF;
END $$;

-- ===============================
-- 9. COMENTÁRIOS DE DOCUMENTAÇÃO
-- ===============================

-- Comentários apenas se os objetos existirem
DO $$
BEGIN
    -- Comentário na tabela
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_logs' AND table_schema = 'public') THEN
        COMMENT ON TABLE public.email_logs IS 'Log de todos os emails enviados relacionados a propostas';
    END IF;
    
    -- Comentários nas funções
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_email_log' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        COMMENT ON FUNCTION public.create_email_log(BIGINT, VARCHAR(50), VARCHAR(255), VARCHAR(50), TEXT) IS 'Cria um log de email para ser processado pelo sistema de envio';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_email_status' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        COMMENT ON FUNCTION public.update_email_status(BIGINT, VARCHAR(20), TEXT) IS 'Atualiza o status de um email (pending -> sent/failed)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trigger_proposal_email_notifications' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        COMMENT ON FUNCTION public.trigger_proposal_email_notifications() IS 'Trigger que cria logs de email quando propostas são criadas ou têm status alterado';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_pending_emails' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        COMMENT ON FUNCTION public.get_pending_emails(INTEGER) IS 'Busca emails pendentes para processamento';
    END IF;
    
    -- Comentário na view
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'email_stats' AND schemaname = 'public') THEN
        COMMENT ON VIEW public.email_stats IS 'Estatísticas de emails por tipo e status respeitando RLS';
    END IF;
END $$;

COMMIT;

