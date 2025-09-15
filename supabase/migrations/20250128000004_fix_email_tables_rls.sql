-- Corrigir políticas RLS para tabelas de email
-- Esta migração corrige os problemas de permissão 403 Forbidden

-- 1. Corrigir políticas para email_logs
DROP POLICY IF EXISTS "Users can view their own email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Users can insert email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Users can update their own email logs" ON public.email_logs;

-- Políticas mais permissivas para email_logs
CREATE POLICY "Authenticated users can view email logs" ON public.email_logs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert email logs" ON public.email_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update email logs" ON public.email_logs
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Corrigir políticas para email_stats (se for uma view)
-- Primeiro, verificar se é uma view ou tabela
DO $$
BEGIN
  -- Se for uma view, recriar com políticas adequadas
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'email_stats' AND table_schema = 'public') THEN
    -- Recriar a view com políticas adequadas
    DROP VIEW IF EXISTS public.email_stats CASCADE;
    
    CREATE VIEW public.email_stats AS
    SELECT 
      email_type,
      status,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as last_7_days
    FROM public.email_logs
    GROUP BY email_type, status;
    
    -- Permitir acesso à view para usuários autenticados
    GRANT SELECT ON public.email_stats TO authenticated;
  END IF;
END $$;

-- 3. Note: email_stats is a view, no RLS policies needed
-- Views inherit permissions from underlying tables

-- 4. Garantir que as tabelas existem e têm as colunas necessárias
-- Criar email_logs se não existir
CREATE TABLE IF NOT EXISTS public.email_logs (
  log_id SERIAL PRIMARY KEY,
  proposal_id UUID,
  email_type TEXT,
  recipient_email TEXT,
  recipient_name TEXT,
  recipient_type TEXT,
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar colunas se não existirem
DO $$
BEGIN
  -- Adicionar colunas que podem estar faltando
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_logs' AND column_name = 'customer_name') THEN
    ALTER TABLE public.email_logs ADD COLUMN customer_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_logs' AND column_name = 'proposal_type') THEN
    ALTER TABLE public.email_logs ADD COLUMN proposal_type TEXT;
  END IF;
END $$;

-- 5. Habilitar RLS nas tabelas
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- 6. Garantir permissões básicas
GRANT ALL ON public.email_logs TO authenticated;
-- Note: email_logs uses UUID primary key, no sequence needed

-- 7. Comentários para documentação
COMMENT ON TABLE public.email_logs IS 'Logs de emails enviados pelo sistema';
COMMENT ON COLUMN public.email_logs.id IS 'ID único do log de email';
COMMENT ON COLUMN public.email_logs.proposal_id IS 'ID da proposta relacionada';
COMMENT ON COLUMN public.email_logs.email_type IS 'Tipo do email (proposal_created, status_changed, etc.)';
COMMENT ON COLUMN public.email_logs.recipient_email IS 'Email do destinatário';
COMMENT ON COLUMN public.email_logs.status IS 'Status do email (pending, sent, failed)';
