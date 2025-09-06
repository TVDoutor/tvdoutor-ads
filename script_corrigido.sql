-- Script corrigido para criar todas as tabelas necessárias
-- Execute este script no Supabase SQL Editor

-- 1. Criar tabela agencia_deals se não existir
CREATE TABLE IF NOT EXISTS public.agencia_deals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_deal VARCHAR(255) NOT NULL,
    agencia_id UUID NOT NULL REFERENCES public.agencias(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'pausado', 'concluido')),
    valor_estimado NUMERIC(12,2),
    data_inicio DATE,
    data_fim DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar tabela agencia_projetos se não existir
CREATE TABLE IF NOT EXISTS public.agencia_projetos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_projeto VARCHAR(255) NOT NULL,
    deal_id UUID REFERENCES public.agencia_deals(id) ON DELETE SET NULL,
    agencia_id UUID NOT NULL REFERENCES public.agencias(id) ON DELETE CASCADE,
    status_projeto VARCHAR(20) DEFAULT 'planejamento' CHECK (status_projeto IN ('planejamento', 'ativo', 'pausado', 'concluido', 'cancelado')),
    data_inicio DATE,
    data_fim DATE,
    orcamento_projeto NUMERIC(12,2) DEFAULT 0,
    valor_gasto NUMERIC(12,2) DEFAULT 0,
    responsavel_projeto UUID REFERENCES auth.users(id),
    cliente_final VARCHAR(255),
    prioridade VARCHAR(10) DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
    progresso INTEGER DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
    descricao TEXT,
    briefing TEXT,
    objetivos TEXT[],
    tags TEXT[],
    arquivos_anexos JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS nas novas tabelas
ALTER TABLE public.agencia_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencia_projetos ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas para agencia_deals
DROP POLICY IF EXISTS "agencia_deals_all" ON public.agencia_deals;
CREATE POLICY "agencia_deals_all" 
    ON public.agencia_deals 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- 5. Criar políticas para agencia_projetos
DROP POLICY IF EXISTS "agencia_projetos_all" ON public.agencia_projetos;
CREATE POLICY "agencia_projetos_all" 
    ON public.agencia_projetos 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- 6. Inserir um deal de teste
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
    id,
    'ativo',
    50000.00,
    '2025-11-01',
    '2025-11-30'
FROM public.agencias 
WHERE codigo_agencia = 'A007';

-- 7. Verificar se o deal foi criado
SELECT 
    ad.id,
    ad.nome_deal,
    ad.status,
    ad.valor_estimado,
    a.nome_agencia,
    a.codigo_agencia
FROM public.agencia_deals ad
JOIN public.agencias a ON ad.agencia_id = a.id
WHERE a.codigo_agencia = 'A007';

-- 8. Inserir um projeto de teste
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
  AND ad.nome_deal = 'Campanha Novembro Azul';

-- 9. Verificar se o projeto foi criado
SELECT 
    ap.id,
    ap.nome_projeto,
    ap.status_projeto,
    ap.orcamento_projeto,
    ap.cliente_final,
    ap.prioridade,
    ap.progresso,
    a.nome_agencia,
    ad.nome_deal
FROM public.agencia_projetos ap
JOIN public.agencias a ON ap.agencia_id = a.id
LEFT JOIN public.agencia_deals ad ON ap.deal_id = ad.id
WHERE a.codigo_agencia = 'A007';

-- 10. Verificar todas as tabelas criadas
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('agencias', 'agencia_contatos', 'agencia_deals', 'agencia_projetos')
ORDER BY table_name;
