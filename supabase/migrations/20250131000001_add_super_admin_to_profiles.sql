-- Adicionar coluna super_admin à tabela profiles
-- Esta migração resolve o problema da função is_super_admin() que depende desta coluna

-- Adicionar coluna super_admin à tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS super_admin BOOLEAN DEFAULT false;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_super_admin ON public.profiles(super_admin) WHERE super_admin = true;

-- Comentário para documentação
COMMENT ON COLUMN public.profiles.super_admin IS 'Indica se o usuário tem privilégios de super administrador';