-- Atualizar a view vw_equipe_projeto_completa para usar pessoas_projeto ao invés de profiles
CREATE OR REPLACE VIEW vw_equipe_projeto_completa AS 
SELECT 
  ape.id,
  ape.projeto_id,
  ape.pessoa_id,
  ape.papel,
  ape.data_entrada,
  ape.data_saida,
  ape.ativo,
  ape.created_at,
  ape.created_by,
  
  -- Dados da pessoa do projeto
  pp.nome as nome_pessoa,
  pp.email as email_pessoa,
  pp.telefone as telefone_pessoa,
  pp.cargo as cargo_pessoa,
  
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
LEFT JOIN pessoas_projeto pp ON ape.pessoa_id = pp.id
LEFT JOIN agencia_projetos ap ON ape.projeto_id = ap.id
LEFT JOIN agencia_deals ad ON ap.deal_id = ad.id
LEFT JOIN agencias a ON ad.agencia_id = a.id;

-- Comentário da view
COMMENT ON VIEW vw_equipe_projeto_completa IS 'View completa com dados dos membros da equipe usando pessoas_projeto, projeto e agência';