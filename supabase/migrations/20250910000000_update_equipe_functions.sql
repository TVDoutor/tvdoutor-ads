-- Atualizar tabela agencia_projeto_equipe para incluir as novas funções - apenas se tabela existir
-- Membro, Coordenador, Gerente e Diretor

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_projeto_equipe' AND table_schema = 'public') THEN
        -- Primeiro, vamos atualizar os dados existentes para garantir compatibilidade
        UPDATE agencia_projeto_equipe 
        SET papel = 'membro' 
        WHERE papel NOT IN ('membro', 'coordenador', 'gerente', 'diretor') OR papel IS NULL;

        -- Agora, vamos atualizar a constraint da coluna papel
        ALTER TABLE agencia_projeto_equipe 
        DROP CONSTRAINT IF EXISTS agencia_projeto_equipe_papel_check;

        -- Adicionar a nova constraint com as funções solicitadas
        ALTER TABLE agencia_projeto_equipe 
        ADD CONSTRAINT agencia_projeto_equipe_papel_check 
        CHECK (papel IN ('membro', 'coordenador', 'gerente', 'diretor'));

        -- Atualizar o valor padrão para 'membro'
        ALTER TABLE agencia_projeto_equipe 
        ALTER COLUMN papel SET DEFAULT 'membro';

        -- Comentário para documentar as funções
        COMMENT ON COLUMN agencia_projeto_equipe.papel IS 'Função do membro na equipe: membro, coordenador, gerente, diretor';
    END IF;
END $$;

-- Criar view atualizada para facilitar consultas (versão condicional)
DO $$
BEGIN
  -- Verificar se a tabela agencia_projeto_equipe existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'agencia_projeto_equipe' AND table_schema = 'public'
  ) THEN
    -- Verificar se a coluna usuario_id existe
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'agencia_projeto_equipe' AND column_name = 'usuario_id' AND table_schema = 'public'
    ) THEN
      EXECUTE '
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
        
        -- Informações adicionais
        CASE
          WHEN ape.papel = ''diretor'' THEN 4
          WHEN ape.papel = ''gerente'' THEN 3
          WHEN ape.papel = ''coordenador'' THEN 2
          WHEN ape.papel = ''membro'' THEN 1
          ELSE 0
        END as nivel_hierarquia,

        -- Status do membro
        CASE
          WHEN ape.ativo = false THEN ''inativo''
          WHEN ape.data_saida IS NOT NULL THEN ''saido''
          ELSE ''ativo''
        END as status_membro

      FROM agencia_projeto_equipe ape';
    ELSE
      -- Criar uma view básica sem a coluna usuario_id
      EXECUTE '
      CREATE OR REPLACE VIEW vw_equipe_projeto_completa AS 
      SELECT 
        gen_random_uuid() as id,
        gen_random_uuid() as projeto_id,
        gen_random_uuid() as usuario_id,
        ''membro''::varchar as papel,
        CURRENT_DATE as data_entrada,
        NULL::date as data_saida,
        true as ativo,
        NOW() as created_at,
        NULL::uuid as created_by,
        1 as nivel_hierarquia,
        ''ativo'' as status_membro
      WHERE false';
    END IF;
  ELSE
    -- Criar uma view vazia se a tabela não existir
    EXECUTE '
    CREATE OR REPLACE VIEW vw_equipe_projeto_completa AS 
    SELECT 
      gen_random_uuid() as id,
      gen_random_uuid() as projeto_id,
      gen_random_uuid() as usuario_id,
      ''membro''::varchar as papel,
      CURRENT_DATE as data_entrada,
      NULL::date as data_saida,
      true as ativo,
      NOW() as created_at,
      NULL::uuid as created_by,
      1 as nivel_hierarquia,
      ''ativo'' as status_membro
    WHERE false';
  END IF;
END $$;

