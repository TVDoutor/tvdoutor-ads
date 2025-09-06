-- Função para verificar se tabela existe
CREATE OR REPLACE FUNCTION check_table_exists(table_name text)
RETURNS TABLE(exists boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar perfil de usuário
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid DEFAULT auth.uid())
RETURNS text AS $$
DECLARE
  user_role text;
BEGIN
  -- Verificar se o usuário existe na tabela profiles
  SELECT role INTO user_role
  FROM profiles
  WHERE id = user_id;
  
  -- Se não encontrar, retornar 'user' como padrão
  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que a tabela email_stats existe
CREATE TABLE IF NOT EXISTS email_stats (
  id SERIAL PRIMARY KEY,
  email_type text NOT NULL,
  status text NOT NULL,
  total integer DEFAULT 0,
  today integer DEFAULT 0,
  last_7_days integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Inserir dados iniciais se a tabela estiver vazia
INSERT INTO email_stats (email_type, status, total, today, last_7_days)
SELECT * FROM (
  VALUES 
    ('proposal_created', 'sent', 0, 0, 0),
    ('proposal_created', 'failed', 0, 0, 0),
    ('status_changed', 'sent', 0, 0, 0),
    ('status_changed', 'failed', 0, 0, 0)
) AS v(email_type, status, total, today, last_7_days)
WHERE NOT EXISTS (SELECT 1 FROM email_stats);