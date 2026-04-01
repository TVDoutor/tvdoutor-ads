-- Fallback para email/nome em get_online_users_stats quando profiles está vazio
-- Usuários como publicidade3@tvdoutor.com.br podem ter profile sem email; usar auth.users

CREATE OR REPLACE FUNCTION public.get_online_users_stats()
RETURNS TABLE (
    total_online INTEGER,
    sessions_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas super admins podem visualizar estatísticas de usuários online';
    END IF;
    
    PERFORM cleanup_expired_sessions();
    
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_online,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'user_id', us.user_id,
                    'email', COALESCE(p.email, au.email),
                    'full_name', COALESCE(p.full_name, au.raw_user_meta_data->>'full_name', au.email),
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
    LEFT JOIN auth.users au ON au.id = us.user_id
    WHERE us.is_active = TRUE 
    AND us.expires_at > NOW();
END;
$$;

-- Mesmo fallback para get_user_session_history (histórico)
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
SET search_path = public
AS $$
BEGIN
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas super admins podem visualizar histórico de sessões';
    END IF;
    
    RETURN QUERY
    SELECT 
        ush.user_id,
        COALESCE(p.email, au.email),
        COALESCE(p.full_name, au.raw_user_meta_data->>'full_name', au.email),
        ush.started_at,
        ush.ended_at,
        ush.duration_minutes,
        ush.ended_by,
        ush.ip_address,
        ush.user_agent
    FROM public.user_session_history ush
    LEFT JOIN public.profiles p ON p.id = ush.user_id
    LEFT JOIN auth.users au ON au.id = ush.user_id
    WHERE (p_user_id IS NULL OR ush.user_id = p_user_id)
    ORDER BY ush.started_at DESC
    LIMIT 100;
END;
$$;
