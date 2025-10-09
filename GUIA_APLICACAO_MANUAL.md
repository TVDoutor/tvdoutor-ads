# Guia de Aplicação Manual da Atualização das Roles

## Situação
O Supabase CLI não está instalado no sistema, então você precisa aplicar as alterações manualmente.

## Passos para Aplicar as Alterações

### 1. Aplicar Migração no Banco de Dados

#### Opção A: Via Supabase Dashboard
1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para o seu projeto
3. Clique em "SQL Editor" no menu lateral
4. Copie e cole o conteúdo do arquivo `scripts/apply-migration-manual.sql`
5. Execute o script

#### Opção B: Via psql (se disponível)
```bash
psql -h [seu-host] -U postgres -d postgres -f scripts/apply-migration-manual.sql
```

### 2. Verificar se a Migração Foi Aplicada

Execute esta query no SQL Editor do Supabase:

```sql
-- Verificar valores do enum
SELECT 
    'Current app_role enum values:' as info,
    unnest(enum_range(NULL::app_role)) as current_values;
```

**Resultado esperado:**
```
super_admin
admin
manager
user
```

### 3. Testar as Novas Funções

Execute esta query para testar:

```sql
-- Testar as novas funções
SELECT 
    'Testing new functions:' as info,
    is_manager() as can_manage,
    can_delete_other_users() as can_delete,
    can_edit_other_users() as can_edit;
```

### 4. Verificar Interface Frontend

1. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Acesse a página de usuários
3. Verifique se:
   - A opção "Manager" aparece nos selects de role
   - As estatísticas incluem managers
   - Os filtros funcionam corretamente

### 5. Testar Permissões

#### Teste 1: Criar Usuário Manager
1. Crie um novo usuário com role "Manager"
2. Verifique se aparece nas estatísticas

#### Teste 2: Testar Permissões de Manager
1. Faça login como um usuário Manager
2. Tente editar dados de outro usuário (deve falhar)
3. Tente excluir outro usuário (deve falhar)
4. Edite seus próprios dados (deve funcionar)

#### Teste 3: Testar Permissões de Admin
1. Faça login como Admin
2. Edite dados de outros usuários (deve funcionar)
3. Exclua outros usuários (deve funcionar)

## Arquivos Modificados

### Frontend (já aplicados)
- ✅ `src/integrations/supabase/types.ts`
- ✅ `src/contexts/AuthContext.tsx`
- ✅ `src/pages/Users.tsx`

### Banco de Dados (aplicar manualmente)
- ⏳ `scripts/apply-migration-manual.sql`

## Rollback (se necessário)

Se algo der errado, execute este script no Supabase Dashboard:

```sql
-- ROLLBACK: Remover role 'manager' do sistema

-- 1. Atualizar usuários com role 'manager' para 'user'
UPDATE public.user_roles 
SET role = 'user' 
WHERE role = 'manager';

UPDATE public.profiles 
SET role = 'user' 
WHERE role = 'manager';

-- 2. Criar novo enum sem 'manager'
CREATE TYPE public.app_role_old AS ENUM ('super_admin', 'admin', 'user');

-- 3. Atualizar tabela user_roles
ALTER TABLE public.user_roles 
ALTER COLUMN role TYPE public.app_role_old 
USING role::text::public.app_role_old;

-- 4. Remover enum antigo
DROP TYPE public.app_role;

-- 5. Renomear novo enum
ALTER TYPE public.app_role_old RENAME TO app_role;

-- 6. Restaurar função is_admin original
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
$$;

-- 7. Remover funções adicionadas
DROP FUNCTION IF EXISTS public.is_manager();
DROP FUNCTION IF EXISTS public.can_delete_other_users();
DROP FUNCTION IF EXISTS public.can_edit_other_users();
```

## Status da Implementação

- ✅ **Frontend**: Atualizado com sucesso
- ⏳ **Banco de Dados**: Aguardando aplicação manual
- ✅ **Scripts**: Criados e prontos para uso
- ✅ **Documentação**: Completa

## Próximos Passos

1. Aplicar a migração no banco de dados
2. Testar a interface
3. Verificar permissões
4. Confirmar que tudo está funcionando

## Suporte

Se encontrar problemas:
1. Verifique os logs do Supabase
2. Consulte o console do navegador
3. Use o script de rollback se necessário
4. Consulte os arquivos de backup criados
