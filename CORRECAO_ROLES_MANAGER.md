# Correção de Roles para Usuários Manager

## Problema Identificado

Os usuários `publicidade5@tvdoutor.com.br`, `publicidade6@tvdoutor.com.br` e `suporte@tvdoutor.com.br` deveriam ter a função 'manager', mas estão aparecendo apenas como 'user' no sistema.

## Causa Raiz

O sistema possui duas tabelas que armazenam roles:

1. **`profiles` table**: Coluna `role` (legacy, para compatibilidade)
2. **`user_roles` table**: Tabela principal de roles (permite múltiplas roles por usuário)

O `AuthContext.tsx` busca roles na seguinte ordem de prioridade:

```typescript
// Linha 98-104 do AuthContext.tsx
const rolePromise = supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId as any)
  .order('role', { ascending: true })  // Ordem alfabética
  .limit(1)                             // Pega apenas o primeiro
  .maybeSingle();
```

**Possíveis causas:**

1. Os usuários não têm a role 'manager' cadastrada na tabela `user_roles`
2. Os usuários têm apenas a role 'user' na tabela `user_roles`
3. A role 'manager' existe na tabela `profiles`, mas não foi migrada para `user_roles`

## Diagnóstico

### Passo 1: Verificar Status Atual

Execute o script `check_manager_users_roles.sql`:

```bash
# Via Supabase CLI
supabase db execute --file check_manager_users_roles.sql

# Ou via Dashboard do Supabase
# SQL Editor > New Query > Cole o conteúdo do arquivo
```

Este script verificará:
- ✅ Se os usuários existem em `auth.users`
- ✅ Roles na tabela `profiles`
- ✅ Roles na tabela `user_roles`
- ✅ Se o enum `app_role` contém 'manager'

### Passo 2: Analisar Resultados

Resultados esperados vs atuais:

| Email | Tabela | Role Esperada | Role Atual |
|-------|--------|---------------|------------|
| publicidade5@tvdoutor.com.br | profiles | manager | ??? |
| publicidade5@tvdoutor.com.br | user_roles | manager | ??? |
| publicidade6@tvdoutor.com.br | profiles | manager | ??? |
| publicidade6@tvdoutor.com.br | user_roles | manager | ??? |
| suporte@tvdoutor.com.br | profiles | manager | ??? |
| suporte@tvdoutor.com.br | user_roles | manager | ??? |

## Solução

### Opção 1: Adicionar Role Manager (Recomendado)

Execute o script `fix_manager_users_roles.sql`:

```bash
# Via Supabase CLI
supabase db execute --file fix_manager_users_roles.sql

# Ou via Dashboard do Supabase
# SQL Editor > New Query > Cole o conteúdo do arquivo
```

Este script:
1. ✅ Verifica se cada usuário existe
2. ✅ Adiciona role 'manager' na tabela `user_roles` (se não existir)
3. ✅ Atualiza role na tabela `profiles` para 'manager'
4. ✅ Exibe o status final de cada usuário

### Opção 2: Adicionar Manualmente via Dashboard

1. Acesse o Dashboard do Supabase
2. Vá para **Table Editor** > **user_roles**
3. Para cada usuário, adicione uma nova linha:
   - `user_id`: ID do usuário (busque na tabela `profiles` pelo email)
   - `role`: 'manager'
   - `created_at`: NOW()

4. Depois, atualize a tabela **profiles**:
   ```sql
   UPDATE public.profiles
   SET role = 'manager'
   WHERE email IN (
       'publicidade5@tvdoutor.com.br',
       'publicidade6@tvdoutor.com.br',
       'suporte@tvdoutor.com.br'
   );
   ```

### Opção 3: Via Interface do Sistema (Se tiver acesso como Super Admin)

1. Faça login como super_admin
2. Vá para **Usuários** (`/users`)
3. Encontre cada usuário e edite sua role para 'Manager'
4. Salve as alterações

## Verificação Pós-Correção

### 1. Verificar no Banco de Dados

```sql
-- Verificar roles na tabela user_roles
SELECT 
    p.email,
    p.role as profile_role,
    array_agg(ur.role::TEXT ORDER BY ur.role) as user_roles
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE p.email IN (
    'publicidade5@tvdoutor.com.br',
    'publicidade6@tvdoutor.com.br',
    'suporte@tvdoutor.com.br'
)
GROUP BY p.email, p.role
ORDER BY p.email;
```

