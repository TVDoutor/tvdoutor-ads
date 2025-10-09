-- CORREÃ‡ÃƒO URGENTE: Permitir que usuÃ¡rios admin acessem pÃ¡ginas de manager
-- 1. Verificar se o enum app_role contÃ©m 'manager'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'manager' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
    ) THEN
        ALTER TYPE public.app_role ADD VALUE 'manager';
        RAISE NOTICE 'Role manager adicionada ao enum app_role';
    ELSE
        RAISE NOTICE 'Role manager jÃ¡ existe no enum app_role';
    END IF;
END $$;

-- 2. Garantir que o usuÃ¡rio admin tem role 'admin' na tabela user_roles
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
    p.id,
    'admin'::app_role,
    now()
FROM profiles p
WHERE (p.email = 'hildebrando.cardoso@tvdoutor.com.br' 
   OR p.id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3')
  AND p.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'admin'
  );

-- 3. Criar funÃ§Ã£o is_manager para verificar permissÃµes de manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
$$;

-- 4. VerificaÃ§Ã£o final
SELECT 
    'CORREÃ‡ÃƒO APLICADA' as status,
    'UsuÃ¡rios admin agora podem acessar pÃ¡ginas de manager' as description;
