-- Aplicar apenas a migração de monitoramento de usuários
-- Execute este SQL diretamente no Supabase Dashboard

-- Criar tabela para rastrear sessões ativas
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para histórico de sessões
CREATE TABLE IF NOT EXISTS public.user_session_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_token TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    ended_by TEXT CHECK (ended_by IN ('logout', 'timeout', 'forced', 'system')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen ON public.user_sessions(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON public.user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_session_history_user_id ON public.user_session_history(user_id);
CREATE INDEX IF NOT EXISTS idx_session_history_ended_at ON public.user_session_history(ended_at);

-- Habilitar RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_session_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas super admins podem acessar
CREATE POLICY "Super admins can view all user sessions" ON public.user_sessions
    FOR SELECT 
    TO authenticated
    USING (is_super_admin());

CREATE POLICY "Super admins can view session history" ON public.user_session_history
    FOR SELECT 
    TO authenticated
    USING (is_super_admin());

-- Usuários podem inserir suas próprias sessões
CREATE POLICY "Users can insert own sessions" ON public.user_sessions
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar suas próprias sessões
CREATE POLICY "Users can update own sessions" ON public.user_sessions
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Usuários podem inserir histórico de suas próprias sessões
CREATE POLICY "Users can insert own session history" ON public.user_session_history
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Função para limpar sessões expiradas
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Mover sessões expiradas para o histórico
    INSERT INTO public.user_session_history (
        user_id, session_token, ip_address, user_agent, 
        started_at, ended_at, duration_minutes, ended_by
    )
    SELECT 
        user_id, session_token, ip_address, user_agent,
        started_at, NOW(), 
        EXTRACT(EPOCH FROM (NOW() - started_at)) / 60,
        'timeout'
    FROM public.user_sessions 
    WHERE expires_at < NOW() AND is_active = TRUE;
    
    -- Remover sessões expiradas
    DELETE FROM public.user_sessions 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$;

-- Função para atualizar last_seen_at
CREATE OR REPLACE FUNCTION public.update_user_last_seen(p_session_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    UPDATE public.user_sessions 
    SET last_seen_at = NOW(), updated_at = NOW()
    WHERE session_token = p_session_token 
    AND expires_at > NOW() 
    AND is_active = TRUE;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected > 0;
END;
$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_sessions_updated_at 
    BEFORE UPDATE ON public.user_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para obter estatísticas de usuários online (apenas para super admins)
CREATE OR REPLACE FUNCTION public.get_online_users_stats()
RETURNS TABLE (
    total_online INTEGER,
    sessions_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se o usuário é super admin
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas super admins podem visualizar estatísticas de usuários online';
    END IF;
    
    -- Limpar sessões expiradas primeiro
    PERFORM cleanup_expired_sessions();
    
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_online,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'user_id', us.user_id,
                    'email', p.email,
                    'full_name', p.full_name,
                    'started_at', us.started_at,
                    'last_seen_at', us.last_seen_at,
                    'duration_minutes', EXTRACT(EPOCH FROM (NOW() - us.started_at)) / 60,
                    'ip_address', us.ip_address,
                    'user_agent', us.user_agent
                )
            ) FILTER (WHERE us.user_id IS NOT NULL),
            '[]'::jsonb
        ) as sessions_data
    FROM public.user_sessions us
    LEFT JOIN public.profiles p ON p.id = us.user_id
    WHERE us.is_active = TRUE 
    AND us.expires_at > NOW();
END;
$$;

-- Função para obter histórico de sessões de um usuário (apenas para super admins)
CREATE OR REPLACE FUNCTION public.get_user_session_history(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    ended_by TEXT,
    ip_address INET,
    user_agent TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se o usuário é super admin
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas super admins podem visualizar histórico de sessões';
    END IF;
    
    RETURN QUERY
    SELECT 
        ush.user_id,
        p.email,
        p.full_name,
        ush.started_at,
        ush.ended_at,
        ush.duration_minutes,
        ush.ended_by,
        ush.ip_address,
        ush.user_agent
    FROM public.user_session_history ush
    LEFT JOIN public.profiles p ON p.id = ush.user_id
    WHERE (p_user_id IS NULL OR ush.user_id = p_user_id)
    ORDER BY ush.started_at DESC
    LIMIT 100;
END;
$$;
