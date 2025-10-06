-- Debug signup issues

-- 1. Verificar se o trigger existe
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND trigger_schema = 'auth';

-- 2. Verificar se a função handle_new_user existe
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname = 'handle_new_user' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 3. Verificar políticas RLS na tabela profiles
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
AND schemaname = 'public';

-- 4. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles' 
AND schemaname = 'public';

-- 5. Testar inserção manual na tabela profiles (para debug)
-- INSERT INTO public.profiles (id, display_name, full_name, email, role)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'Test', 'Test', 'test@test.com', 'user');
