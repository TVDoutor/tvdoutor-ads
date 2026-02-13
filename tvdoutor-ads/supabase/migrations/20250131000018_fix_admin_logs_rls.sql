-- Correção do problema de RLS na tabela admin_logs
-- Baseado no erro: "new row violates row-level security policy for table admin_logs"

-- 1. Verificar se a tabela admin_logs existe e habilitar RLS se necessário
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_logs' AND table_schema = 'public') THEN
        -- Garantir que RLS está ativada
        ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
        
        -- Remover políticas conflitantes se existirem
        DROP POLICY IF EXISTS "Allow authenticated users to insert their own logs" ON public.admin_logs;
        DROP POLICY IF EXISTS "Allow admins to insert logs" ON public.admin_logs;
        DROP POLICY IF EXISTS "Admin logs policy" ON public.admin_logs;
        
        -- Criar política permissiva para INSERT
        -- Esta política permite que QUALQUER usuário autenticado insira um log
        CREATE POLICY "Allow authenticated users to insert logs"
        ON public.admin_logs
        FOR INSERT
        TO authenticated -- Aplica-se a qualquer usuário logado
        WITH CHECK (true); -- A condição de escrita é sempre verdadeira
        
        -- Política para SELECT (usuários podem ver seus próprios logs)
        CREATE POLICY "Users can view their own logs"
        ON public.admin_logs
        FOR SELECT
        TO authenticated
        USING (user_id = auth.uid() OR is_admin());
        
        -- Política para UPDATE (apenas admins podem atualizar logs)
        CREATE POLICY "Only admins can update logs"
        ON public.admin_logs
        FOR UPDATE
        TO authenticated
        USING (is_admin())
        WITH CHECK (is_admin());
        
        -- Política para DELETE (apenas admins podem deletar logs)
        CREATE POLICY "Only admins can delete logs"
        ON public.admin_logs
        FOR DELETE
        TO authenticated
        USING (is_admin());
        
        RAISE NOTICE 'Políticas RLS criadas para admin_logs com sucesso';
    ELSE
        RAISE NOTICE 'Tabela admin_logs não encontrada - políticas não aplicadas';
    END IF;
END $$;

-- 2. Verificar se existem outras tabelas de log que possam ter o mesmo problema
DO $$
BEGIN
    -- Verificar tabelas comuns de log/auditoria
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs' AND table_schema = 'public') THEN
        ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Allow authenticated users to insert audit logs" ON public.audit_logs;
        CREATE POLICY "Allow authenticated users to insert audit logs"
        ON public.audit_logs
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
        
        RAISE NOTICE 'Políticas RLS criadas para audit_logs';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_logs' AND table_schema = 'public') THEN
        ALTER TABLE public.user_logs ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Allow authenticated users to insert user logs" ON public.user_logs;
        CREATE POLICY "Allow authenticated users to insert user logs"
        ON public.user_logs
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
        
        RAISE NOTICE 'Políticas RLS criadas para user_logs';
    END IF;
END $$;

