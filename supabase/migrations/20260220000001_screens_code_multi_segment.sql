-- Atualiza constraint para aceitar múltiplos segmentos: P3348.F04.1
-- Formato: P#### ou P#####.XX[.YY...]

ALTER TABLE public.screens DROP CONSTRAINT IF EXISTS screens_code_format_check;

ALTER TABLE public.screens
  ADD CONSTRAINT screens_code_format_check
  CHECK (code ~ '^P[0-9]{4,5}(\.[A-Za-z0-9]+)*$');

COMMENT ON COLUMN public.screens.code IS 'Unique screen code: P#### ou P#####.XX.YY (ex: P3348, P3348.F01, P3348.F04.1)';
