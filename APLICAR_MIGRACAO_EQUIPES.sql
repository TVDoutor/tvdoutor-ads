-- APLICAR ESTE SCRIPT NO PAINEL DO SUPABASE (SQL Editor)
-- Sistema de Equipes com Funções: Membro, Coordenador, Gerente e Diretor

-- 1. Atualizar constraint da coluna papel
ALTER TABLE agencia_projeto_equipe 
DROP CONSTRAINT IF EXISTS agencia_projeto_equipe_papel_check;

-- 2. Adicionar nova constraint com as funções solicitadas
ALTER TABLE agencia_projeto_equipe 
ADD CONSTRAINT agencia_projeto_equipe_papel_check 
CHECK (papel IN ('membro', 'coordenador', 'gerente', 'diretor'));

-- 3. Atualizar valor padrão
ALTER TABLE agencia_projeto_equipe 
ALTER COLUMN papel SET DEFAULT 'membro';

-- 4. Comentário para documentar as funções
COMMENT ON COLUMN agencia_projeto_equipe.papel IS 'Função do membro na equipe: membro, coordenador, gerente, diretor';

-- 5. Criar view atualizada para facilitar consultas
CREATE OR REPLACE VIEW vw_equipe_projeto_completa AS 
SELECT 
  ape.id,
  ape.projeto_id,
  ape.usuario_id,
  ape.papel,
  ape.data_entrada,
  ape.data_saida,
  ape.ativo,
  ape.created_at,
  ape.created_by,
  
  -- Dados do usuário
  p.full_name as nome_usuario,
  p.email as email_usuario,
  p.avatar_url as avatar_usuario,
  
  -- Dados do projeto
  ap.nome_projeto,
  ap.status_projeto,
  ap.cliente_final,
  
  -- Dados da agência
  a.nome_agencia,
  a.codigo_agencia,
  
  -- Dados do deal
  ad.nome_deal,
  
  -- Informações adicionais
  CASE 
    WHEN ape.papel = 'diretor' THEN 4
    WHEN ape.papel = 'gerente' THEN 3
    WHEN ape.papel = 'coordenador' THEN 2
    WHEN ape.papel = 'membro' THEN 1
    ELSE 0
  END as nivel_hierarquia,
  
  -- Status do membro
  CASE 
    WHEN ape.ativo = false THEN 'inativo'
    WHEN ape.data_saida IS NOT NULL THEN 'saido'
    ELSE 'ativo'
  END as status_membro

FROM agencia_projeto_equipe ape
LEFT JOIN profiles p ON ape.usuario_id = p.id
LEFT JOIN agencia_projetos ap ON ape.projeto_id = ap.id
LEFT JOIN agencia_deals ad ON ap.deal_id = ad.id
LEFT JOIN agencias a ON ad.agencia_id = a.id;

-- 6. Atualizar view de projetos completos
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
  
  -- Contadores de equipe por função
  (SELECT COUNT(*) FROM agencia_projeto_equipe ape WHERE ape.projeto_id = ap.id AND ape.ativo = true) as total_membros_equipe,
  (SELECT COUNT(*) FROM agencia_projeto_equipe ape WHERE ape.projeto_id = ap.id AND ape.ativo = true AND ape.papel = 'membro') as total_membros,
  (SELECT COUNT(*) FROM agencia_projeto_equipe ape WHERE ape.projeto_id = ap.id AND ape.ativo = true AND ape.papel = 'coordenador') as total_coordenadores,
  (SELECT COUNT(*) FROM agencia_projeto_equipe ape WHERE ape.projeto_id = ap.id AND ape.ativo = true AND ape.papel = 'gerente') as total_gerentes,
  (SELECT COUNT(*) FROM agencia_projeto_equipe ape WHERE ape.projeto_id = ap.id AND ape.ativo = true AND ape.papel = 'diretor') as total_diretores,
  
  -- Outros contadores
  (SELECT COUNT(*) FROM agencia_projeto_marcos apm WHERE apm.projeto_id = ap.id) as total_marcos,
  (SELECT COUNT(*) FROM agencia_projeto_marcos apm WHERE apm.projeto_id = ap.id AND apm.status = 'concluido') as marcos_concluidos,
  (SELECT COUNT(*) FROM proposals pr WHERE pr.projeto_id = ap.id) as total_propostas,
  
  ap.created_at,
  ap.updated_at
FROM agencia_projetos ap
JOIN agencia_deals ad ON ap.deal_id = ad.id
JOIN agencias a ON ad.agencia_id = a.id
LEFT JOIN profiles p ON ap.responsavel_projeto = p.id;

-- 7. Função para obter estatísticas de equipe por projeto
CREATE OR REPLACE FUNCTION get_equipe_stats(projeto_uuid UUID)
RETURNS TABLE (
  total_membros BIGINT,
  total_coordenadores BIGINT,
  total_gerentes BIGINT,
  total_diretores BIGINT,
  membros_ativos BIGINT
) 
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    COUNT(*) FILTER (WHERE papel = 'membro') as total_membros,
    COUNT(*) FILTER (WHERE papel = 'coordenador') as total_coordenadores,
    COUNT(*) FILTER (WHERE papel = 'gerente') as total_gerentes,
    COUNT(*) FILTER (WHERE papel = 'diretor') as total_diretores,
    COUNT(*) FILTER (WHERE ativo = true) as membros_ativos
  FROM agencia_projeto_equipe 
  WHERE projeto_id = projeto_uuid;
$$;

-- 8. Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_agencia_projeto_equipe_papel ON agencia_projeto_equipe(papel);
CREATE INDEX IF NOT EXISTS idx_agencia_projeto_equipe_ativo ON agencia_projeto_equipe(ativo);
CREATE INDEX IF NOT EXISTS idx_agencia_projeto_equipe_projeto_papel ON agencia_projeto_equipe(projeto_id, papel);

-- 9. Comentários para documentação
COMMENT ON TABLE agencia_projeto_equipe IS 'Tabela que gerencia os membros das equipes de projeto com suas respectivas funções';
COMMENT ON VIEW vw_equipe_projeto_completa IS 'View completa com dados dos membros da equipe, projeto e agência';
COMMENT ON FUNCTION get_equipe_stats IS 'Função para obter estatísticas de equipe por projeto';

-- 10. Verificar se tudo foi aplicado corretamente
SELECT 'Migração aplicada com sucesso!' as status;

