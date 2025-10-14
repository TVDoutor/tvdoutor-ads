-- ============================================
-- QUERIES ÚTEIS PARA MONITORAMENTO DE SESSÕES
-- ============================================
-- Sistema de Monitoramento de Sessões - TVDoutor
-- Use estas queries no Supabase SQL Editor para monitorar e diagnosticar

-- ============================================
-- 1. VERIFICAÇÃO DA INSTALAÇÃO
-- ============================================

-- Verificar se as tabelas existem
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
        THEN '✅ Existe'
        ELSE '❌ Não encontrada'
    END as status
FROM (
    VALUES ('user_sessions'), ('user_session_history')
) AS t(table_name);

-- Verificar se pg_cron está instalado
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
        THEN '✅ pg_cron instalado - versão: ' || extversion
        ELSE '❌ pg_cron NÃO instalado'
    END as status
FROM pg_extension 
WHERE extname = 'pg_cron'
UNION ALL
SELECT '⚠️ pg_cron não encontrado' WHERE NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
);

-- Verificar se o cron job está ativo
SELECT 
    jobid,
    jobname,
    schedule,
    active,
    CASE 
        WHEN active THEN '✅ Ativo'
        ELSE '❌ Inativo'
    END as status
FROM cron.job 
WHERE jobname = 'cleanup-expired-user-sessions';

-- ============================================
-- 2. MONITORAMENTO EM TEMPO REAL
-- ============================================

-- Ver usuários online AGORA
SELECT 
    COUNT(*) as total_usuarios_online,
    COUNT(DISTINCT user_id) as usuarios_unicos
FROM public.user_sessions 
WHERE is_active = TRUE 
AND expires_at > NOW();

-- Ver detalhes dos usuários online
SELECT 
    p.email,
    p.full_name,
    us.started_at,
    us.last_seen_at,
    EXTRACT(EPOCH FROM (NOW() - us.started_at)) / 60 as minutos_online,
    EXTRACT(EPOCH FROM (us.expires_at - NOW())) / 60 as minutos_ate_expirar,
    us.ip_address,
    SUBSTRING(us.user_agent, 1, 50) as navegador
FROM public.user_sessions us
LEFT JOIN public.profiles p ON p.id = us.user_id
WHERE us.is_active = TRUE 
AND us.expires_at > NOW()
ORDER BY us.started_at DESC;

-- Ver sessões que vão expirar nos próximos 30 minutos
SELECT 
    p.email,
    p.full_name,
    us.expires_at,
    EXTRACT(EPOCH FROM (us.expires_at - NOW())) / 60 as minutos_restantes
FROM public.user_sessions us
LEFT JOIN public.profiles p ON p.id = us.user_id
WHERE us.is_active = TRUE 
AND us.expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 minutes'
ORDER BY us.expires_at ASC;

-- ============================================
-- 3. HISTÓRICO E ESTATÍSTICAS
-- ============================================

-- Últimas 20 sessões encerradas
SELECT 
    p.email,
    p.full_name,
    ush.started_at,
    ush.ended_at,
    ush.duration_minutes,
    ush.ended_by,
    ush.ip_address
FROM public.user_session_history ush
LEFT JOIN public.profiles p ON p.id = ush.user_id
ORDER BY ush.ended_at DESC
LIMIT 20;

-- Estatísticas por forma de encerramento
SELECT 
    ended_by,
    COUNT(*) as total,
    AVG(duration_minutes) as duracao_media_minutos,
    MIN(duration_minutes) as duracao_minima,
    MAX(duration_minutes) as duracao_maxima
FROM public.user_session_history
WHERE ended_at > NOW() - INTERVAL '7 days'
GROUP BY ended_by
ORDER BY total DESC;

-- Top 10 usuários com mais sessões nos últimos 7 dias
SELECT 
    p.email,
    p.full_name,
    COUNT(*) as total_sessoes,
    AVG(ush.duration_minutes) as duracao_media_minutos,
    MAX(ush.ended_at) as ultima_sessao
FROM public.user_session_history ush
LEFT JOIN public.profiles p ON p.id = ush.user_id
WHERE ush.ended_at > NOW() - INTERVAL '7 days'
GROUP BY p.id, p.email, p.full_name
ORDER BY total_sessoes DESC
LIMIT 10;

