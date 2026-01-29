-- =============================================================================
-- tvd_player_status: players OFFLINE há mais de 24 horas
-- Critério: last_seen < NOW() - 24h (ou last_seen IS NULL = nunca visto)
-- =============================================================================

-- 1) Contagem: quantos offline > 24h
SELECT COUNT(*) AS offline_mais_24h
FROM tvd_player_status
WHERE last_seen IS NULL
   OR last_seen < (NOW() AT TIME ZONE 'UTC') - INTERVAL '24 hours';

-- 2) Resumo: total, online, offline, offline > 24h
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE is_connected) AS online,
  COUNT(*) FILTER (WHERE NOT is_connected) AS offline,
  COUNT(*) FILTER (
    WHERE last_seen IS NULL
       OR last_seen < (NOW() AT TIME ZONE 'UTC') - INTERVAL '24 hours'
  ) AS offline_mais_24h,
  MAX(fetched_at) AS ultima_sincronia
FROM tvd_player_status;

-- 3) Lista: players offline > 24h (ordenados pelo mais antigo)
SELECT
  player_id,
  player_name,
  venue_code,
  is_connected,
  last_seen,
  last_sync,
  sync_progress,
  fetched_at,
  EXTRACT(EPOCH FROM ((NOW() AT TIME ZONE 'UTC') - last_seen)) / 3600 AS horas_desde_last_seen
FROM tvd_player_status
WHERE last_seen IS NULL
   OR last_seen < (NOW() AT TIME ZONE 'UTC') - INTERVAL '24 hours'
ORDER BY last_seen ASC NULLS FIRST
LIMIT 100;

-- 4) Somente com venue_code (para cruzar com inventário)
SELECT
  player_id,
  player_name,
  venue_code,
  is_connected,
  last_seen,
  EXTRACT(EPOCH FROM ((NOW() AT TIME ZONE 'UTC') - last_seen)) / 3600 AS horas_sem_contato
FROM tvd_player_status
WHERE venue_code IS NOT NULL
  AND (last_seen IS NULL OR last_seen < (NOW() AT TIME ZONE 'UTC') - INTERVAL '24 hours')
ORDER BY last_seen ASC NULLS FIRST
LIMIT 50;
