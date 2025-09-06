-- Script para desabilitar RLS temporariamente e permitir acesso total
-- Execute este script no Supabase SQL Editor

-- 1. Desabilitar RLS em todas as tabelas principais
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencias DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencia_contatos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencia_deals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencia_projetos DISABLE ROW LEVEL SECURITY;

-- 2. Verificar se RLS foi desabilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'agencias', 'agencia_contatos', 'agencia_deals', 'agencia_projetos')
ORDER BY tablename;

-- 3. Testar acesso às tabelas
SELECT COUNT(*) as total_agencias FROM public.agencias;
SELECT COUNT(*) as total_contatos FROM public.agencia_contatos;
SELECT COUNT(*) as total_deals FROM public.agencia_deals;
SELECT COUNT(*) as total_projetos FROM public.agencia_projetos;

-- 4. Verificar dados existentes
SELECT 
    a.nome_agencia,
    a.codigo_agencia,
    COUNT(ac.id) as total_contatos,
    COUNT(ad.id) as total_deals,
    COUNT(ap.id) as total_projetos
FROM public.agencias a
LEFT JOIN public.agencia_contatos ac ON ac.agencia_id = a.id
LEFT JOIN public.agencia_deals ad ON ad.agencia_id = a.id
LEFT JOIN public.agencia_projetos ap ON ap.agencia_id = a.id
GROUP BY a.id, a.nome_agencia, a.codigo_agencia;

-- 5. Inserir dados de teste adicionais se necessário
INSERT INTO public.agencia_contatos (
    agencia_id, 
    nome_contato, 
    cargo, 
    email_contato, 
    telefone_contato
)
SELECT 
    a.id, 
    'Contato Teste 2', 
    'Analista', 
    'teste2@exemplo.com', 
    '11988888888'
FROM public.agencias a
WHERE a.codigo_agencia = 'A007'
ON CONFLICT DO NOTHING;

-- 6. Verificar se o novo contato foi inserido
SELECT 
    ac.nome_contato,
    ac.cargo,
    ac.email_contato,
    a.nome_agencia
FROM public.agencia_contatos ac
JOIN public.agencias a ON ac.agencia_id = a.id
WHERE a.codigo_agencia = 'A007'
ORDER BY ac.created_at DESC;

-- 7. Verificar se todas as tabelas estão acessíveis
SELECT 
    'agencias' as tabela,
    COUNT(*) as registros
FROM public.agencias
UNION ALL
SELECT 
    'agencia_contatos' as tabela,
    COUNT(*) as registros
FROM public.agencia_contatos
UNION ALL
SELECT 
    'agencia_deals' as tabela,
    COUNT(*) as registros
FROM public.agencia_deals
UNION ALL
SELECT 
    'agencia_projetos' as tabela,
    COUNT(*) as registros
FROM public.agencia_projetos;