-- Atividade por hora do dia (últimos 7 dias)
SELECT 
    EXTRACT(HOUR FROM started_at) as hora,
    COUNT(*) as total_sessoes,
    AVG(duration_minutes) as duracao_media
FROM public.user_session_history
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM started_at)
ORDER BY hora;

-- Atividade por dia da semana
SELECT 
    TO_CHAR(started_at, 'Day') as dia_semana,
    COUNT(*) as total_sessoes,
    AVG(duration_minutes) as duracao_media
FROM public.user_session_history
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY TO_CHAR(started_at, 'Day'), EXTRACT(DOW FROM started_at)
ORDER BY EXTRACT(DOW FROM started_at);

-- ============================================
-- 4. DIAGNÓSTICO E TROUBLESHOOTING
-- ============================================

-- Ver histórico de execuções do cron job
SELECT 
    runid,
    start_time,
    end_time,
    status,
    return_message,
    EXTRACT(EPOCH FROM (end_time - start_time)) as duracao_segundos
FROM cron.job_run_details 
WHERE jobname = 'cleanup-expired-user-sessions' 
ORDER BY start_time DESC 
LIMIT 20;

-- Ver últimas execuções com erro
SELECT 
    start_time,
    status,
    return_message
FROM cron.job_run_details 
WHERE jobname = 'cleanup-expired-user-sessions' 
AND status = 'failed'
ORDER BY start_time DESC 
LIMIT 10;

-- Ver sessões órfãs (usuários que não existem mais)
SELECT 
    us.user_id,
    us.session_token,
    us.started_at,
    'Usuário não encontrado' as problema
FROM public.user_sessions us
LEFT JOIN auth.users u ON u.id = us.user_id
WHERE u.id IS NULL;

-- Ver sessões duplicadas (mesmo usuário com múltiplas sessões)
SELECT 
    user_id,
    COUNT(*) as total_sessoes,
    ARRAY_AGG(session_token) as tokens
FROM public.user_sessions
WHERE is_active = TRUE
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Ver sessões que deveriam ter expirado mas ainda estão ativas
SELECT 
    p.email,
    us.expires_at,
    us.is_active,
    EXTRACT(EPOCH FROM (NOW() - us.expires_at)) / 60 as minutos_apos_expiracao
FROM public.user_sessions us
LEFT JOIN public.profiles p ON p.id = us.user_id
WHERE us.is_active = TRUE 
AND us.expires_at < NOW()
ORDER BY us.expires_at;

-- ============================================
-- 5. OPERAÇÕES ADMINISTRATIVAS
-- ============================================

-- Executar limpeza manual de sessões expiradas
SELECT cleanup_expired_sessions() as sessoes_removidas;

-- Forçar logout de um usuário específico (substituir USER_ID)
-- DELETE FROM public.user_sessions WHERE user_id = 'USER_ID';

-- Forçar logout de TODOS os usuários (USE COM CUIDADO!)
-- DELETE FROM public.user_sessions WHERE is_active = TRUE;

-- Desativar uma sessão específica (substituir SESSION_TOKEN)
-- UPDATE public.user_sessions 
-- SET is_active = FALSE 
-- WHERE session_token = 'SESSION_TOKEN';

-- Estender tempo de expiração de uma sessão (substituir SESSION_TOKEN)
-- UPDATE public.user_sessions 
-- SET expires_at = NOW() + INTERVAL '24 hours' 
-- WHERE session_token = 'SESSION_TOKEN';

-- ============================================
-- 6. MANUTENÇÃO E LIMPEZA
-- ============================================

-- Limpar histórico muito antigo (mais de 90 dias)
-- DELETE FROM public.user_session_history 
-- WHERE ended_at < NOW() - INTERVAL '90 days';

-- Ver tamanho das tabelas
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamanho
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE '%session%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Contar registros em cada tabela
SELECT 
    'user_sessions' as tabela,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE is_active = TRUE) as ativos,
    COUNT(*) FILTER (WHERE is_active = FALSE) as inativos
FROM public.user_sessions
UNION ALL
SELECT 
    'user_session_history' as tabela,
    COUNT(*) as total_registros,
    NULL as ativos,
    NULL as inativos
FROM public.user_session_history;

-- ============================================
-- 7. RELATÓRIOS EXECUTIVOS
-- ============================================

