-- Script completo para testar o cadastro de contatos
-- Execute este script no Supabase SQL Editor

-- 1. Criar tabela agencia_contatos se não existir
CREATE TABLE IF NOT EXISTS public.agencia_contatos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agencia_id UUID NOT NULL REFERENCES public.agencias(id) ON DELETE CASCADE,
    nome_contato VARCHAR(255) NOT NULL,
    cargo VARCHAR(100),
    email_contato VARCHAR(255),
    telefone_contato VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS na tabela agencia_contatos
ALTER TABLE public.agencia_contatos ENABLE ROW LEVEL SECURITY;

-- 3. Criar política para agencia_contatos (permitir tudo para usuários autenticados)
DROP POLICY IF EXISTS "agencia_contatos_all" ON public.agencia_contatos;
CREATE POLICY "agencia_contatos_all" 
    ON public.agencia_contatos 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- 4. Verificar se a agência de teste existe
SELECT id, nome_agencia, codigo_agencia FROM public.agencias WHERE codigo_agencia = 'A007';

-- 5. Inserir um contato de teste
INSERT INTO public.agencia_contatos (
    agencia_id, 
    nome_contato, 
    cargo, 
    email_contato, 
    telefone_contato
)
SELECT 
    id, 
    'Hildebrando S Cardoso', 
    'Gestor de Tecnologia', 
    'hil.cardoso@gmail.com', 
    '19983463066'
FROM public.agencias 
WHERE codigo_agencia = 'A007';

-- 6. Verificar se o contato foi criado
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

-- 7. Testar listagem de contatos por agência
SELECT 
    ac.*,
    a.nome_agencia
FROM public.agencia_contatos ac
JOIN public.agencias a ON ac.agencia_id = a.id
ORDER BY ac.created_at DESC;
