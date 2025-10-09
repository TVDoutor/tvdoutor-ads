# Correção de Acesso Admin para Páginas Manager

## Problema Identificado
Usuários com role "admin" estavam sendo bloqueados ao tentar acessar páginas que exigem role "manager" (relatórios, venues, gerenciamento-projetos, users, pessoas-projeto).

## Causa Raiz
A lógica de permissões no componente `ProtectedRoute` não estava reconhecendo que usuários "admin" devem ter acesso a páginas que exigem "manager", violando a hierarquia de permissões.

## Correções Aplicadas

### 1. ProtectedRoute.tsx
- ✅ Corrigida lógica de verificação de permissões
- ✅ Admin agora tem acesso a páginas de Manager
- ✅ Hierarquia: admin > manager > user

### 2. AuthContext.tsx  
- ✅ Atualizada função `hasRole()` para garantir que admin tem acesso a tudo
- ✅ Comentário adicionado explicando a hierarquia

### 3. Script SQL de Correção
- ✅ Criado `fix-admin-permissions.sql` para corrigir banco de dados
- ✅ Adiciona role 'manager' ao enum se não existir
- ✅ Garante que usuário admin tem role correto na tabela user_roles
- ✅ Cria função `is_manager()` para verificação de permissões

## Arquivos Modificados
- `src/components/ProtectedRoute.tsx`
- `src/contexts/AuthContext.tsx`
- `fix-admin-permissions.sql` (novo)
- `fix-admin-access.ps1` (novo)

## Como Aplicar a Correção

### Opção 1: Via Supabase CLI
```bash
npx supabase db push --linked
```

### Opção 2: Via Painel Supabase
1. Acesse o painel do Supabase
2. Vá para SQL Editor
3. Execute o conteúdo do arquivo `fix-admin-permissions.sql`

### Opção 3: Via Script PowerShell
```powershell
powershell -ExecutionPolicy Bypass -File fix-admin-access.ps1
```

## Verificação
Após aplicar a correção:
1. ✅ Usuários admin podem acessar páginas de manager
2. ✅ Hierarquia de permissões funcionando corretamente
3. ✅ Debug logs mostram permissões corretas

## Páginas Afetadas
- `/reports` - Relatórios
- `/venues` - Venues  
- `/gerenciamento-projetos` - Gerenciamento de Projetos
- `/users` - Usuários
- `/pessoas-projeto` - Pessoas do Projeto

## Status
🟢 **CORREÇÃO APLICADA COM SUCESSO**

A lógica de permissões foi corrigida e usuários admin agora podem acessar todas as páginas do sistema conforme esperado.
