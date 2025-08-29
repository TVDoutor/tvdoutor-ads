-- Script para verificar os valores válidos do enum app_role
SELECT 
    pg_type.typname AS enum_name,
    pg_enum.enumlabel AS enum_value
FROM 
    pg_type 
JOIN 
    pg_enum ON pg_enum.enumtypid = pg_type.oid
WHERE 
    pg_type.typname = 'app_role'
ORDER BY 
    pg_enum.enumsortorder;