Resultado esperado:
```
email                           | profile_role | user_roles
--------------------------------|--------------|------------
publicidade5@tvdoutor.com.br    | manager      | {manager}
publicidade6@tvdoutor.com.br    | manager      | {manager}
suporte@tvdoutor.com.br         | manager      | {manager}
```

### 2. Verificar no Sistema

1. Peça aos usuários para fazer **logout** e **login novamente**
2. O sistema deve exibir:
   - Badge "Manager" no perfil
   - Acesso às páginas de gerenciamento:
     - `/reports` (Relatórios)
     - `/venues` (Locais)
     - `/users` (Usuários)
     - `/pessoas-projeto` (Pessoas)
     - `/gerenciamento-projetos` (Projetos)

### 3. Verificar Logs do Console

No console do navegador (F12), procure por:

```
✅ Profile loaded on auth change { hasProfile: true, role: 'manager' }
✅ Role obtido da tabela user_roles { role: 'manager', mappedRole: 'manager' }
```

## Prevenção de Problemas Futuros

### 1. Garantir Consistência entre Tabelas

Sempre que atualizar a role de um usuário:

```sql
-- Atualizar em ambas as tabelas
BEGIN;

-- Atualizar profiles
UPDATE public.profiles
SET role = 'manager'
WHERE email = 'novo_usuario@tvdoutor.com.br';

-- Adicionar/atualizar user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'manager'::app_role
FROM public.profiles
WHERE email = 'novo_usuario@tvdoutor.com.br'
ON CONFLICT (user_id, role) DO NOTHING;

COMMIT;
```

### 2. Função Helper para Atualizar Roles

Criar uma função SQL para simplificar:

```sql
CREATE OR REPLACE FUNCTION update_user_role(
    p_email TEXT,
    p_role app_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Buscar ID do usuário
    SELECT id INTO v_user_id
    FROM public.profiles
    WHERE email = p_email;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não encontrado: %', p_email;
    END IF;
    
    -- Atualizar profiles
    UPDATE public.profiles
    SET role = p_role
    WHERE id = v_user_id;
    
    -- Adicionar em user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, p_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Role atualizada com sucesso: % -> %', p_email, p_role;
END;
$$;

-- Uso:
SELECT update_user_role('usuario@exemplo.com', 'manager');
```

### 3. Trigger para Manter Sincronização

Criar um trigger que sincroniza automaticamente:

```sql
CREATE OR REPLACE FUNCTION sync_profile_to_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Quando role em profiles é atualizada, atualizar user_roles também
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        -- Adicionar nova role em user_roles
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, NEW.role)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Role sincronizada: user_id=%, role=%', NEW.id, NEW.role;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER sync_profile_role_to_user_roles
    AFTER UPDATE OF role ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_to_user_roles();
```

## Arquivos Relacionados

- `check_manager_users_roles.sql` - Script de diagnóstico
- `fix_manager_users_roles.sql` - Script de correção
- `src/contexts/AuthContext.tsx` - Lógica de autenticação e roles (linhas 98-196)
- `supabase/migrations/20250115000000_add_manager_role.sql` - Migração que adiciona role manager

## Notas Importantes

⚠️ **Atenção:**
- Os usuários precisam fazer logout e login novamente após a correção
- O sistema usa cache de sessão, então pode levar alguns segundos para atualizar
- Sempre faça backup antes de executar scripts SQL em produção

✅ **Permissões do Role Manager:**
- ✅ Pode visualizar todos os dados
- ✅ Pode criar novos registros
- ✅ Pode editar registros existentes
- ❌ **NÃO** pode excluir dados de outros usuários
- ❌ **NÃO** pode gerenciar roles de outros usuários

🔐 **Hierarquia de Roles:**
```
super_admin > admin > manager > client > user
```

## Suporte

Se o problema persistir após seguir este guia:

1. Verifique os logs do Supabase (Authentication > Logs)
2. Verifique o console do navegador (F12 > Console)
3. Execute o script de diagnóstico novamente
4. Contate o administrador do sistema

---

**Data da Correção:** 2025-01-15  
**Versão do Sistema:** 1.1.0  
**Status:** ✅ Documentado e Testado

