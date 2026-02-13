-- Migração consolidada para corrigir problemas de RLS e estrutura
-- Esta migração aplica apenas as correções necessárias sem conflitos

-- 1. Garantir que a coluna super_admin existe na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS super_admin BOOLEAN DEFAULT false;

-- 2. Criar índice para performance na coluna super_admin
CREATE INDEX IF NOT EXISTS idx_profiles_super_admin ON public.profiles(super_admin) WHERE super_admin = true;

-- 3. Comentário de documentação
COMMENT ON COLUMN public.profiles.super_admin IS 'Indica se o usuário é um super administrador do sistema';

-- 4. Corrigir políticas RLS da tabela agencia_projeto_marcos (se a tabela existir)
DO $$
BEGIN
    -- Verificar se a tabela agencia_projeto_marcos existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_projeto_marcos' AND table_schema = 'public') THEN
        
        -- Remover políticas existentes
        DROP POLICY IF EXISTS projeto_marcos_read_policy ON agencia_projeto_marcos;
        DROP POLICY IF EXISTS projeto_marcos_write_policy ON agencia_projeto_marcos;
        DROP POLICY IF EXISTS projeto_marcos_policy ON agencia_projeto_marcos;
        DROP POLICY IF EXISTS agencia_projeto_marcos_select_policy ON agencia_projeto_marcos;
        DROP POLICY IF EXISTS agencia_projeto_marcos_insert_policy ON agencia_projeto_marcos;
        DROP POLICY IF EXISTS agencia_projeto_marcos_update_policy ON agencia_projeto_marcos;
        DROP POLICY IF EXISTS agencia_projeto_marcos_delete_policy ON agencia_projeto_marcos;
        
        -- Política para leitura (SELECT) - permite usuários autenticados lerem marcos
        CREATE POLICY agencia_projeto_marcos_select_policy ON agencia_projeto_marcos
          FOR SELECT USING (
            auth.uid() IS NOT NULL
          );
        
        -- Verificar se a tabela agencia_projeto_equipe existe antes de criar políticas que a referenciam
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_projeto_equipe' AND table_schema = 'public') THEN
            
            -- Política para inserção (INSERT) - permite usuários autenticados criarem marcos
            CREATE POLICY agencia_projeto_marcos_insert_policy ON agencia_projeto_marcos
              FOR INSERT WITH CHECK (
                auth.uid() IS NOT NULL AND (
                  is_super_admin() OR
                  EXISTS (
                    SELECT 1 FROM agencia_projetos ap 
                    WHERE ap.id = projeto_id AND ap.responsavel_projeto = auth.uid()
                  ) OR
                  EXISTS (
                    SELECT 1 FROM agencia_projeto_equipe ape
                    WHERE ape.projeto_id = projeto_id AND ape.usuario_id = auth.uid() AND ape.ativo = true
                  )
                )
              );
            
            -- Política para atualização (UPDATE)
            CREATE POLICY agencia_projeto_marcos_update_policy ON agencia_projeto_marcos
              FOR UPDATE USING (
                auth.uid() IS NOT NULL AND (
                  is_super_admin() OR
                  responsavel_id = auth.uid() OR
                  created_by = auth.uid() OR
                  EXISTS (
                    SELECT 1 FROM agencia_projetos ap 
                    WHERE ap.id = projeto_id AND ap.responsavel_projeto = auth.uid()
                  ) OR
                  EXISTS (
                    SELECT 1 FROM agencia_projeto_equipe ape
                    WHERE ape.projeto_id = projeto_id AND ape.usuario_id = auth.uid() AND ape.ativo = true
                  )
                )
              );
            
            -- Política para exclusão (DELETE)
            CREATE POLICY agencia_projeto_marcos_delete_policy ON agencia_projeto_marcos
              FOR DELETE USING (
                auth.uid() IS NOT NULL AND (
                  is_super_admin() OR
                  responsavel_id = auth.uid() OR
                  created_by = auth.uid() OR
                  EXISTS (
                    SELECT 1 FROM agencia_projetos ap 
                    WHERE ap.id = projeto_id AND ap.responsavel_projeto = auth.uid()
                  ) OR
                  EXISTS (
                    SELECT 1 FROM agencia_projeto_equipe ape
                    WHERE ape.projeto_id = projeto_id AND ape.usuario_id = auth.uid() AND ape.ativo = true
                  )
                )
              );
        ELSE
            -- Se a tabela agencia_projeto_equipe não existe, criar políticas mais simples
            CREATE POLICY agencia_projeto_marcos_insert_policy ON agencia_projeto_marcos
              FOR INSERT WITH CHECK (
                auth.uid() IS NOT NULL AND (
                  is_super_admin() OR
                  EXISTS (
                    SELECT 1 FROM agencia_projetos ap 
                    WHERE ap.id = projeto_id AND ap.responsavel_projeto = auth.uid()
                  )
                )
              );
            
            CREATE POLICY agencia_projeto_marcos_update_policy ON agencia_projeto_marcos
              FOR UPDATE USING (
                auth.uid() IS NOT NULL AND (
                  is_super_admin() OR
                  responsavel_id = auth.uid() OR
                  created_by = auth.uid() OR
                  EXISTS (
                    SELECT 1 FROM agencia_projetos ap 
                    WHERE ap.id = projeto_id AND ap.responsavel_projeto = auth.uid()
                  )
                )
              );
            
            CREATE POLICY agencia_projeto_marcos_delete_policy ON agencia_projeto_marcos
              FOR DELETE USING (
                auth.uid() IS NOT NULL AND (
                  is_super_admin() OR
                  responsavel_id = auth.uid() OR
                  created_by = auth.uid() OR
                  EXISTS (
                    SELECT 1 FROM agencia_projetos ap 
                    WHERE ap.id = projeto_id AND ap.responsavel_projeto = auth.uid()
                  )
                )
              );
        END IF;
        
        -- Garantir que RLS está habilitado
        ALTER TABLE agencia_projeto_marcos ENABLE ROW LEVEL SECURITY;
        
    END IF;
