-- Desabilitar RLS temporariamente para debug
-- Isso permitirá que o trigger funcione sem problemas de permissão

-- 1. Desabilitar RLS na tabela profiles temporariamente
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Desabilitar RLS na tabela user_roles temporariamente  
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 3. Garantir permissões completas
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO anon;

-- 4. Garantir permissões nas sequências
GRANT USAGE ON SEQUENCE public.profiles_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.profiles_id_seq TO anon;
GRANT USAGE ON SEQUENCE public.user_roles_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.user_roles_id_seq TO anon;
