-- Script final para corrigir permissões RLS - versão corrigida
-- Execute este script no Supabase SQL Editor

-- 1. Primeiro, remover a função ensure_profile existente se ela existir
DROP FUNCTION IF EXISTS public.ensure_profile();

-- 2. Criar a função ensure_profile com a assinatura correta
CREATE OR REPLACE FUNCTION public.ensure_profile()
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    email TEXT,
    role TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verificar se o usuário tem um perfil
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()) THEN
        -- Criar perfil básico se não existir
        INSERT INTO public.profiles (id, full_name, email, role)
        SELECT 
            auth.uid(),
            COALESCE(auth.jwt() ->> 'full_name', 'Usuário'),
            auth.email(),
            'user'
        WHERE auth.uid() IS NOT NULL;
    END IF;
    
    -- Retornar o perfil do usuário
    RETURN QUERY
    SELECT 
        p.id,
        p.full_name,
        p.email,
        p.role,
        p.created_at
    FROM public.profiles p
    WHERE p.id = auth.uid();
END;
$$;

-- 3. Garantir que a tabela profiles existe e tem RLS configurado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas antigas de profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- 5. Criar políticas corretas para profiles
CREATE POLICY "Users can view their own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- 6. Garantir que todas as tabelas principais têm RLS configurado corretamente
ALTER TABLE public.agencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencia_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencia_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencia_projetos ENABLE ROW LEVEL SECURITY;

-- 7. Remover políticas antigas e criar novas para agencias
DROP POLICY IF EXISTS "agencias_all" ON public.agencias;
DROP POLICY IF EXISTS "agencias_select_auth" ON public.agencias;
DROP POLICY IF EXISTS "agencias_insert_admin" ON public.agencias;
DROP POLICY IF EXISTS "agencias_update_admin" ON public.agencias;
DROP POLICY IF EXISTS "agencias_delete_admin" ON public.agencias;
DROP POLICY IF EXISTS "Authenticated users can manage agencias" ON public.agencias;

CREATE POLICY "Authenticated users can manage agencias"
    ON public.agencias
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 8. Remover políticas antigas e criar novas para agencia_contatos
DROP POLICY IF EXISTS "agencia_contatos_all" ON public.agencia_contatos;
DROP POLICY IF EXISTS "agencia_contatos_select_auth" ON public.agencia_contatos;
DROP POLICY IF EXISTS "agencia_contatos_insert_admin" ON public.agencia_contatos;
DROP POLICY IF EXISTS "agencia_contatos_update_admin" ON public.agencia_contatos;
DROP POLICY IF EXISTS "agencia_contatos_delete_admin" ON public.agencia_contatos;
DROP POLICY IF EXISTS "Authenticated users can manage agencia_contatos" ON public.agencia_contatos;

CREATE POLICY "Authenticated users can manage agencia_contatos"
    ON public.agencia_contatos
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 9. Remover políticas antigas e criar novas para agencia_deals
DROP POLICY IF EXISTS "agencia_deals_all" ON public.agencia_deals;
DROP POLICY IF EXISTS "agencia_deals_select_auth" ON public.agencia_deals;
DROP POLICY IF EXISTS "agencia_deals_insert_admin" ON public.agencia_deals;
DROP POLICY IF EXISTS "agencia_deals_update_admin" ON public.agencia_deals;
DROP POLICY IF EXISTS "agencia_deals_delete_admin" ON public.agencia_deals;
DROP POLICY IF EXISTS "Authenticated users can manage agencia_deals" ON public.agencia_deals;

CREATE POLICY "Authenticated users can manage agencia_deals"
    ON public.agencia_deals
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 10. Remover políticas antigas e criar novas para agencia_projetos
DROP POLICY IF EXISTS "agencia_projetos_all" ON public.agencia_projetos;
DROP POLICY IF EXISTS "agencia_projetos_select_auth" ON public.agencia_projetos;
DROP POLICY IF EXISTS "agencia_projetos_insert_admin" ON public.agencia_projetos;
DROP POLICY IF EXISTS "agencia_projetos_update_admin" ON public.agencia_projetos;
DROP POLICY IF EXISTS "agencia_projetos_delete_admin" ON public.agencia_projetos;
DROP POLICY IF EXISTS "Authenticated users can manage agencia_projetos" ON public.agencia_projetos;

CREATE POLICY "Authenticated users can manage agencia_projetos"
    ON public.agencia_projetos
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 11. Garantir que o usuário atual tem um perfil
INSERT INTO public.profiles (id, full_name, email, role)
SELECT 
    auth.uid(),
    'Hildebrando Cardoso',
    auth.email(),
    'admin'
WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- 12. Testar a função ensure_profile
SELECT * FROM public.ensure_profile();

-- 13. Verificar se todas as políticas foram criadas
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
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'agencias', 'agencia_contatos', 'agencia_deals', 'agencia_projetos')
ORDER BY tablename, policyname;

-- 14. Testar inserção de dados
INSERT INTO public.agencia_contatos (
    agencia_id, 
    nome_contato, 
    cargo, 
    email_contato, 
    telefone_contato
)
SELECT 
    id, 
    'Teste de Contato', 
    'Desenvolvedor', 
    'teste@exemplo.com', 
    '11999999999'
FROM public.agencias 
WHERE codigo_agencia = 'A007'
ON CONFLICT DO NOTHING;

-- 15. Verificar se o contato foi inserido
SELECT 
    ac.nome_contato,
    ac.cargo,
    ac.email_contato,
    a.nome_agencia
FROM public.agencia_contatos ac
JOIN public.agencias a ON ac.agencia_id = a.id
WHERE a.codigo_agencia = 'A007';
