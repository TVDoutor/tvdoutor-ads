-- Fix para o trigger handle_new_user
-- Criar uma versão mais robusta do trigger

-- 1. Remover trigger existente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Criar função handle_new_user mais robusta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_name TEXT;
    user_email TEXT;
BEGIN
    -- Obter dados do usuário
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.email,
        'User'
    );
    
    user_email := NEW.email;
    
    -- Inserir profile com tratamento de erro
    BEGIN
        INSERT INTO public.profiles (
            id, 
            email, 
            display_name, 
            full_name, 
            created_at, 
            updated_at
        )
        VALUES (
            NEW.id,
            user_email,
            user_name,
            user_name,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            updated_at = NOW();
            
        RAISE NOTICE 'Profile created/updated for user: %', user_email;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Error creating profile for user %: %', user_email, SQLERRM;
    END;
    
    -- Inserir role com tratamento de erro
    BEGIN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'user')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'User role created for user: %', user_email;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Error creating user role for user %: %', user_email, SQLERRM;
    END;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log o erro mas permitir a criação do usuário
        RAISE WARNING 'Error in handle_new_user trigger for user %: %', user_email, SQLERRM;
        RETURN NEW;
END;
$$;

-- 3. Criar trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. Garantir permissões
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO anon;
