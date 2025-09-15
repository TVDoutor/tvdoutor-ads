-- ===============================
-- CORREÇÃO DA ESTRUTURA DA TABELA EMAIL_LOGS
-- ===============================

-- Garantir que todos os campos necessários existam na tabela email_logs
DO $$
BEGIN
    -- Adicionar customer_name se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_logs' AND column_name = 'customer_name') THEN
        ALTER TABLE public.email_logs ADD COLUMN customer_name TEXT;
    END IF;
    
    -- Adicionar proposal_type se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'email_logs' AND column_name = 'proposal_type') THEN
        ALTER TABLE public.email_logs ADD COLUMN proposal_type TEXT;
    END IF;
END $$;

-- ===============================
-- POLÍTICAS RLS PARA EMAIL_LOGS
-- ===============================

-- Habilitar RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "email_logs_policy" ON public.email_logs;
DROP POLICY IF EXISTS "email_logs_read_policy" ON public.email_logs;
DROP POLICY IF EXISTS "email_logs_write_policy" ON public.email_logs;
DROP POLICY IF EXISTS "email_logs_insert_policy" ON public.email_logs;
DROP POLICY IF EXISTS "email_logs_update_policy" ON public.email_logs;
DROP POLICY IF EXISTS "email_logs_delete_policy" ON public.email_logs;

-- Política de leitura: usuários autenticados podem ver seus próprios logs
CREATE POLICY "email_logs_read_policy" ON public.email_logs
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND (
            is_super_admin() OR
            created_by = auth.uid()
        )
    );

-- Política de inserção: sistema pode inserir logs
CREATE POLICY "email_logs_insert_policy" ON public.email_logs
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL OR
        current_setting('role') = 'service_role'
    );

-- Política de atualização: sistema pode atualizar status dos logs
CREATE POLICY "email_logs_update_policy" ON public.email_logs
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND (
            is_super_admin() OR
            created_by = auth.uid() OR
            current_setting('role') = 'service_role'
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND (
            is_super_admin() OR
            created_by = auth.uid() OR
            current_setting('role') = 'service_role'
        )
    );

-- Política de exclusão: apenas super admins
CREATE POLICY "email_logs_delete_policy" ON public.email_logs
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND is_super_admin()
    );

-- ===============================
-- FUNÇÃO PARA POPULAR CAMPOS FALTANTES
-- ===============================

CREATE OR REPLACE FUNCTION populate_email_logs_missing_fields()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Atualizar registros que não têm customer_name ou proposal_type
    UPDATE public.email_logs el
    SET 
        customer_name = COALESCE(el.customer_name, p.customer_name),
        proposal_type = COALESCE(el.proposal_type, p.proposal_type)
    FROM public.proposals p
    WHERE el.proposal_id = p.id
      AND (el.customer_name IS NULL OR el.proposal_type IS NULL);
      
    RAISE NOTICE 'Campos faltantes populados com sucesso';
END;
$$;

-- Executar a função para popular campos faltantes
SELECT populate_email_logs_missing_fields();

-- ===============================
-- TRIGGER PARA POPULAR CAMPOS AUTOMATICAMENTE
-- ===============================

CREATE OR REPLACE FUNCTION set_email_log_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    proposal_data RECORD;
BEGIN
    -- Se customer_name ou proposal_type não foram fornecidos, buscar da proposta
    IF NEW.customer_name IS NULL OR NEW.proposal_type IS NULL THEN
        SELECT customer_name, proposal_type
        INTO proposal_data
        FROM public.proposals
        WHERE id = NEW.proposal_id;
        
        NEW.customer_name := COALESCE(NEW.customer_name, proposal_data.customer_name);
        NEW.proposal_type := COALESCE(NEW.proposal_type, proposal_data.proposal_type);
    END IF;
    
    -- Definir created_by se não foi fornecido
    IF NEW.created_by IS NULL THEN
        NEW.created_by := auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_set_email_log_fields ON public.email_logs;
CREATE TRIGGER trigger_set_email_log_fields
    BEFORE INSERT ON public.email_logs
    FOR EACH ROW
    EXECUTE FUNCTION set_email_log_fields();

-- ===============================
-- COMENTÁRIOS
-- ===============================

COMMENT ON TABLE public.email_logs IS 'Logs de emails enviados pelo sistema';
COMMENT ON COLUMN public.email_logs.customer_name IS 'Nome do cliente (copiado da proposta)';
COMMENT ON COLUMN public.email_logs.proposal_type IS 'Tipo da proposta (avulsa/projeto)';
COMMENT ON FUNCTION populate_email_logs_missing_fields() IS 'Popula campos faltantes nos logs de email';
COMMENT ON FUNCTION set_email_log_fields() IS 'Trigger para definir campos automaticamente nos logs de email';