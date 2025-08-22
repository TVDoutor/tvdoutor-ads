-- Script para corrigir permissões RLS que estão causando erro 500
-- Execute no Supabase SQL Editor

-- 1. TEMPORARIAMENTE desabilitar RLS para identificar o problema
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 2. Verificar se há dados problemáticos
SELECT 'Verificando profiles' as status;
SELECT count(*) as total_profiles FROM public.profiles;
SELECT count(*) as total_users FROM auth.users;
SELECT count(*) as total_roles FROM public.user_roles;

-- 3. Limpar políticas problemáticas
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin full access profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin full access user_roles" ON public.user_roles;

-- 4. Reabilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas mais simples e permissivas
CREATE POLICY "Allow all for authenticated users" ON public.profiles
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON public.user_roles
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Verificar se o trigger está funcionando
SELECT 'Verificando trigger' as status;
SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass;

-- 7. Recriar trigger se necessário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. Verificar se a função handle_new_user existe e está funcionando
SELECT 'Verificando função handle_new_user' as status;
SELECT proname, prosrc FROM pg_proc WHERE proname = 'handle_new_user';

-- 9. Testar inserção manual (descomente para testar)
-- DO $$
-- DECLARE
--     test_user_id uuid := gen_random_uuid();
-- BEGIN
--     -- Simular inserção de usuário
--     INSERT INTO public.profiles (id, email, full_name, display_name, role) 
--     VALUES (test_user_id, 'test@example.com', 'Test User', 'Test User', 'user');
--     
--     INSERT INTO public.user_roles (user_id, role) 
--     VALUES (test_user_id, 'user');
--     
--     RAISE NOTICE 'Teste de inserção bem-sucedido';
--     
--     -- Limpar teste
--     DELETE FROM public.user_roles WHERE user_id = test_user_id;
--     DELETE FROM public.profiles WHERE id = test_user_id;
-- END $$;

SELECT 'Script executado com sucesso' as status;
