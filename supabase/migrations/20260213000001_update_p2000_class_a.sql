-- Atualiza telas P2000 e variações (P2000.1, P2000.2, etc.) para classe A
UPDATE public.screens
SET class = 'A'::class_band,
    updated_at = NOW()
WHERE code = 'P2000' OR code LIKE 'P2000.%';
