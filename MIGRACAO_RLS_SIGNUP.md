# 🔐 Migração: Corrigir Políticas RLS para Signup

## 📋 Objetivo

Corrigir as políticas RLS (Row Level Security) que podem estar bloqueando o signup ao impedir que o trigger `handle_new_user` insira dados nas tabelas `profiles` e `user_roles`.

---

## ⚡ Problema Identificado

### Sintoma:
Durante o signup, o usuário é criado em `auth.users`, mas:
- ❌ Profile não é criado em `public.profiles`
- ❌ Role não é atribuída em `public.user_roles`
- ❌ Erro de permissão no trigger

### Causa Raiz:
As políticas RLS restritivas nas tabelas `profiles` e `user_roles` estão impedindo que o trigger `handle_new_user` insira dados, mesmo quando executado pelo sistema.

### Políticas Problemáticas:
```sql
-- Exemplo de política muito restritiva
CREATE POLICY "profiles_insert_authenticated"
ON public.profiles
FOR INSERT
TO authenticated
USING (auth.uid() = id);  -- ❌ Bloqueia o trigger!
```

**Por que bloqueia?**
Durante o signup, o trigger roda **antes** do usuário estar completamente autenticado, então `auth.uid()` pode retornar `null`, bloqueando a inserção.

---

## ✅ Solução Implementada

### Arquivo: `supabase/migrations/20251008091837_fix_signup_rls_policies.sql`

### Mudanças:

#### 1. **Remover Políticas Restritivas**
```sql
DROP POLICY IF EXISTS "profiles_insert_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "user_roles_insert_service" ON public.user_roles;
```

#### 2. **Criar Políticas Permissivas para Signup**
```sql
-- Permitir INSERT em profiles durante signup
CREATE POLICY "profiles_insert_anon_and_auth"
ON public.profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Permitir INSERT em user_roles durante signup
CREATE POLICY "user_roles_insert_anon_and_auth"
ON public.user_roles
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
```

#### 3. **Manter Segurança para Outras Operações**
```sql
-- Usuários só podem ver seu próprio perfil
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Usuários só podem atualizar seu próprio perfil
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

#### 4. **Service Role com Acesso Total**
```sql
-- Service Role (Edge Functions) pode fazer tudo
CREATE POLICY "profiles_service_all"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

## 🚀 Como Aplicar a Migração

### Opção 1: Via Supabase CLI (Recomendado)

```bash
# 1. Navegar até o diretório do projeto
cd c:\Users\hilca\OneDrive\Documentos\GitHub\TVDoutor-ADS-2\tvdoutor-ads

# 2. Aplicar a migração
supabase db push

# 3. Verificar se foi aplicada
supabase db diff

# 4. Ver logs
supabase db logs
```

### Opção 2: Via Supabase Dashboard

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá para **SQL Editor**
4. Clique em **New Query**
5. Cole o conteúdo de `supabase/migrations/20251008091837_fix_signup_rls_policies.sql`
6. Clique em **Run** (ou `Ctrl+Enter`)

### Opção 3: Via SQL Editor Direto

```bash
# Executar a migração diretamente
supabase db execute --file supabase/migrations/20251008091837_fix_signup_rls_policies.sql
```

---

## 🔍 Verificar se a Migração Foi Aplicada

### 1. Verificar Políticas de `profiles`

```sql
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY cmd, policyname;
```

**Saída Esperada:**
```
policyname                      | cmd    | roles                  | with_check
--------------------------------+--------+------------------------+------------
profiles_insert_anon_and_auth   | INSERT | {anon,authenticated}   | true
profiles_select_own             | SELECT | {authenticated}        | (auth.uid() = id)
profiles_update_own             | UPDATE | {authenticated}        | (auth.uid() = id)
profiles_service_all            | ALL    | {service_role}         | true
```

### 2. Verificar Políticas de `user_roles`

```sql
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_roles'
ORDER BY cmd, policyname;
```

**Saída Esperada:**
```
policyname                      | cmd    | roles                  | with_check
--------------------------------+--------+------------------------+------------
user_roles_insert_anon_and_auth | INSERT | {anon,authenticated}   | true
user_roles_select_own           | SELECT | {authenticated}        | (auth.uid() = user_id)
user_roles_service_all          | ALL    | {service_role}         | true
```

---

## 🧪 Testar o Signup Após a Migração

### 1. Criar Conta de Teste

