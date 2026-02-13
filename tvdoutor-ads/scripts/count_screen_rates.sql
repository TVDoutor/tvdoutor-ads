-- Quantos registros e quantos screens/venues possuem dados em screen_rates
-- Execute no Supabase: SQL Editor > New query > Cole e rode

-- 1) Total de linhas na tabela screen_rates
SELECT COUNT(*) AS total_linhas_screen_rates
FROM public.screen_rates;

-- 2) Quantas telas (screens) distintas possuem pelo menos um rate
SELECT COUNT(DISTINCT screen_id) AS telas_com_rates
FROM public.screen_rates
WHERE screen_id IS NOT NULL;

-- 3) Quantos venues distintos possuem pelo menos uma tela com rate
--    (screens.venue_id liga tela ao venue)
SELECT COUNT(DISTINCT s.venue_id) AS venues_com_rates
FROM public.screen_rates sr
JOIN public.screens s ON s.id = sr.screen_id
WHERE s.venue_id IS NOT NULL;

-- 4) Resumo em uma única linha (opcional)
SELECT
  (SELECT COUNT(*) FROM public.screen_rates) AS total_linhas,
  (SELECT COUNT(DISTINCT screen_id) FROM public.screen_rates WHERE screen_id IS NOT NULL) AS telas_com_rates,
  (SELECT COUNT(DISTINCT s.venue_id) FROM public.screen_rates sr JOIN public.screens s ON s.id = sr.screen_id WHERE s.venue_id IS NOT NULL) AS venues_com_rates;
