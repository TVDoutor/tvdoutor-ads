# Solução para Roles Duplicadas

## Problema Identificado
O sistema está criando roles duplicadas na tabela `user_roles`, onde usuários têm tanto a role 'user' quanto 'manager', causando inconsistências no sistema de permissões.

## Soluções Implementadas

### 1. Scripts SQL para Correção

#### `fix_duplicate_roles_safe.sql` (Recomendado)
- **Script seguro** com seções separadas para diagnóstico, simulação e correção
- Permite revisar mudanças antes de aplicá-las
- Inclui backup automático e opções de rollback

#### `fix_user_manager_duplicates.sql` (Específico)
- **Script específico** para usuários com roles 'user' e 'manager'
- Foca apenas no problema identificado nas imagens
- Mantém apenas a role 'manager' (mais alta na hierarquia)

#### `fix_duplicate_roles.sql` (Completo)
- **Script completo** que corrige todas as duplicatas
- Usa hierarquia completa: super_admin > admin > manager > client > user
- Mais abrangente mas requer mais cuidado

### 2. Melhorias no Frontend

#### AuthContext Atualizado
- **Busca todas as roles** do usuário em vez de apenas uma
- **Seleciona automaticamente a role mais alta** na hierarquia
- **Logs detalhados** para debug das roles encontradas

```typescript
// Hierarquia implementada:
const hierarchy = { 
  super_admin: 5, 
  admin: 4, 
  manager: 3, 
  client: 2, 
  user: 1 
};
```

### 3. Logs de Debug Adicionados

#### Sidebar com Debug
- Mostra dados do perfil atual
- Exibe status das funções hasRole
- Lista itens filtrados do menu

## Instruções de Uso

### Passo 1: Diagnóstico
Execute a **Seção 1** do `fix_duplicate_roles_safe.sql`:
```sql
-- Verificar usuários com múltiplas roles
-- Verificar inconsistências entre tabelas
```

### Passo 2: Simulação
Execute a **Seção 2** do `fix_duplicate_roles_safe.sql`:
```sql
-- Ver qual seria a role correta para cada usuário
```

### Passo 3: Backup
Execute a **Seção 3** do `fix_duplicate_roles_safe.sql`:
```sql
-- Criar backup das tabelas antes de fazer mudanças
```

### Passo 4: Correção
Execute a **Seção 4** do `fix_duplicate_roles_safe.sql`:
```sql
-- Aplicar as correções (apenas se satisfeito com a simulação)
```

### Passo 5: Verificação
Execute a **Seção 5** do `fix_duplicate_roles_safe.sql`:
```sql
-- Verificar se a correção foi bem-sucedida
```

## Hierarquia de Roles

```
super_admin (5) - Acesso total ao sistema
admin (4)       - Acesso administrativo + manager + client + user
manager (3)     - Pode criar/ler/editar + client + user
client (2)      - Acesso para visualizar propostas atribuídas
user (1)        - Acesso padrão
```

## Benefícios da Solução

1. **Elimina duplicatas** na tabela user_roles
2. **Mantém consistência** entre user_roles e profiles
3. **Preserva a role mais alta** para cada usuário
4. **Melhora performance** das consultas de permissão
5. **Facilita manutenção** futura do sistema de roles

## Arquivos Modificados
- `src/contexts/AuthContext.tsx` - Melhorada lógica de seleção de roles
- `src/components/Sidebar.tsx` - Adicionados logs de debug

## Arquivos Criados
- `fix_duplicate_roles_safe.sql` - Script seguro de correção
- `fix_user_manager_duplicates.sql` - Script específico
- `fix_duplicate_roles.sql` - Script completo
