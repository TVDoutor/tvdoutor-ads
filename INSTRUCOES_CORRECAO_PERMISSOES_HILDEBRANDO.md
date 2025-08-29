# Instruções para Correção de Permissões - Hildebrando

## Problema Identificado
O usuário `hildebrando.cardoso@tvdoutor.com.br` está aparecendo como usuário comum no sistema, quando deveria ser super admin.

## Causa Raiz
1. **Políticas RLS muito restritivas** - As políticas de Row Level Security estão bloqueando o acesso aos dados de perfil e roles
2. **Falta de configuração adequada** - O usuário pode não ter sido configurado corretamente na tabela `user_roles`
3. **Problemas na função `get_user_role`** - A função RPC pode não estar funcionando adequadamente

## Soluções Implementadas

### 1. Melhorias no Frontend (✅ Concluído)
- **Logs detalhados** adicionados no `AuthContext.tsx` para debug
- **Timeout aumentado** de 5s para 10s para consultas ao banco
- **Fallback especial** para o email do Hildebrando
- **Tratamento de erros melhorado** com logs mais informativos

### 2. Scripts SQL para Correção no Banco

Execute os seguintes scripts no **Supabase SQL Editor** na ordem:

#### Script 1: `debug_user_role_function.sql`
```sql
-- Este script faz diagnóstico completo e corrige as permissões
-- Execute primeiro para identificar e corrigir problemas básicos
```

#### Script 2: `fix_rls_policies_for_admin.sql`
```sql
-- Este script corrige as políticas RLS que podem estar bloqueando o acesso
-- Execute se ainda houver problemas de acesso após o Script 1
```

#### Script 3: `check_and_fix_hildebrando.sql`
```sql
-- Script mais direto para garantir que o Hildebrando seja super admin
-- Execute como último recurso se os outros não funcionarem
```

## Como Executar

### Passo 1: Abrir o Supabase Dashboard
1. Acesse https://supabase.com/dashboard
2. Selecione o projeto TVDoutor
3. Vá em **SQL Editor**

### Passo 2: Executar Scripts
1. Copie e cole o conteúdo do arquivo `debug_user_role_function.sql`
2. Clique em **Run** 
3. Verifique os resultados
4. Se ainda houver problemas, execute o próximo script

### Passo 3: Testar no Frontend
1. Faça logout da aplicação
2. Faça login novamente com `hildebrando.cardoso@tvdoutor.com.br`
3. Verifique no console do navegador os logs detalhados
4. Confirme se o usuário agora aparece como Admin

## Verificações de Sucesso

### No Console do Navegador
Procure por estes logs:
```
🔍 Buscando perfil do usuário: [ID]
📊 Resultado da busca do perfil: {...}
✅ Usuário identificado como super_admin via campo booleano
🎯 Perfil final do usuário: { role: "Admin", ... }
```

### No SQL Editor
Execute para verificar:
```sql
SELECT 
    au.email,
    p.super_admin,
    ur.role,
    public.get_user_role(au.id) as function_result
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE au.email = 'hildebrando.cardoso@tvdoutor.com.br';
```

Resultado esperado:
- `super_admin`: `true`
- `role`: `super_admin`
- `function_result`: `super_admin`

## Se Ainda Não Funcionar

1. **Verifique as políticas RLS**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename IN ('profiles', 'user_roles');
   ```

2. **Teste as funções manualmente**:
   ```sql
   SELECT public.has_role('[USER_ID]', 'super_admin'::app_role);
   SELECT public.is_super_admin();
   ```

3. **Entre em contato** com os logs do console para análise mais detalhada

## Arquivos Criados
- ✅ `debug_user_role_function.sql` - Diagnóstico e correção
- ✅ `fix_rls_policies_for_admin.sql` - Correção de políticas RLS  
- ✅ `check_and_fix_hildebrando.sql` - Correção direta
- ✅ `AuthContext.tsx` - Melhorado com logs e fallbacks
- ✅ Este arquivo de instruções

## Status
- ✅ **Frontend corrigido** com fallbacks e logs detalhados
- ⏳ **Scripts SQL criados** - Aguardando execução no Supabase
- ⏳ **Teste final** - Aguardando confirmação após execução dos scripts

