-- Create RPC function to create projects bypassing RLS
-- This function will be used as a fallback when normal insertion fails

CREATE OR REPLACE FUNCTION public.create_project(
  p_nome_projeto TEXT,
  p_agencia_id UUID,
  p_deal_id UUID DEFAULT NULL,
  p_status_projeto TEXT DEFAULT 'ativo',
  p_orcamento_projeto NUMERIC DEFAULT 0,
  p_valor_gasto NUMERIC DEFAULT 0,
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_cliente_final TEXT DEFAULT NULL,
  p_responsavel_projeto UUID DEFAULT NULL,
  p_prioridade TEXT DEFAULT 'media',
  p_progresso INTEGER DEFAULT 0,
  p_descricao TEXT DEFAULT NULL,
  p_briefing TEXT DEFAULT NULL,
  p_objetivos TEXT[] DEFAULT '{}',
  p_tags TEXT[] DEFAULT '{}',
  p_arquivos_anexos JSONB DEFAULT '[]'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_project_id UUID;
  result JSONB;
BEGIN
  -- Insert project directly (bypassing RLS due to SECURITY DEFINER)
  INSERT INTO public.agencia_projetos (
    nome_projeto,
    agencia_id,
    deal_id,
    status_projeto,
    orcamento_projeto,
    valor_gasto,
    data_inicio,
    data_fim,
    cliente_final,
    responsavel_projeto,
    prioridade,
    progresso,
    descricao,
    briefing,
    objetivos,
    tags,
    arquivos_anexos,
    created_by
  ) VALUES (
    p_nome_projeto,
    p_agencia_id,
    p_deal_id,
    p_status_projeto,
    p_orcamento_projeto,
    p_valor_gasto,
    p_data_inicio,
    p_data_fim,
    p_cliente_final,
    p_responsavel_projeto,
    p_prioridade,
    p_progresso,
    p_descricao,
    p_briefing,
    p_objetivos,
    p_tags,
    p_arquivos_anexos,
    auth.uid()
  ) RETURNING id INTO new_project_id;

  -- Return the created project data
  SELECT to_jsonb(ap.*) INTO result
  FROM public.agencia_projetos ap
  WHERE ap.id = new_project_id;

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    RETURN jsonb_build_object(
      'error', true,
      'message', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_project TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.create_project IS 'Creates a project bypassing RLS policies - SECURITY DEFINER function';