-- Resumo geral do sistema
SELECT 
    (SELECT COUNT(*) FROM public.user_sessions WHERE is_active = TRUE) as usuarios_online_agora,
    (SELECT COUNT(*) FROM public.user_session_history WHERE DATE(ended_at) = CURRENT_DATE) as sessoes_hoje,
    (SELECT COUNT(*) FROM public.user_session_history WHERE ended_at > NOW() - INTERVAL '7 days') as sessoes_ultimos_7_dias,
    (SELECT AVG(duration_minutes) FROM public.user_session_history WHERE ended_at > NOW() - INTERVAL '7 days') as duracao_media_minutos,
    (SELECT COUNT(DISTINCT user_id) FROM public.user_session_history WHERE ended_at > NOW() - INTERVAL '30 days') as usuarios_ativos_30_dias;

-- Pico de usuários online por dia (últimos 30 dias)
WITH sessoes_por_minuto AS (
    SELECT 
        DATE(started_at) as dia,
        DATE_TRUNC('minute', started_at) as minuto,
        COUNT(*) as usuarios_simultaneos
    FROM public.user_sessions
    WHERE started_at > NOW() - INTERVAL '30 days'
    GROUP BY DATE(started_at), DATE_TRUNC('minute', started_at)
)
SELECT 
    dia,
    MAX(usuarios_simultaneos) as pico_usuarios_online
FROM sessoes_por_minuto
GROUP BY dia
ORDER BY dia DESC;

-- Taxa de retenção (usuários que voltam)
WITH usuarios_por_dia AS (
    SELECT 
        DATE(started_at) as dia,
        user_id
    FROM public.user_session_history
    WHERE started_at > NOW() - INTERVAL '30 days'
    GROUP BY DATE(started_at), user_id
)
SELECT 
    a.dia,
    COUNT(DISTINCT a.user_id) as usuarios_dia,
    COUNT(DISTINCT b.user_id) as usuarios_retornaram_dia_seguinte,
    ROUND(100.0 * COUNT(DISTINCT b.user_id) / NULLIF(COUNT(DISTINCT a.user_id), 0), 2) as taxa_retencao_pct
FROM usuarios_por_dia a
LEFT JOIN usuarios_por_dia b ON b.user_id = a.user_id AND b.dia = a.dia + 1
GROUP BY a.dia
ORDER BY a.dia DESC
LIMIT 30;

-- ============================================
-- 8. ALERTAS E MONITORAMENTO
-- ============================================

-- Alertas: Sessões inativas há mais de 1 hora mas ainda ativas
SELECT 
    p.email,
    us.last_seen_at,
    EXTRACT(EPOCH FROM (NOW() - us.last_seen_at)) / 60 as minutos_sem_atividade,
    '⚠️ Possível sessão abandonada' as alerta
FROM public.user_sessions us
LEFT JOIN public.profiles p ON p.id = us.user_id
WHERE us.is_active = TRUE 
AND us.last_seen_at < NOW() - INTERVAL '1 hour'
AND us.expires_at > NOW()
ORDER BY us.last_seen_at ASC;

-- Alertas: Múltiplos logins do mesmo usuário em IPs diferentes
SELECT 
    p.email,
    COUNT(*) as total_sessoes,
    COUNT(DISTINCT us.ip_address) as ips_diferentes,
    ARRAY_AGG(DISTINCT us.ip_address) as ips,
    '⚠️ Múltiplos IPs simultâneos' as alerta
FROM public.user_sessions us
LEFT JOIN public.profiles p ON p.id = us.user_id
WHERE us.is_active = TRUE
GROUP BY us.user_id, p.email
HAVING COUNT(DISTINCT us.ip_address) > 1
ORDER BY total_sessoes DESC;

-- Alertas: Sessões com duração muito longa (mais de 12 horas)
SELECT 
    p.email,
    us.started_at,
    EXTRACT(EPOCH FROM (NOW() - us.started_at)) / 3600 as horas_online,
    '⚠️ Sessão muito longa' as alerta
FROM public.user_sessions us
LEFT JOIN public.profiles p ON p.id = us.user_id
WHERE us.is_active = TRUE 
AND us.started_at < NOW() - INTERVAL '12 hours'
ORDER BY us.started_at ASC;

