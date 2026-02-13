-- Backfill de audience_monthly para que a audiência apareça na Lista de Telas (Inventário)
-- Execute este script no Supabase (SQL Editor) ou via CLI se tiver acesso ao banco.
--
-- Opção 1: Copiar de venue_audience_monthly (quando a tela tem venue_id)
UPDATE public.screens s
SET audience_monthly = vam.audience
FROM public.venue_audience_monthly vam
WHERE s.venue_id = vam.venue_id
  AND (s.audience_monthly IS NULL OR s.audience_monthly = 0);

-- Opção 2 (opcional): Definir um valor padrão para telas que ainda estiverem NULL
-- Descomente e ajuste o valor (ex: 10000) se quiser um padrão para todas as telas sem audiência:
-- UPDATE public.screens
-- SET audience_monthly = 10000
-- WHERE audience_monthly IS NULL AND active = true;

-- Conferir quantas linhas passaram a ter audiência
-- SELECT COUNT(*) AS com_audiencia FROM public.screens WHERE audience_monthly IS NOT NULL AND audience_monthly > 0;
