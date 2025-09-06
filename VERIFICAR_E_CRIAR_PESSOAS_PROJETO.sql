-- =====================================================================
-- SCRIPT PARA VERIFICAR E CRIAR PESSOAS DO PROJETO
-- =====================================================================
-- Execute este script no Editor SQL do Supabase Dashboard

-- =====================================================================
-- PASSO 1: VERIFICAR SE A TABELA EXISTE
-- =====================================================================
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'pessoas_projeto' 
ORDER BY ordinal_position;

-- =====================================================================
-- PASSO 2: SE A TABELA NÃO EXISTIR, CRIAR
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.pessoas_projeto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE,
  telefone TEXT,
  cargo TEXT,
  agencia_id UUID REFERENCES public.agencias(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- PASSO 3: CONFIGURAR PERMISSÕES
-- =====================================================================
GRANT ALL ON TABLE public.pessoas_projeto TO authenticated;
ALTER TABLE public.pessoas_projeto ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Pessoas do projeto são visíveis para usuários autenticados." ON public.pessoas_projeto;
DROP POLICY IF EXISTS "Apenas administradores podem gerenciar pessoas do projeto." ON public.pessoas_projeto;

-- Criar políticas
CREATE POLICY "Pessoas do projeto são visíveis para usuários autenticados."
  ON public.pessoas_projeto FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Apenas administradores podem gerenciar pessoas do projeto."
  ON public.pessoas_projeto FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================================
-- PASSO 4: INSERIR DADOS DE EXEMPLO
-- =====================================================================
INSERT INTO public.pessoas_projeto (nome, email, telefone, cargo) VALUES
('João Silva', 'joao.silva@exemplo.com', '(11) 99999-1111', 'Gerente de Projetos'),
('Maria Santos', 'maria.santos@exemplo.com', '(11) 99999-2222', 'Coordenadora de Marketing'),
('Pedro Oliveira', 'pedro.oliveira@exemplo.com', '(11) 99999-3333', 'Diretor Criativo'),
('Ana Costa', 'ana.costa@exemplo.com', '(11) 99999-4444', 'Analista de Projetos'),
('Carlos Lima', 'carlos.lima@exemplo.com', '(11) 99999-5555', 'Supervisor de Equipe')
ON CONFLICT (email) DO NOTHING;

-- =====================================================================
-- PASSO 5: VERIFICAR DADOS INSERIDOS
-- =====================================================================
SELECT 
  'Pessoas inseridas com sucesso!' as resultado,
  COUNT(*) as total_pessoas
FROM public.pessoas_projeto;

-- Mostrar todas as pessoas
SELECT id, nome, email, telefone, cargo, created_at 
FROM public.pessoas_projeto 
ORDER BY nome;
