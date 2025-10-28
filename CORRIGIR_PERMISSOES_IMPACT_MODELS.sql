-- =========================================================================
-- CORREÇÃO URGENTE: Permissões da tabela impact_models
-- Data: 28/10/2025
-- Descrição: Corrigir políticas RLS que estão bloqueando acesso
-- =========================================================================

-- DIAGNÓSTICO: Verificar estado atual
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'impact_models';

-- PASSO 1: Desabilitar RLS temporariamente para teste
-- (Comente esta linha após confirmar que o problema é RLS)
-- ALTER TABLE public.impact_models DISABLE ROW LEVEL SECURITY;

-- PASSO 2: Remover todas as políticas antigas
DROP POLICY IF EXISTS "Authenticated users can read impact models" ON public.impact_models;
DROP POLICY IF EXISTS "Only admins can manage impact models" ON public.impact_models;
DROP POLICY IF EXISTS "Public can view active impact models" ON public.impact_models;
DROP POLICY IF EXISTS "Admins can manage impact models" ON public.impact_models;

-- PASSO 3: Reabilitar RLS
ALTER TABLE public.impact_models ENABLE ROW LEVEL SECURITY;

-- PASSO 4: Criar política PERMISSIVA para leitura (todos autenticados)
CREATE POLICY "allow_authenticated_read_impact_models"
    ON public.impact_models
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- PASSO 5: Criar política para inserção (apenas admins)
CREATE POLICY "allow_admin_insert_impact_models"
    ON public.impact_models
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- PASSO 6: Criar política para atualização (apenas admins)
CREATE POLICY "allow_admin_update_impact_models"
    ON public.impact_models
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- PASSO 7: Criar política para exclusão (apenas super_admins)
CREATE POLICY "allow_superadmin_delete_impact_models"
    ON public.impact_models
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- PASSO 8: Garantir que a tabela seja acessível
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON public.impact_models TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.impact_models TO authenticated;

-- PASSO 9: Verificar políticas criadas
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies
WHERE tablename = 'impact_models'
ORDER BY cmd;

-- PASSO 10: Testar consulta
SELECT 
    id,
    name,
    description,
    traffic_level,
    multiplier,
    active
FROM public.impact_models
WHERE active = true
ORDER BY multiplier DESC;

-- RESULTADO ESPERADO:
-- 3 linhas devem ser retornadas (Fórmula A, B, C)
-- Se retornar vazio, há problema nos dados
-- Se der erro de permissão, há problema nas políticas

-- =========================================================================
-- ALTERNATIVA: Se ainda houver erro, use esta abordagem mais simples
-- =========================================================================

-- Remover RLS completamente (apenas para teste)
-- ALTER TABLE public.impact_models DISABLE ROW LEVEL SECURITY;

-- Ou criar uma política super permissiva temporariamente:
-- DROP POLICY IF EXISTS "temp_allow_all" ON public.impact_models;
-- CREATE POLICY "temp_allow_all" ON public.impact_models FOR ALL USING (true) WITH CHECK (true);

-- =========================================================================
-- VERIFICAÇÃO FINAL
-- =========================================================================

-- 1. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'impact_models';

-- 2. Verificar se há dados
SELECT COUNT(*) as total_formulas FROM public.impact_models;

-- 3. Verificar permissões da tabela
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'impact_models'
ORDER BY grantee, privilege_type;

-- =========================================================================
-- MENSAGEM DE SUCESSO
-- =========================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Políticas de segurança atualizadas com sucesso!';
    RAISE NOTICE '✅ Todos os usuários autenticados podem LER fórmulas';
    RAISE NOTICE '✅ Apenas ADMINs podem CRIAR/EDITAR fórmulas';
    RAISE NOTICE '✅ Apenas SUPER_ADMINs podem EXCLUIR fórmulas';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Próximo passo: Limpar cache do navegador e testar novamente';
END $$;