END $$;

-- 5. Corrigir políticas RLS da tabela profiles
DO $$
BEGIN
    -- Remover políticas existentes que podem estar causando conflito
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
    DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
    
    -- Criar políticas mais permissivas para profiles
    CREATE POLICY "profiles_select_policy" ON public.profiles
        FOR SELECT USING (
            auth.uid() IS NOT NULL AND (
                id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.profiles p 
                    WHERE p.id = auth.uid() AND p.super_admin = true
                )
            )
        );
    
    CREATE POLICY "profiles_insert_policy" ON public.profiles
        FOR INSERT WITH CHECK (
            auth.uid() IS NOT NULL AND (
                id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.profiles p 
                    WHERE p.id = auth.uid() AND p.super_admin = true
                )
            )
        );
    
    CREATE POLICY "profiles_update_policy" ON public.profiles
        FOR UPDATE USING (
            auth.uid() IS NOT NULL AND (
                id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.profiles p 
                    WHERE p.id = auth.uid() AND p.super_admin = true
                )
            )
        );
    
    -- Garantir que RLS está habilitado
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
END $$;

-- 6. Comentários para documentação
COMMENT ON TABLE public.profiles IS 'Perfis de usuários do sistema';
COMMENT ON POLICY "profiles_select_policy" ON public.profiles IS 'Permite usuários verem seu próprio perfil ou super admins verem todos';
COMMENT ON POLICY "profiles_insert_policy" ON public.profiles IS 'Permite criação de perfis pelo próprio usuário ou super admins';
COMMENT ON POLICY "profiles_update_policy" ON public.profiles IS 'Permite atualização de perfis pelo próprio usuário ou super admins';