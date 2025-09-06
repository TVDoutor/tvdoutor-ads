-- Script para testar o cadastro de contatos
-- Execute este script no Supabase SQL Editor

-- 1. Criar tabela agencias se não existir
CREATE TABLE IF NOT EXISTS public.agencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_agencia VARCHAR(255) NOT NULL,
    codigo_agencia VARCHAR(50) UNIQUE,
    cnpj VARCHAR(18) UNIQUE,
    email_empresa VARCHAR(255),
    telefone_empresa VARCHAR(20),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    taxa_porcentagem NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar tabela agencia_contatos se não existir
CREATE TABLE IF NOT EXISTS public.agencia_contatos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agencia_id UUID NOT NULL REFERENCES public.agencias(id) ON DELETE CASCADE,
    nome_contato VARCHAR(255) NOT NULL,
    cargo VARCHAR(100),
    email_contato VARCHAR(255),
    telefone_contato VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE public.agencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencia_contatos ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas simples (permitir tudo para usuários autenticados)
DROP POLICY IF EXISTS "agencias_all" ON public.agencias;
CREATE POLICY "agencias_all" ON public.agencias FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "agencia_contatos_all" ON public.agencia_contatos;
CREATE POLICY "agencia_contatos_all" ON public.agencia_contatos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Inserir uma agência de teste
INSERT INTO public.agencias (nome_agencia, codigo_agencia, cnpj, email_empresa, telefone_empresa, cidade, estado, taxa_porcentagem)
VALUES ('Testes Cardoso', 'A007', '12.345.678/0001-90', 'cardoso@gmail.com', '19983463077', 'Campinas', 'SP', 0)
ON CONFLICT (codigo_agencia) DO NOTHING;

-- 6. Verificar se a agência foi criada
SELECT * FROM public.agencias WHERE codigo_agencia = 'A007';
