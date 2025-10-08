-- ============================================
-- RECRIAR TRIGGER E FUNÇÃO - Execute se necessário
-- ============================================

-- 1. Remover trigger e função existentes
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Recriar a função handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    now(),
    now()
  );
  
  INSERT INTO public.user_roles (user_id, role, created_at)
  VALUES (new.id, 'user', now());
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Verificar se foi criado
SELECT 'Trigger recriado:' as info;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

SELECT 'Função recriada:' as info;
SELECT 
    proname as function_name,
    '✅ Função recriada' as status
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 5. Testar a função manualmente
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
BEGIN
    RAISE NOTICE 'Testando função handle_new_user...';
    
    -- Simular inserção em auth.users (isso vai disparar o trigger)
    INSERT INTO auth.users (
        id, 
        email, 
        encrypted_password, 
        email_confirmed_at, 
        created_at, 
        updated_at,
        raw_user_meta_data
    ) VALUES (
        test_user_id,
        'teste@example.com',
        'fake_password',
        now(),
        now(),
        now(),
        '{"full_name": "Usuário Teste"}'::jsonb
    );
    
    RAISE NOTICE '✅ Trigger executado com sucesso';
    
    -- Verificar se profile foi criado
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = test_user_id) THEN
        RAISE NOTICE '✅ Profile criado automaticamente';
    ELSE
        RAISE NOTICE '❌ Profile NÃO foi criado';
    END IF;
    
    -- Verificar se role foi criada
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = test_user_id) THEN
        RAISE NOTICE '✅ Role criada automaticamente';
    ELSE
        RAISE NOTICE '❌ Role NÃO foi criada';
    END IF;
    
    -- Limpar registros de teste
    DELETE FROM public.user_roles WHERE user_id = test_user_id;
    DELETE FROM public.profiles WHERE id = test_user_id;
    DELETE FROM auth.users WHERE id = test_user_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Erro ao testar trigger: %', SQLERRM;
END $$;

SELECT '✅ Trigger e função recriados! Teste o signup agora.' as status;
