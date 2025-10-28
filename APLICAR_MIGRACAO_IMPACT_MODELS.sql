-- =========================================================================
-- APLICAÇÃO MANUAL DA MIGRAÇÃO: Sistema de Modelos de Impacto Dinâmicos
-- Data: 28/10/2025
-- Descrição: Criar tabela impact_models e dados iniciais
-- =========================================================================

-- PASSO 1: Verificar se a tabela já existe
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'impact_models') THEN
        RAISE NOTICE 'Tabela impact_models já existe. Pulando criação...';
    ELSE
        RAISE NOTICE 'Criando tabela impact_models...';
    END IF;
END $$;

-- PASSO 2: Criar tabela impact_models
CREATE TABLE IF NOT EXISTS public.impact_models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    traffic_level VARCHAR(20) NOT NULL,
    multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    examples TEXT[],
    color_scheme JSONB,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- PASSO 3: Habilitar RLS
ALTER TABLE public.impact_models ENABLE ROW LEVEL SECURITY;

-- PASSO 4: Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Authenticated users can read impact models" ON public.impact_models;
DROP POLICY IF EXISTS "Only admins can manage impact models" ON public.impact_models;

-- PASSO 5: Criar políticas RLS
CREATE POLICY "Authenticated users can read impact models"
    ON public.impact_models
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can manage impact models"
    ON public.impact_models
    FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- PASSO 6: Criar/atualizar trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_impact_models_updated_at ON public.impact_models;

CREATE TRIGGER update_impact_models_updated_at
    BEFORE UPDATE ON public.impact_models
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- PASSO 7: Inserir dados iniciais das fórmulas
INSERT INTO public.impact_models (name, description, traffic_level, multiplier, examples, color_scheme, created_by) 
VALUES
(
    'Fórmula A', 
    'Para locais com grande movimento de pessoas', 
    'Alto', 
    1.5, 
    ARRAY['Shopping centers movimentados', 'Aeroportos e terminais', 'Hospitais de grande porte', 'Centros comerciais principais'],
    '{"gradient": "from-green-500 to-emerald-600", "bgColor": "bg-green-50", "borderColor": "border-green-200", "textColor": "text-green-700"}'::jsonb,
    (SELECT id FROM auth.users WHERE email = 'hildebrando.cardoso@tvdoutor.com.br' LIMIT 1)
),
(
    'Fórmula B', 
    'Para locais com movimento moderado de pessoas', 
    'Médio', 
    1.0,
    ARRAY['Farmácias de bairro', 'Clínicas médicas', 'Postos de saúde', 'Centros comerciais menores'],
    '{"gradient": "from-blue-500 to-cyan-600", "bgColor": "bg-blue-50", "borderColor": "border-blue-200", "textColor": "text-blue-700"}'::jsonb,
    (SELECT id FROM auth.users WHERE email = 'hildebrando.cardoso@tvdoutor.com.br' LIMIT 1)
),
(
    'Fórmula C', 
    'Para locais com menor movimento de pessoas', 
    'Baixo', 
    0.7,
    ARRAY['Consultórios médicos', 'Clínicas especializadas', 'Locais de baixo movimento', 'Ambientes corporativos'],
    '{"gradient": "from-orange-500 to-red-500", "bgColor": "bg-orange-50", "borderColor": "border-orange-200", "textColor": "text-orange-700"}'::jsonb,
    (SELECT id FROM auth.users WHERE email = 'hildebrando.cardoso@tvdoutor.com.br' LIMIT 1)
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    traffic_level = EXCLUDED.traffic_level,
    multiplier = EXCLUDED.multiplier,
    examples = EXCLUDED.examples,
    color_scheme = EXCLUDED.color_scheme,
    updated_at = NOW();

-- PASSO 8: Atualizar constraint da tabela proposals
ALTER TABLE public.proposals 
DROP CONSTRAINT IF EXISTS proposals_impact_formula_check;

ALTER TABLE public.proposals 
ADD CONSTRAINT proposals_impact_formula_check 
CHECK (impact_formula IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'));

-- PASSO 9: Criar função para obter fórmulas ativas
CREATE OR REPLACE FUNCTION public.get_active_impact_models()
RETURNS TABLE (
    id INTEGER,
    name VARCHAR(50),
    description TEXT,
    traffic_level VARCHAR(20),
    multiplier DECIMAL(5,2),
    examples TEXT[],
    color_scheme JSONB
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        im.id,
        im.name,
        im.description,
        im.traffic_level,
        im.multiplier,
        im.examples,
        im.color_scheme
    FROM public.impact_models im
    WHERE im.active = true
    ORDER BY im.multiplier DESC, im.name;
$$;

-- PASSO 10: Adicionar comentários
COMMENT ON TABLE public.impact_models IS 'Tabela para gerenciar fórmulas de impacto dinamicamente';
COMMENT ON COLUMN public.impact_models.multiplier IS 'Multiplicador aplicado ao cálculo de impacto (ex: 1.5 = 50% mais impacto)';
COMMENT ON COLUMN public.impact_models.examples IS 'Array de exemplos de locais para esta fórmula';
COMMENT ON COLUMN public.impact_models.color_scheme IS 'Configurações de cores para a interface (JSON)';
COMMENT ON FUNCTION public.get_active_impact_models() IS 'Retorna todas as fórmulas de impacto ativas ordenadas por multiplicador';

-- PASSO 11: Verificar dados inseridos
SELECT 
    'Migração aplicada com sucesso!' as status,
    COUNT(*) as total_formulas
FROM public.impact_models;

-- PASSO 12: Listar fórmulas criadas
SELECT 
    id,
    name,
    description,
    traffic_level,
    multiplier,
    active,
    created_at
FROM public.impact_models
ORDER BY multiplier DESC;

