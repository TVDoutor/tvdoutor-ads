-- Script para migrar roles no Supabase
-- Execute este script no Supabase SQL Editor
-- admin -> super_admin
-- manager -> admin

-- PARTE 1: DIAGNÓSTICO INICIAL
SELECT 'DIAGNÓSTICO: Verificando roles atuais na tabela profiles' as info;

-- Verificar distribuição atual de roles
SELECT 
    'DISTRIBUIÇÃO ATUAL DE ROLES' as info,
    role,
    COUNT(*) as quantidade
FROM public.profiles 
GROUP BY role
ORDER BY role;

-- Listar usuários que serão afetados
SELECT 
    'USUÁRIOS QUE SERÃO MIGRADOS' as info,
    id,
    full_name,
    email,
    role as role_atual,
    CASE 
        WHEN role = 'admin' THEN 'super_admin'
        WHEN role = 'manager' THEN 'admin'
        ELSE role
    END as novo_role
FROM public.profiles 
WHERE role IN ('admin', 'manager')
ORDER BY role, full_name;

-- PARTE 2: BACKUP DOS DADOS ATUAIS
SELECT 'CRIANDO BACKUP DOS ROLES ATUAIS' as info;

-- Criar tabela temporária de backup
CREATE TEMP TABLE profiles_backup AS 
SELECT id, full_name, email, role, created_at, updated_at
FROM public.profiles;

SELECT 'Backup criado com ' || COUNT(*) || ' registros' as info
FROM profiles_backup;

-- PARTE 3: VERIFICAR SE ENUM SUPORTA OS NOVOS VALORES
SELECT 'VERIFICANDO ENUM role_kind' as info;

-- Verificar valores disponíveis no enum
SELECT 
    'VALORES DISPONÍVEIS NO ENUM role_kind' as info,
    unnest(enum_range(NULL::role_kind)) as valores_enum;

-- Verificar se super_admin existe no enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'role_kind'::regtype 
        AND enumlabel = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'ERRO: Valor super_admin não existe no enum role_kind. Execute primeiro o script fix_role_kind_enum.sql';
    ELSE
        RAISE NOTICE 'OK: Valor super_admin existe no enum role_kind';
    END IF;
END $$;

-- PARTE 4: EXECUTAR MIGRAÇÃO DOS ROLES
SELECT 'INICIANDO MIGRAÇÃO DOS ROLES' as info;

-- Migrar admin -> super_admin
UPDATE public.profiles 
SET 
    role = 'super_admin'::role_kind,
    updated_at = NOW()
WHERE role = 'admin';

SELECT 'Migrados ' || ROW_COUNT() || ' usuários de admin para super_admin' as info;

-- Migrar manager -> admin
UPDATE public.profiles 
SET 
    role = 'admin'::role_kind,
    updated_at = NOW()
WHERE role = 'manager';

SELECT 'Migrados ' || ROW_COUNT() || ' usuários de manager para admin' as info;

-- PARTE 5: VERIFICAÇÃO PÓS-MIGRAÇÃO
SELECT 'VERIFICAÇÃO PÓS-MIGRAÇÃO' as info;

-- Verificar nova distribuição de roles
SELECT 
    'NOVA DISTRIBUIÇÃO DE ROLES' as info,
    role,
    COUNT(*) as quantidade
FROM public.profiles 
GROUP BY role
ORDER BY role;

-- Listar usuários migrados
SELECT 
    'USUÁRIOS APÓS MIGRAÇÃO' as info,
    id,
    full_name,
    email,
    role,
    updated_at
FROM public.profiles 
WHERE role IN ('super_admin', 'admin')
ORDER BY role, full_name;

-- Verificar se ainda existem roles antigos
SELECT 
    'VERIFICANDO ROLES ANTIGOS REMANESCENTES' as info,
    COUNT(*) as quantidade_manager_restante
FROM public.profiles 
WHERE role = 'manager';

-- PARTE 6: ATUALIZAR FUNÇÃO is_admin SE NECESSÁRIO
SELECT 'ATUALIZANDO FUNÇÃO is_admin PARA INCLUIR super_admin' as info;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verificar se a tabela profiles existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'profiles' AND table_schema = 'public'
    ) THEN
        RETURN EXISTS (
            SELECT 1 
            FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        );
    ELSE
        -- Se não existe tabela profiles, considerar todos como admin temporariamente
        RETURN true;
    END IF;
END;
$$;

-- PARTE 7: CRIAR FUNÇÃO is_super_admin
SELECT 'CRIANDO FUNÇÃO is_super_admin' as info;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verificar se a tabela profiles existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'profiles' AND table_schema = 'public'
    ) THEN
        RETURN EXISTS (
            SELECT 1 
            FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        );
    ELSE
        -- Se não existe tabela profiles, retornar false
        RETURN false;
    END IF;
END;
$$;

-- PARTE 8: TESTAR FUNÇÕES
SELECT 'TESTANDO FUNÇÕES DE PERMISSÃO' as info;

SELECT 
    'TESTE FUNÇÃO is_admin' as info, 
    is_admin() as resultado;

SELECT 
    'TESTE FUNÇÃO is_super_admin' as info, 
    is_super_admin() as resultado;

-- PARTE 9: VERIFICAÇÕES FINAIS DE SEGURANÇA
SELECT 'VERIFICAÇÕES FINAIS DE SEGURANÇA' as info;

-- Verificar se existem usuários sem role definido
SELECT 
    'USUÁRIOS SEM ROLE DEFINIDO' as info,
    COUNT(*) as quantidade
FROM public.profiles 
WHERE role IS NULL;

-- Verificar integridade dos dados
SELECT 
    'INTEGRIDADE DOS DADOS' as info,
    COUNT(*) as total_usuarios,
    COUNT(DISTINCT role) as roles_distintos
FROM public.profiles;

-- PARTE 10: RESUMO DA MIGRAÇÃO
SELECT 'RESUMO DA MIGRAÇÃO CONCLUÍDA' as info;

SELECT 
    'MIGRAÇÃO CONCLUÍDA COM SUCESSO!' as resultado,
    'admin -> super_admin, manager -> admin' as transformacao;

-- Mostrar estatísticas finais
WITH stats AS (
    SELECT 
        role,
        COUNT(*) as quantidade
    FROM public.profiles 
    GROUP BY role
)
SELECT 
    'ESTATÍSTICAS FINAIS' as info,
    role,
    quantidade
FROM stats
ORDER BY 
    CASE role 
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'user' THEN 3
        ELSE 4
    END;

SELECT 'SCRIPT DE MIGRAÇÃO DE ROLES EXECUTADO COM SUCESSO!' as resultado;