# Diagnóstico do Problema do Menu Lateral para Role 'Manager'

## Problema Identificado
O sistema deveria mostrar o menu lateral completo para usuários com role 'Manager', mas alguns itens não estão aparecendo.

## Análise Realizada

### ✅ Verificações Concluídas

1. **Enum app_role no banco de dados**: ✅ Contém 'manager'
   - Verificado em `src/integrations/supabase/types.ts` linha 7058
   - Enum: `"super_admin" | "admin" | "user" | "manager"`

2. **Configuração do menu no Sidebar**: ✅ Todos os itens estão configurados
   - Dashboard ✅ (sem restrição)
   - Inventário ✅ (sem restrição)
   - Propostas ✅ (sem restrição)
   - Mapa ✅ (sem restrição)
   - Campanhas ✅ (requer role 'manager')
   - Relatórios ✅ (requer role 'manager')
   - Pontos de Venda ✅ (requer role 'manager')
   - Projetos ✅ (requer role 'manager')
   - Configurações ✅ (sem restrição)

3. **Lógica de filtragem**: ✅ Está correta
   - Linha 170 do Sidebar.tsx: `.filter((item) => !item.requiredRole || hasRole(item.requiredRole))`

4. **Função hasRole**: ✅ Implementada corretamente
   - Manager tem acesso a manager, client e user
   - Admin tem acesso a admin, manager, client e user

### 🔍 Possíveis Causas do Problema

1. **Usuário não tem role 'manager' atribuída no banco**
   - Verificar na tabela `user_roles`
   - Verificar na tabela `profiles`

2. **Problema na consulta do perfil**
   - Timeout nas consultas
   - Erro na função `mapDatabaseRoleToUserRole`

3. **Cache de autenticação desatualizado**
   - Dados antigos no localStorage
   - Token expirado

## Soluções Implementadas

### 1. Logs de Debug Adicionados
- Adicionados logs no Sidebar para mostrar:
  - Dados do perfil atual
  - Status das funções hasRole
  - Itens filtrados do menu

### 2. Scripts de Diagnóstico Criados

#### `check_manager_role.sql`
Script SQL para verificar:
- Se o enum contém 'manager'
- Usuários com role 'manager'
- Inconsistências entre tabelas
- Contagem por role

#### `assign_manager_role.sql`
Script SQL para atribuir role 'manager' a um usuário específico

#### `test-roles-frontend.js`
Script JavaScript para testar o sistema de roles no frontend

## Próximos Passos para Resolução

### 1. Executar Diagnóstico no Banco
```sql
-- Execute o script check_manager_role.sql no Supabase SQL Editor
-- Verifique se o usuário tem role 'manager' atribuída
```

### 2. Verificar Logs no Console
1. Abra o DevTools (F12)
2. Vá para a aba Console
3. Recarregue a página
4. Procure pelos logs "Sidebar Debug" e "Menu Items Filtered"

### 3. Atribuir Role Manager (se necessário)
```sql
-- Execute o script assign_manager_role.sql
-- Substitua 'EMAIL_DO_USUARIO' pelo email correto
```

### 4. Limpar Cache (se necessário)
```javascript
// Execute no console do navegador
localStorage.clear();
sessionStorage.clear();
// Recarregue a página
```

## Estrutura do Sistema de Roles

```
super_admin → Acesso total
admin → Acesso administrativo + manager + client + user
manager → Pode criar/ler/editar + client + user
client → Acesso para visualizar propostas atribuídas
user → Acesso padrão
```

## Arquivos Modificados
- `src/components/Sidebar.tsx` - Adicionados logs de debug

## Arquivos Criados
- `check_manager_role.sql` - Script de diagnóstico
- `assign_manager_role.sql` - Script para atribuir role
- `test-roles-frontend.js` - Script de teste frontend

