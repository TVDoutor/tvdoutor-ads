-- Script simples e funcional para corrigir permissões
-- Execute este script no Supabase SQL Editor

-- 1. Remover função existente se houver
DROP FUNCTION IF EXISTS public.ensure_profile();

-- 2. Criar função ensure_profile simples
CREATE OR REPLACE FUNCTION public.ensure_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Inserir perfil se não existir
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        auth.uid(),
        'Hildebrando Cardoso',
        auth.email(),
        'admin'
    )
    ON CONFLICT (id) DO NOTHING;
END;
$$;

-- 3. Configurar RLS para todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencia_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencia_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencia_projetos ENABLE ROW LEVEL SECURITY;

-- 4. Remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can manage agencias" ON public.agencias;
DROP POLICY IF EXISTS "Authenticated users can manage agencia_contatos" ON public.agencia_contatos;
DROP POLICY IF EXISTS "Authenticated users can manage agencia_deals" ON public.agencia_deals;
DROP POLICY IF EXISTS "Authenticated users can manage agencia_projetos" ON public.agencia_projetos;

-- 5. Criar políticas simples e permissivas
CREATE POLICY "profiles_policy" ON public.profiles
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "agencias_policy" ON public.agencias
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "agencia_contatos_policy" ON public.agencia_contatos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "agencia_deals_policy" ON public.agencia_deals
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "agencia_projetos_policy" ON public.agencia_projetos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Executar a função ensure_profile
SELECT public.ensure_profile();

-- 7. Verificar se o perfil foi criado
SELECT id, full_name, email, role FROM public.profiles WHERE id = auth.uid();

-- 8. Testar inserção de contato
INSERT INTO public.agencia_contatos (
    agencia_id, 
    nome_contato, 
    cargo, 
    email_contato, 
    telefone_contato
)
SELECT 
    a.id, 
    'Teste de Contato', 
    'Desenvolvedor', 
    'teste@exemplo.com', 
    '11999999999'
FROM public.agencias a
WHERE a.codigo_agencia = 'A007'
ON CONFLICT DO NOTHING;

-- 9. Verificar se o contato foi inserido
SELECT 
    ac.nome_contato,
    ac.cargo,
    ac.email_contato,
    a.nome_agencia
FROM public.agencia_contatos ac
JOIN public.agencias a ON ac.agencia_id = a.id
WHERE a.codigo_agencia = 'A007';

-- 10. Verificar todas as políticas criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'agencias', 'agencia_contatos', 'agencia_deals', 'agencia_projetos')
ORDER BY tablename, policyname;
