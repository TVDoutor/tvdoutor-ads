-- Permite formato alfanumérico no código do ponto: P3348.F01, P3348.F04.1, etc.
-- Aceita múltiplos segmentos após o ponto: P####.XX.YY (ex: P3348.F04.1)

-- Remove constraints antigas (nominação pode variar entre ambientes)
ALTER TABLE public.screens DROP CONSTRAINT IF EXISTS screens_code_check;
ALTER TABLE public.screens DROP CONSTRAINT IF EXISTS screens_code_format_check;

-- Adiciona a nova constraint: P#### ou P#####.XX[.YY...] (ex: P3348, P3348.F01, P3348.F04.1)
ALTER TABLE public.screens
  ADD CONSTRAINT screens_code_format_check
  CHECK (code ~ '^P[0-9]{4,5}(\.[A-Za-z0-9]+)*$');

COMMENT ON COLUMN public.screens.code IS 'Unique screen code: P#### ou P#####.XX.YY (ex: P3348, P3348.F01, P3348.F04.1)';
