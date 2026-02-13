-- Limpar sessões duplicadas do banco de dados
-- Execute no Supabase SQL Editor

-- 1. Ver sessões atuais (antes da limpeza)
SELECT 
    user_id, 
    COUNT(*) as total_sessions,
    MAX(started_at) as last_session
FROM user_sessions 
WHERE is_active = true
GROUP BY user_id
HAVING COUNT(*) > 1;

-- 2. Deletar TODAS as sessões ativas (reset completo)
DELETE FROM user_sessions WHERE is_active = true;

-- 3. Verificar se foi limpo
SELECT COUNT(*) as remaining_active_sessions 
FROM user_sessions 
WHERE is_active = true;

-- 4. (Opcional) Limpar histórico também
-- DELETE FROM user_session_history;

