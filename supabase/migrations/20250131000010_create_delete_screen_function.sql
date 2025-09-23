-- ===============================
-- CREATE DELETE SCREEN FUNCTION
-- Date: 2025-01-31
-- Criar função para deletar telas como admin
-- ===============================

BEGIN;

-- Deletar função existente e recriar
DROP FUNCTION IF EXISTS public.delete_screen_as_admin(bigint);

-- Criar função para deletar tela como admin
CREATE OR REPLACE FUNCTION public.delete_screen_as_admin(screen_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
BEGIN
    -- Verificar se o usuário é admin
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- Se não for admin, retornar erro
    IF user_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Apenas administradores podem deletar telas';
    END IF;
    
    -- Deletar a tela
    DELETE FROM public.screens
    WHERE id = screen_id;
    
    -- Retornar true se a operação foi bem-sucedida
    RETURN FOUND;
END;
$$;

-- Permitir execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.delete_screen_as_admin(bigint) TO authenticated;

COMMIT;