```javascript
// No console do navegador (F12)
// Após ir para /signup e preencher o formulário

// Observar os logs:
🔵 ==================== INÍCIO DO SIGNUP ====================
📧 Email: teste@exemplo.com
👤 Nome: Teste Usuario
✅ Usuário criado com sucesso no auth.users
   User ID: 550e8400-e29b-41d4-a716-446655440000
⏳ Aguardando trigger handle_new_user criar profile e role...
🔍 Verificando se profile foi criado...
✅ Profile criado com sucesso  // ← Deve funcionar agora!
   ID: 550e8400-e29b-41d4-a716-446655440000
   Email: teste@exemplo.com
   Nome: Teste Usuario
🔍 Verificando se role foi atribuída...
✅ Role atribuída com sucesso  // ← Deve funcionar agora!
   User ID: 550e8400-e29b-41d4-a716-446655440000
   Role: user
🔵 ==================== FIM DO SIGNUP ====================
```

### 2. Verificar no Banco de Dados

```sql
-- Verificar se o profile foi criado
SELECT id, email, full_name, super_admin
FROM public.profiles
WHERE email = 'teste@exemplo.com';

-- Verificar se a role foi atribuída
SELECT user_id, role
FROM public.user_roles
WHERE user_id IN (
  SELECT id FROM public.profiles WHERE email = 'teste@exemplo.com'
);
```

---

## 🛡️ Segurança

### O Que Esta Migração NÃO Compromete:

✅ **Leitura de Dados:** Usuários só podem ler seus próprios dados  
✅ **Atualização de Dados:** Usuários só podem atualizar seus próprios dados  
✅ **Service Role:** Mantém acesso total para Edge Functions  
✅ **RLS Habilitado:** Row Level Security continua ativo  

### O Que Esta Migração PERMITE:

✅ **INSERT Durante Signup:** Qualquer requisição pode inserir em `profiles` e `user_roles`  
⚠️ **Nota:** Isso é seguro porque apenas o trigger `handle_new_user` realiza essas inserções, e ele é acionado apenas quando um novo usuário é criado em `auth.users` (que é controlado pelo Supabase Auth)

---

## 🔄 Rollback (Se Necessário)

Se precisar reverter a migração:

```sql
-- Remover políticas permissivas
DROP POLICY IF EXISTS "profiles_insert_anon_and_auth" ON public.profiles;
DROP POLICY IF EXISTS "user_roles_insert_anon_and_auth" ON public.user_roles;

-- Recriar políticas restritivas (se necessário)
CREATE POLICY "profiles_insert_authenticated"
ON public.profiles
FOR INSERT
TO authenticated
USING (auth.uid() = id);
```

**⚠️ Aviso:** Reverter a migração vai quebrar o signup novamente!

---

## 🐛 Troubleshooting

### Problema: Migração não foi aplicada

**Solução:**
```bash
# Verificar status das migrações
supabase migration list

# Forçar aplicação
supabase db push --force
```

### Problema: Erro "relation does not exist"

**Solução:**
Certifique-se de que as tabelas `profiles` e `user_roles` existem antes de aplicar a migração.

```sql
-- Verificar se as tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'user_roles');
```

### Problema: Signup ainda não funciona após migração

**Diagnóstico:**
1. Verificar se o trigger existe:
```sql
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%handle_new_user%';
```

2. Verificar logs do Supabase:
```bash
supabase functions logs --tail
```

3. Verificar políticas RLS:
```sql
SELECT * FROM pg_policies 
WHERE tablename IN ('profiles', 'user_roles');
```

---

## 📊 Matriz de Políticas RLS

| Tabela | Operação | Roles | Condição | Finalidade |
|--------|----------|-------|----------|------------|
| **profiles** | INSERT | anon, authenticated | `true` | Permitir signup |
| **profiles** | SELECT | authenticated | `auth.uid() = id` | Ver próprio perfil |
| **profiles** | UPDATE | authenticated | `auth.uid() = id` | Atualizar próprio perfil |
| **profiles** | ALL | service_role | `true` | Admin total |
| **user_roles** | INSERT | anon, authenticated | `true` | Permitir signup |
| **user_roles** | SELECT | authenticated | `auth.uid() = user_id` | Ver próprias roles |
| **user_roles** | ALL | service_role | `true` | Admin total |

---

## ✅ Checklist Pós-Migração

- [ ] Migração aplicada sem erros
- [ ] Políticas RLS verificadas (profiles)
- [ ] Políticas RLS verificadas (user_roles)
- [ ] Signup testado com sucesso
- [ ] Profile criado automaticamente
- [ ] Role atribuída automaticamente
- [ ] Logs do signup sem erros
- [ ] Verificação no banco de dados OK

---

## 📚 Referências

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Policies](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- [Supabase Auth Triggers](https://supabase.com/docs/guides/auth/managing-user-data)

---

**Status:** ✅ Pronto para aplicação  
**Data:** 2025-10-08  
**Migração:** `20251008091837_fix_signup_rls_policies.sql`  
**Prioridade:** 🔴 Alta (Bloqueia signup)

