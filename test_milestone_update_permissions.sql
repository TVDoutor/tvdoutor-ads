-- Script para testar permissões de UPDATE na tabela agencia_projeto_marcos
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'agencia_projeto_marcos';

-- 2. Verificar políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'agencia_projeto_marcos';

-- 3. Verificar permissões da tabela
SELECT grantee, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'agencia_projeto_marcos' 
AND table_schema = 'public';

-- 4. Testar UPDATE (substitua 'SEU_USER_ID' pelo ID do usuário atual)
-- SELECT auth.uid(); -- Execute isso primeiro para obter seu user ID

-- 5. Verificar se há dados na tabela
SELECT COUNT(*) as total_marcos FROM public.agencia_projeto_marcos;

-- 6. Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'agencia_projeto_marcos' 
AND table_schema = 'public'
ORDER BY ordinal_position;
