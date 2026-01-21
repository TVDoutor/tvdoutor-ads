-- =====================================================
-- SOLUÇÃO DEFINITIVA - Execute Isso e Pronto!
-- =====================================================

-- PASSO 1: Permitir leitura de VENUES para todos
GRANT SELECT ON venues TO authenticated, anon;

-- Se venues tiver RLS, desabilitar ou criar política permissiva
DO $$
BEGIN
    -- Tentar criar política de leitura para venues
    BEGIN
        DROP POLICY IF EXISTS "venues_public_read" ON venues;
        CREATE POLICY "venues_public_read" ON venues 
        FOR SELECT TO authenticated, anon USING (true);
    EXCEPTION WHEN OTHERS THEN
        -- Se der erro, desabilitar RLS em venues
        ALTER TABLE venues DISABLE ROW LEVEL SECURITY;
    END;
END $$;

-- PASSO 2: Configurar profissional_venue
ALTER TABLE profissional_venue DISABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas
DO $$ 
DECLARE pol TEXT;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profissional_venue'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol) || ' ON profissional_venue CASCADE';
    END LOOP;
END $$;

-- Reabilitar RLS
ALTER TABLE profissional_venue ENABLE ROW LEVEL SECURITY;

-- Criar política única e simples
CREATE POLICY "profissional_venue_allow_all" 
ON profissional_venue 
FOR ALL 
TO authenticated, anon
USING (true) 
WITH CHECK (true);

-- PASSO 3: Conceder todas as permissões necessárias
GRANT ALL ON profissional_venue TO authenticated;
GRANT SELECT ON profissional_venue TO anon;
GRANT SELECT ON profissionais_saude TO authenticated, anon;

-- PASSO 4: Verificação final
SELECT 
    '✅ CONFIGURADO!' as status,
    'Pode testar agora!' as mensagem;

-- Mostrar permissões
SELECT 
    table_name,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name IN ('venues', 'profissional_venue', 'profissionais_saude')
    AND grantee IN ('authenticated', 'anon')
ORDER BY table_name, grantee;