-- Atualizar a view de projetos completos para incluir contadores por função - apenas se tabelas existirem
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_projetos' AND table_schema = 'public') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_deals' AND table_schema = 'public') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencias' AND table_schema = 'public') THEN
        
        EXECUTE 'CREATE OR REPLACE VIEW vw_projetos_completos AS 
        SELECT 
          ap.id,
          ap.nome_projeto,
          ap.descricao,
          ap.cliente_final,
          ap.status_projeto,
          ap.prioridade,
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
          (SELECT COUNT(*) FROM agencia_projeto_equipe ape WHERE ape.projeto_id = ap.id AND ape.ativo = true AND ape.papel = ''membro'') as total_membros,
          (SELECT COUNT(*) FROM agencia_projeto_equipe ape WHERE ape.projeto_id = ap.id AND ape.ativo = true AND ape.papel = ''coordenador'') as total_coordenadores,
          (SELECT COUNT(*) FROM agencia_projeto_equipe ape WHERE ape.projeto_id = ap.id AND ape.ativo = true AND ape.papel = ''gerente'') as total_gerentes,
          (SELECT COUNT(*) FROM agencia_projeto_equipe ape WHERE ape.projeto_id = ap.id AND ape.ativo = true AND ape.papel = ''diretor'') as total_diretores,
          
          -- Outros contadores
          (SELECT COUNT(*) FROM agencia_projeto_marcos apm WHERE apm.projeto_id = ap.id) as total_marcos,
          (SELECT COUNT(*) FROM agencia_projeto_marcos apm WHERE apm.projeto_id = ap.id AND apm.status = ''concluido'') as marcos_concluidos,
          (SELECT COUNT(*) FROM proposals pr WHERE pr.projeto_id = ap.id) as total_propostas,
          
          ap.created_at,
          ap.updated_at
        FROM agencia_projetos ap
        JOIN agencia_deals ad ON ap.deal_id = ad.id
        JOIN agencias a ON ad.agencia_id = a.id
        LEFT JOIN profiles p ON ap.responsavel_projeto = p.id';
    END IF;
END $$;

-- Função para obter estatísticas de equipe por projeto - apenas se tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_projeto_equipe' AND table_schema = 'public') THEN
        EXECUTE 'CREATE OR REPLACE FUNCTION get_equipe_stats(projeto_uuid UUID)
        RETURNS TABLE (
          total_membros BIGINT,
          total_coordenadores BIGINT,
          total_gerentes BIGINT,
          total_diretores BIGINT,
          membros_ativos BIGINT
        ) 
        LANGUAGE SQL
        STABLE
        AS $func$
          SELECT 
            COUNT(*) FILTER (WHERE papel = ''membro'') as total_membros,
            COUNT(*) FILTER (WHERE papel = ''coordenador'') as total_coordenadores,
            COUNT(*) FILTER (WHERE papel = ''gerente'') as total_gerentes,
            COUNT(*) FILTER (WHERE papel = ''diretor'') as total_diretores,
            COUNT(*) FILTER (WHERE ativo = true) as membros_ativos
          FROM agencia_projeto_equipe 
          WHERE projeto_id = projeto_uuid;
        $func$';
    END IF;
END $$;

-- Índices para melhorar performance - apenas se tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_projeto_equipe' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_agencia_projeto_equipe_papel ON agencia_projeto_equipe(papel);
        CREATE INDEX IF NOT EXISTS idx_agencia_projeto_equipe_ativo ON agencia_projeto_equipe(ativo);
        CREATE INDEX IF NOT EXISTS idx_agencia_projeto_equipe_projeto_papel ON agencia_projeto_equipe(projeto_id, papel);
    END IF;
END $$;

-- Comentários para documentação - apenas se objetos existirem
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_projeto_equipe' AND table_schema = 'public') THEN
        COMMENT ON TABLE agencia_projeto_equipe IS 'Tabela que gerencia os membros das equipes de projeto com suas respectivas funções';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'vw_equipe_projeto_completa' AND schemaname = 'public') THEN
        COMMENT ON VIEW vw_equipe_projeto_completa IS 'View completa com dados dos membros da equipe, projeto e agência';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_equipe_stats' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        COMMENT ON FUNCTION get_equipe_stats IS 'Função para obter estatísticas de equipe por projeto';
    END IF;
END $$;

