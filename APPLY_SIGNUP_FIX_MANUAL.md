# Guia: Aplicar Correção de Signup Manualmente

## 🎯 Objetivo
Corrigir as políticas RLS que estavam impedindo o signup de funcionar corretamente.

## 📋 Passos para Aplicar a Correção

### Passo 1: Acessar o SQL Editor do Supabase

1. Acesse o Dashboard do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto: `tvdoutor-ads`
3. Vá para **SQL Editor** no menu lateral
4. Clique em **New Query**

### Passo 2: Executar o SQL de Correção

Cole e execute o seguinte SQL:

```sql
-- ============================================
-- FIX SIGNUP: Permitir anon inserir em profiles e user_roles
-- ============================================
-- Data: 2025-10-08
-- Descrição: Corrige políticas RLS para permitir que triggers executem
--            inserções durante o signup quando o usuário ainda é anon

-- 1. Remover políticas restritivas em profiles
DROP POLICY IF EXISTS "profiles_insert_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_trigger" ON public.profiles;

-- 2. Criar política permissiva para anon + authenticated
CREATE POLICY "profiles_insert_anon_and_auth"
ON public.profiles
FOR INSERT
TO anon, authenticated  -- ✅ Permite anon E authenticated
WITH CHECK (true);

-- 3. Remover políticas restritivas em user_roles
DROP POLICY IF EXISTS "user_roles_insert_service" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_trigger" ON public.user_roles;

-- 4. Criar política permissiva para anon + authenticated
CREATE POLICY "user_roles_insert_anon_and_auth"
ON public.user_roles
FOR INSERT
TO anon, authenticated  -- ✅ Permite anon E authenticated
WITH CHECK (true);

-- 5. Comentários explicativos
COMMENT ON POLICY "profiles_insert_anon_and_auth" ON public.profiles IS 
  'Permite inserções por anon (durante signup via trigger) e authenticated';

COMMENT ON POLICY "user_roles_insert_anon_and_auth" ON public.user_roles IS 
  'Permite inserções por anon (durante signup via trigger) e authenticated';

-- 6. Verificação
SELECT 'Migração aplicada com sucesso!' AS status;
```

### Passo 3: Verificar se a Migração foi Aplicada

Execute a seguinte query para verificar as políticas:

```sql
-- Verificar políticas em profiles
SELECT schemaname, tablename, policyname, roles
FROM pg_policies
WHERE tablename = 'profiles' AND policyname LIKE '%insert%';

-- Verificar políticas em user_roles
SELECT schemaname, tablename, policyname, roles
FROM pg_policies
WHERE tablename = 'user_roles' AND policyname LIKE '%insert%';
```

**Resultado esperado:**
- `profiles_insert_anon_and_auth` com roles `{anon,authenticated}`
- `user_roles_insert_anon_and_auth` com roles `{anon,authenticated}`

### Passo 4: Testar o Signup

1. Abra a aplicação em modo incógnito/privado
2. Acesse a página de cadastro
3. Preencha os dados:
   - Email: `teste123@example.com`
   - Senha: `Teste@123456`
   - Nome: `Usuário Teste`
4. Clique em "Criar conta"
5. Observe o console do navegador (F12) para ver os logs

**Logs esperados no console:**
```
🔵 ==================== INÍCIO DO SIGNUP ====================
📧 Email: teste123@example.com
👤 Nome: Usuário Teste
🔧 Chamando supabase.auth.signUp...
✅ Usuário criado com sucesso no auth.users
   User ID: xxx-xxx-xxx
   Email: teste123@example.com
⏳ Aguardando trigger handle_new_user criar profile e role...
🔍 Verificando se profile foi criado...
✅ Profile criado com sucesso
   ID: xxx-xxx-xxx
   Email: teste123@example.com
   Nome: Usuário Teste
🔍 Verificando se role foi atribuída...
✅ Role atribuída com sucesso
   User ID: xxx-xxx-xxx
   Role: user
🔵 ==================== FIM DO SIGNUP ====================
```

### Passo 5: Verificar no Supabase Dashboard

1. Acesse **Authentication > Users**
   - Deve aparecer o novo usuário com status "Waiting for verification"

2. Acesse **Table Editor > profiles**
   - Execute: `SELECT * FROM profiles WHERE email = 'teste123@example.com';`
   - Deve retornar o profile criado

3. Acesse **Table Editor > user_roles**
   - Execute: `SELECT * FROM user_roles WHERE user_id = '<user_id_do_passo_anterior>';`
   - Deve retornar role='user'

## ✅ Confirmação de Sucesso

Se todos os passos acima funcionarem, a correção foi aplicada com sucesso! 🎉

## 🔍 Troubleshooting

### Problema: Erro "new row violates row-level security policy"

**Solução:** 
- Verifique se as políticas foram criadas corretamente
- Execute o Passo 3 (Verificação) para conferir

### Problema: Profile não é criado

**Solução:**
- Verifique se o trigger `handle_new_user` existe:
  ```sql
  SELECT * FROM information_schema.triggers 
  WHERE trigger_name = 'on_auth_user_created';
  ```

### Problema: Role não é atribuída

**Solução:**
- Verifique se a função `handle_new_user` está funcionando:
  ```sql
  SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
  ```

## 📞 Suporte

Se os problemas persistirem, verifique:
1. Logs da Edge Function `process-pending-emails` no Dashboard > Edge Functions > Logs
2. Logs do Supabase em **Logs > Postgres Logs**
3. Console do navegador para erros JavaScript

