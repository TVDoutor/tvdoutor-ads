-- Corrigir políticas RLS da tabela profiles para permitir criação automática de perfis
-- Esta migração resolve o erro: new row violates row-level security policy for table "profiles"

-- Remover todas as políticas existentes da tabela profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Criar políticas mais permissivas para resolver problemas de criação de perfil

-- Política para visualização de perfis (usuários autenticados podem ver todos os perfis)
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Política para usuários atualizarem seus próprios perfis
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política para admins visualizarem todos os perfis (apenas se user_roles existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles' AND table_schema = 'public') THEN
        CREATE POLICY "Admins can view all profiles" ON public.profiles
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM public.user_roles
              WHERE user_id = auth.uid()
              AND role IN ('admin', 'super_admin')
            )
          );
    END IF;
END $$;

-- Política para admins atualizarem todos os perfis (apenas se user_roles existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles' AND table_schema = 'public') THEN
        CREATE POLICY "Admins can update all profiles" ON public.profiles
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM public.user_roles
              WHERE user_id = auth.uid()
              AND role IN ('admin', 'super_admin')
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.user_roles
              WHERE user_id = auth.uid()
              AND role IN ('admin', 'super_admin')
            )
          );
    END IF;
END $$;

-- Política CRÍTICA: Permitir inserção de perfis para usuários autenticados
-- Esta política resolve o erro de violação de RLS
CREATE POLICY "Allow profile creation for authenticated users" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    auth.uid() = id
  );

-- Política adicional para funções do sistema (SECURITY DEFINER)
CREATE POLICY "System functions can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Garantir que a função ensure_profile tenha as permissões corretas
GRANT EXECUTE ON FUNCTION public.ensure_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile() TO anon;