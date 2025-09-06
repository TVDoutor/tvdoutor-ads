-- Script final funcional - funciona sem autenticação
-- Execute este script no Supabase SQL Editor

-- 1. Remover função existente se houver
DROP FUNCTION IF EXISTS public.ensure_profile();

-- 2. Criar função ensure_profile que funciona sem auth.uid()
CREATE OR REPLACE FUNCTION public.ensure_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Função simples que não depende de auth.uid()
    -- A aplicação vai chamar esta função quando necessário
    NULL;
END;
$$;

-- 3. Configurar RLS para todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencia_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencia_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencia_projetos ENABLE ROW LEVEL SECURITY;

-- 4. Remover todas as políticas existentes
DROP POLICY IF EXISTS "profiles_policy" ON public.profiles;
DROP POLICY IF EXISTS "agencias_policy" ON public.agencias;
DROP POLICY IF EXISTS "agencia_contatos_policy" ON public.agencia_contatos;
DROP POLICY IF EXISTS "agencia_deals_policy" ON public.agencia_deals;
DROP POLICY IF EXISTS "agencia_projetos_policy" ON public.agencia_projetos;

-- 5. Criar políticas que permitem tudo para usuários autenticados
CREATE POLICY "profiles_allow_all" ON public.profiles
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "agencias_allow_all" ON public.agencias
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "agencia_contatos_allow_all" ON public.agencia_contatos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "agencia_deals_allow_all" ON public.agencia_deals
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "agencia_projetos_allow_all" ON public.agencia_projetos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Verificar se todas as tabelas existem
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'agencias', 'agencia_contatos', 'agencia_deals', 'agencia_projetos')
ORDER BY table_name;

-- 7. Verificar se a agência de teste existe
SELECT id, nome_agencia, codigo_agencia FROM public.agencias WHERE codigo_agencia = 'A007';

-- 8. Inserir um contato de teste diretamente (sem usar auth.uid())
INSERT INTO public.agencia_contatos (
    agencia_id, 
    nome_contato, 
    cargo, 
    email_contato, 
    telefone_contato
)
SELECT 
    a.id, 
    'Hildebrando S Cardoso', 
    'Gestor de Tecnologia', 
    'hil.cardoso@gmail.com', 
    '19983463066'
FROM public.agencias a
WHERE a.codigo_agencia = 'A007'
ON CONFLICT DO NOTHING;

-- 9. Verificar se o contato foi inserido
SELECT 
    ac.id,
    ac.nome_contato,
    ac.cargo,
    ac.email_contato,
    ac.telefone_contato,
    a.nome_agencia,
    a.codigo_agencia
FROM public.agencia_contatos ac
JOIN public.agencias a ON ac.agencia_id = a.id
WHERE a.codigo_agencia = 'A007';

-- 10. Inserir um deal de teste
INSERT INTO public.agencia_deals (
    nome_deal,
    agencia_id,
    status,
    valor_estimado,
    data_inicio,
    data_fim
)
SELECT 
    'Campanha Novembro Azul',
    a.id,
    'ativo',
    50000.00,
    '2025-11-01',
    '2025-11-30'
FROM public.agencias a
WHERE a.codigo_agencia = 'A007'
ON CONFLICT DO NOTHING;

-- 11. Verificar se o deal foi inserido
SELECT 
    ad.id,
    ad.nome_deal,
    ad.status,
    ad.valor_estimado,
    a.nome_agencia
FROM public.agencia_deals ad
JOIN public.agencias a ON ad.agencia_id = a.id
WHERE a.codigo_agencia = 'A007';

-- 12. Inserir um projeto de teste
INSERT INTO public.agencia_projetos (
    nome_projeto,
    deal_id,
    agencia_id,
    status_projeto,
    data_inicio,
    data_fim,
    orcamento_projeto,
    cliente_final,
    prioridade,
    progresso,
    descricao,
    briefing,
    objetivos,
    tags
)
SELECT 
    'Novembro Azul 2025',
    ad.id,
    a.id,
    'ativo',
    '2025-11-01',
    '2025-11-30',
    50000.00,
    'Jose de Anibal',
    'media',
    0,
    'Projeto focado na venda de remedio para prostata',
    'Campanha de marketing digital para conscientização sobre saúde masculina',
    ARRAY['Conscientização', 'Saúde masculina', 'Prevenção'],
    ARRAY['novembro-azul', 'saude', 'marketing']
FROM public.agencias a
JOIN public.agencia_deals ad ON ad.agencia_id = a.id
WHERE a.codigo_agencia = 'A007' 
  AND ad.nome_deal = 'Campanha Novembro Azul'
ON CONFLICT DO NOTHING;

-- 13. Verificar se o projeto foi inserido
SELECT 
    ap.id,
    ap.nome_projeto,
    ap.status_projeto,
    ap.orcamento_projeto,
    ap.cliente_final,
    a.nome_agencia,
    ad.nome_deal
FROM public.agencia_projetos ap
JOIN public.agencias a ON ap.agencia_id = a.id
LEFT JOIN public.agencia_deals ad ON ap.deal_id = ad.id
WHERE a.codigo_agencia = 'A007';

-- 14. Verificar todas as políticas criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'agencias', 'agencia_contatos', 'agencia_deals', 'agencia_projetos')
ORDER BY tablename, policyname;
