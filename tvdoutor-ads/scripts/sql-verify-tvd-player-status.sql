-- =============================================================================
-- Verificar tvd_player_status para a coluna "Conexão (TVD)" no Inventário
-- Execute no Supabase SQL Editor.
-- =============================================================================

-- 1) Contagem total e com venue_code
SELECT
  COUNT(*) AS total,
  COUNT(venue_code) AS com_venue_code,
  COUNT(*) - COUNT(venue_code) AS sem_venue_code,
  MAX(fetched_at) AS ultima_sincronia
FROM tvd_player_status;

-- 2) Amostra de venue_codes (ex.: P2000, P2000.01) para cruzar com inventário
SELECT DISTINCT venue_code
FROM tvd_player_status
WHERE venue_code IS NOT NULL
ORDER BY venue_code
LIMIT 100;

-- 3) Exemplo: códigos que batem com "P2000" no inventário
SELECT player_id, player_name, venue_code, is_connected, last_seen, fetched_at
FROM tvd_player_status
WHERE venue_code IS NOT NULL
  AND (venue_code LIKE 'P2000%' OR venue_code = 'P2000')
ORDER BY venue_code
LIMIT 50;

-- Se (1) total = 0: tabela vazia → rode o sync (Edge Function tvd-sync-players).
-- Se com_venue_code = 0: sync rodou mas nenhum player tem nome no formato Pxxxx.
-- Se há linhas em (2)/(3): o frontend deve conseguir exibir Conexão (TVD) após reload.
