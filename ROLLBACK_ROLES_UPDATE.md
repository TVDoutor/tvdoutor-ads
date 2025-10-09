# ROLLBACK - Atualização das Roles

## Situação
Se algo der errado após aplicar a atualização das roles, use este guia para fazer rollback.

## Arquivos de Backup Criados
- `BACKUP_ROLES_BEFORE_UPDATE.sql` - Backup completo do estado anterior
- `supabase/migrations/` - Migrações anteriores preservadas

## Passos para Rollback

### 1. Reverter o Enum app_role
```sql
-- ATENÇÃO: PostgreSQL não permite remover valores de enum diretamente
-- Será necessário recriar o enum sem 'manager'

-- 1. Criar novo enum sem manager
CREATE TYPE public.app_role_new AS ENUM ('super_admin', 'admin', 'user');

-- 2. Atualizar tabelas que usam o enum
ALTER TABLE public.user_roles 
ALTER COLUMN role TYPE public.app_role_new 
USING role::text::public.app_role_new;

-- 3. Remover enum antigo
DROP TYPE public.app_role;

-- 4. Renomear novo enum
ALTER TYPE public.app_role_new RENAME TO app_role;
```

### 2. Reverter Funções
```sql
-- Restaurar função is_admin original
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
$$;

-- Remover funções adicionadas
DROP FUNCTION IF EXISTS public.is_manager();
DROP FUNCTION IF EXISTS public.can_delete_other_users();
DROP FUNCTION IF EXISTS public.can_edit_other_users();
```

### 3. Reverter Código Frontend
```bash
# Reverter arquivos modificados
git checkout HEAD~1 -- src/integrations/supabase/types.ts
git checkout HEAD~1 -- src/contexts/AuthContext.tsx
git checkout HEAD~1 -- src/pages/Users.tsx
```

### 4. Script de Rollback Automático
```powershell
# Execute este script para rollback automático
.\scripts\rollback-roles-update.ps1
```

## Verificação Pós-Rollback
1. Verificar se o enum app_role não contém 'manager'
2. Verificar se as funções antigas estão funcionando
3. Testar interface de usuários
4. Verificar se não há erros no console

## Contato
Se precisar de ajuda com o rollback, consulte:
- Logs do Supabase
- Console do navegador
- Arquivos de backup criados

## Notas Importantes
- O rollback pode causar perda de dados se usuários com role 'manager' existirem
- Sempre faça backup antes de aplicar rollback
- Teste em ambiente de desenvolvimento primeiro
