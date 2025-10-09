-- Verificar se existe tabela 'role' no banco
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'role'
ORDER BY ordinal_position;

-- Verificar dados da tabela role se existir
SELECT * FROM public.role LIMIT 10;
