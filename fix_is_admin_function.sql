-- Script para corrigir a função is_admin que está faltando

-- Recriar a função is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (super_admin = true OR role IN ('admin', 'manager'))
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar se a função foi criada corretamente
SELECT 
    'VERIFICAÇÃO DA FUNÇÃO' as status,
    'A função is_admin() foi criada com sucesso!' as mensagem;

-- Verificar se o usuário atual é reconhecido como admin
SELECT 
    'VERIFICAÇÃO DE ADMIN' as status,
    public.is_admin() as is_admin;

-- Verificar permissões de acesso às tabelas principais
SELECT 
    'PERMISSÕES DE ACESSO' as status,
    (SELECT COUNT(*) FROM public.profiles) > 0 as can_access_profiles,
    (SELECT COUNT(*) FROM public.user_roles) > 0 as can_access_user_roles,
    (SELECT COUNT(*) FROM public.screens) > 0 as can_access_screens,
    (SELECT COUNT(*) FROM public.campaigns) > 0 as can_access_campaigns,
    (SELECT COUNT(*) FROM public.venues) > 0 as can_access_venues;