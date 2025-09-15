-- Corrigir políticas RLS para tabela email_logs
-- Esta migração resolve definitivamente os problemas de permissão 403 Forbidden
-- Data: 2025-01-28

BEGIN;

-- 1. Remover todas as políticas existentes da tabela email_logs
DROP POLICY IF EXISTS "email_logs_read_policy" ON public.email_logs;
DROP POLICY IF EXISTS "email_logs_insert_policy" ON public.email_logs;
DROP POLICY IF EXISTS "email_logs_update_policy" ON public.email_logs;
DROP POLICY IF EXISTS "Authenticated users can view email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Authenticated users can insert email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Authenticated users can update email logs" ON public.email_logs;

-- 2. Garantir que a tabela email_logs existe com a estrutura correta
CREATE TABLE IF NOT EXISTS public.email_logs (
    id BIGSERIAL PRIMARY KEY,
    proposal_id BIGINT REFERENCES public.proposals(id) ON DELETE CASCADE,
    email_type VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_type VARCHAR(50) NOT NULL,
    subject TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    -- Campos adicionais para compatibilidade
    log_id BIGINT GENERATED ALWAYS AS (id) STORED,
    customer_name TEXT,
    proposal_type TEXT
);

-- 3. Adicionar colunas se não existirem
DO $$
BEGIN
    -- Adicionar colunas que podem estar faltando
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_logs' AND column_name = 'customer_name') THEN
        ALTER TABLE public.email_logs ADD COLUMN customer_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_logs' AND column_name = 'proposal_type') THEN
        ALTER TABLE public.email_logs ADD COLUMN proposal_type TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_logs' AND column_name = 'log_id') THEN
        ALTER TABLE public.email_logs ADD COLUMN log_id BIGINT GENERATED ALWAYS AS (id) STORED;
    END IF;
END $$;

-- 4. Habilitar RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas permissivas para email_logs
-- Política de leitura: usuários autenticados podem ver todos os logs
CREATE POLICY "email_logs_select_all_authenticated"
ON public.email_logs
FOR SELECT
TO authenticated
USING (true);

-- Política de inserção: usuários autenticados podem inserir logs
CREATE POLICY "email_logs_insert_authenticated"
ON public.email_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Política de atualização: usuários autenticados podem atualizar logs
CREATE POLICY "email_logs_update_authenticated"
ON public.email_logs
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. Garantir permissões básicas
GRANT ALL ON public.email_logs TO authenticated;
GRANT USAGE ON SEQUENCE public.email_logs_id_seq TO authenticated;

-- 7. Recriar a view email_stats com políticas adequadas
DROP VIEW IF EXISTS public.email_stats CASCADE;

CREATE VIEW public.email_stats AS
SELECT 
    email_type,
    status,
    COUNT(*) as total,
    COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as last_7_days
FROM public.email_logs
GROUP BY email_type, status;

-- Permitir acesso à view para usuários autenticados
GRANT SELECT ON public.email_stats TO authenticated;

-- 8. Recriar função para buscar emails pendentes com SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_pending_emails(p_limit INTEGER DEFAULT 10)
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
AS $$
    SELECT 
        el.id as log_id,
        el.proposal_id,
        el.email_type,
        el.recipient_email,
        el.recipient_type,
        el.subject,
        COALESCE(el.customer_name, p.customer_name) as customer_name,
        COALESCE(el.proposal_type, p.proposal_type) as proposal_type,
        el.created_at
    FROM public.email_logs el
    LEFT JOIN public.proposals p ON p.id = el.proposal_id
    WHERE el.status = 'pending'
    ORDER BY el.created_at ASC
    LIMIT p_limit;
$$;

-- 9. Comentários para documentação
COMMENT ON TABLE public.email_logs IS 'Log de todos os emails enviados relacionados a propostas - políticas RLS corrigidas';
COMMENT ON POLICY "email_logs_select_all_authenticated" ON public.email_logs IS 'Permite que usuários autenticados vejam todos os logs de email';
COMMENT ON POLICY "email_logs_insert_authenticated" ON public.email_logs IS 'Permite que usuários autenticados insiram logs de email';
COMMENT ON POLICY "email_logs_update_authenticated" ON public.email_logs IS 'Permite que usuários autenticados atualizem logs de email';

COMMIT;
