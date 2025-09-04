-- 1. Melhorias na tabela agencia_projetos
ALTER TABLE agencia_projetos ADD COLUMN IF NOT EXISTS cliente_final TEXT;
ALTER TABLE agencia_projetos ADD COLUMN IF NOT EXISTS briefing TEXT;
ALTER TABLE agencia_projetos ADD COLUMN IF NOT EXISTS objetivos TEXT[];
ALTER TABLE agencia_projetos ADD COLUMN IF NOT EXISTS publico_alvo TEXT;
ALTER TABLE agencia_projetos ADD COLUMN IF NOT EXISTS prazo_estimado_dias INTEGER;
ALTER TABLE agencia_projetos ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE agencia_projetos ADD COLUMN IF NOT EXISTS arquivos_anexos JSONB DEFAULT '[]';
ALTER TABLE agencia_projetos ADD COLUMN IF NOT EXISTS orcamento_aprovado NUMERIC;
ALTER TABLE agencia_projetos ADD COLUMN IF NOT EXISTS valor_gasto NUMERIC DEFAULT 0;
ALTER TABLE agencia_projetos ADD COLUMN IF NOT EXISTS valor_disponivel NUMERIC GENERATED ALWAYS AS (COALESCE(orcamento_aprovado, 0) - COALESCE(valor_gasto, 0)) STORED;

-- Melhorar constraints
ALTER TABLE agencia_projetos ALTER COLUMN status_projeto SET DEFAULT 'planejamento';
ALTER TABLE agencia_projetos DROP CONSTRAINT IF EXISTS check_status_projeto;
ALTER TABLE agencia_projetos ADD CONSTRAINT check_status_projeto 
  CHECK (status_projeto IN ('planejamento', 'ativo', 'pausado', 'concluido', 'cancelado'));
ALTER TABLE agencia_projetos DROP CONSTRAINT IF EXISTS check_prioridade;
ALTER TABLE agencia_projetos ADD CONSTRAINT check_prioridade 
  CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente'));

-- 2. Nova tabela para equipe do projeto
CREATE TABLE IF NOT EXISTS agencia_projeto_equipe (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID NOT NULL REFERENCES agencia_projetos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  papel VARCHAR(50) DEFAULT 'membro' CHECK (papel IN ('coordenador', 'membro', 'consultor')),
  data_entrada DATE DEFAULT CURRENT_DATE,
  data_saida DATE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(projeto_id, usuario_id)
);

-- 3. Nova tabela para marcos do projeto
CREATE TABLE IF NOT EXISTS agencia_projeto_marcos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID NOT NULL REFERENCES agencia_projetos(id) ON DELETE CASCADE,
  nome_marco VARCHAR(255) NOT NULL,
  descricao TEXT,
  data_prevista DATE NOT NULL,
  data_conclusao DATE,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'atrasado')),
  responsavel_id UUID REFERENCES auth.users(id),
  ordem INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 4. Views para facilitar consultas
CREATE OR REPLACE VIEW vw_projetos_completos AS 
SELECT 
  ap.id,
  ap.nome_projeto,
  ap.descricao,
  ap.cliente_final,
  ap.status_projeto,
  ap.prioridade,
  ap.tipo_projeto,
  ap.data_inicio,
  ap.data_fim,
  ap.orcamento_projeto,
  ap.orcamento_aprovado,
  ap.valor_gasto,
  ap.valor_disponivel,
  ap.briefing,
  ap.publico_alvo,
  ap.tags,
  ap.objetivos,
  ap.prazo_estimado_dias,
  
  -- Dados da agência
  a.nome_agencia,
  a.codigo_agencia,
  a.email_empresa as agencia_email,
  
  -- Dados do responsável
  p.full_name as responsavel_nome,
  p.email as responsavel_email,
  
  -- Dados do deal
  ad.nome_deal,
  ad.status as deal_status,
  
  -- Contadores
  (SELECT COUNT(*) FROM agencia_projeto_equipe ape WHERE ape.projeto_id = ap.id AND ape.ativo = true) as total_membros_equipe,
  (SELECT COUNT(*) FROM agencia_projeto_marcos apm WHERE apm.projeto_id = ap.id) as total_marcos,
  (SELECT COUNT(*) FROM agencia_projeto_marcos apm WHERE apm.projeto_id = ap.id AND apm.status = 'concluido') as marcos_concluidos,
  (SELECT COUNT(*) FROM proposals pr WHERE pr.projeto_id = ap.id) as total_propostas,
  
  ap.created_at,
  ap.updated_at
FROM agencia_projetos ap
JOIN agencia_deals ad ON ap.deal_id = ad.id
JOIN agencias a ON ad.agencia_id = a.id
LEFT JOIN profiles p ON ap.responsavel_projeto = p.id;

-- 5. View para seleção em propostas
CREATE OR REPLACE VIEW vw_projetos_disponiveis AS 
SELECT 
  ap.id,
  ap.nome_projeto,
  ap.status_projeto,
  ap.data_inicio,
  ap.data_fim,
  ap.cliente_final,
  a.nome_agencia,
  a.codigo_agencia,
  a.id as agencia_id,
  p.full_name as responsavel_nome,
  CONCAT(a.codigo_agencia, ' - ', ap.nome_projeto, 
    CASE WHEN ap.cliente_final IS NOT NULL THEN ' (' || ap.cliente_final || ')' ELSE '' END
  ) as projeto_display_name
FROM agencia_projetos ap
JOIN agencia_deals ad ON ap.deal_id = ad.id
JOIN agencias a ON ad.agencia_id = a.id
LEFT JOIN profiles p ON ap.responsavel_projeto = p.id
WHERE ap.status_projeto IN ('ativo', 'planejamento')
ORDER BY a.nome_agencia, ap.nome_projeto;

-- 6. RLS Policies
ALTER TABLE agencia_projeto_equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencia_projeto_marcos ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS projeto_equipe_policy ON agencia_projeto_equipe
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      is_super_admin() OR
      usuario_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM agencia_projetos ap 
        WHERE ap.id = projeto_id AND ap.responsavel_projeto = auth.uid()
      )
    )
  );

CREATE POLICY IF NOT EXISTS projeto_marcos_policy ON agencia_projeto_marcos
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      is_super_admin() OR
      responsavel_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM agencia_projetos ap 
        WHERE ap.id = projeto_id AND ap.responsavel_projeto = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM agencia_projeto_equipe ape
        WHERE ape.projeto_id = projeto_id AND ape.usuario_id = auth.uid() AND ape.ativo = true
      )
    )
  );

-- 7. Índices para performance
CREATE INDEX IF NOT EXISTS idx_agencia_projetos_status ON agencia_projetos(status_projeto);
CREATE INDEX IF NOT EXISTS idx_agencia_projetos_responsavel ON agencia_projetos(responsavel_projeto);
CREATE INDEX IF NOT EXISTS idx_agencia_projeto_equipe_projeto ON agencia_projeto_equipe(projeto_id);
CREATE INDEX IF NOT EXISTS idx_agencia_projeto_marcos_projeto ON agencia_projeto_marcos(projeto_id);