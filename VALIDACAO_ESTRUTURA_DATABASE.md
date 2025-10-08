# 🗂️ Validação da Estrutura do Banco de Dados

## 📋 Objetivo

Validar que a estrutura do banco de dados está correta para o processo de signup:
- Tabela `profiles` com colunas corretas
- Tabela `user_roles` com colunas corretas
- RLS habilitado em ambas as tabelas
- Trigger `handle_new_user` ativo

---

## 🚀 Como Executar a Validação

### Opção 1: Via Supabase SQL Editor

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá para **SQL Editor**
4. Clique em **New Query**
5. Cole o conteúdo do arquivo `scripts/validate_database_structure.sql`
6. Clique em **Run** (ou pressione `Ctrl+Enter`)

### Opção 2: Via CLI do Supabase

```bash
# No terminal, dentro do diretório do projeto
supabase db execute --file scripts/validate_database_structure.sql
```

---

## ✅ O Que Deve Ser Verificado

### 1. Estrutura da Tabela `profiles`

**Colunas obrigatórias:**
- ✅ `id` (uuid, primary key)
- ✅ `email` (text)
- ✅ `full_name` (text)
- ✅ `display_name` (text, nullable)
- ✅ `super_admin` (boolean, default false)
- ✅ `avatar_url` (text, nullable)
- ✅ `created_at` (timestamp)
- ✅ `updated_at` (timestamp)

**Exemplo de saída esperada:**
```
column_name      | data_type                   | is_nullable | column_default
-----------------+-----------------------------+-------------+----------------
id               | uuid                        | NO          | ...
email            | text                        | YES         | NULL
full_name        | text                        | YES         | NULL
display_name     | text                        | YES         | NULL
super_admin      | boolean                     | YES         | false
avatar_url       | text                        | YES         | NULL
created_at       | timestamp without time zone | YES         | now()
updated_at       | timestamp without time zone | YES         | now()
```

### 2. Estrutura da Tabela `user_roles`

**Colunas obrigatórias:**
- ✅ `id` (uuid, primary key)
- ✅ `user_id` (uuid, foreign key para auth.users)
- ✅ `role` (text ou enum)
- ✅ `created_at` (timestamp)

**Exemplo de saída esperada:**
```
column_name | data_type                   | is_nullable | column_default
------------+-----------------------------+-------------+----------------
id          | uuid                        | NO          | gen_random_uuid()
user_id     | uuid                        | NO          | NULL
role        | text                        | NO          | 'user'::text
created_at  | timestamp without time zone | YES         | now()
```

### 3. RLS (Row Level Security)

**Deve estar habilitado:**
```
schemaname | tablename  | rls_enabled
-----------+------------+-------------
public     | profiles   | true
public     | user_roles | true
```

❌ **Se RLS não estiver habilitado:**
```sql
-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
```

### 4. Políticas RLS

**Profiles - Políticas Esperadas:**
- `Users can view own profile` - SELECT
- `Users can update own profile` - UPDATE
- `Service role can do anything` - ALL

**User Roles - Políticas Esperadas:**
- `Users can view own roles` - SELECT
- `Service role can do anything` - ALL

### 5. Trigger `handle_new_user`

**Deve existir:**
```
trigger_name              | event_object_table | action_timing | event_manipulation
--------------------------+--------------------+---------------+--------------------
on_auth_user_created      | users              | AFTER         | INSERT
```

❌ **Se o trigger não existir:**
```sql
-- Criar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 6. Função `handle_new_user`

**Deve existir e retornar `trigger`:**
```
routine_name      | routine_type | return_type
------------------+--------------+-------------
handle_new_user   | FUNCTION     | trigger
```

---

## 🐛 Problemas Comuns e Soluções

### Problema 1: Coluna faltando na tabela `profiles`

**Sintoma:**
```
Coluna 'super_admin' não encontrada
```

**Solução:**
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS super_admin BOOLEAN DEFAULT false;
```

### Problema 2: Tabela `user_roles` não existe

**Solução:**
```sql
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_user_role UNIQUE(user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Criar políticas
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can do anything"
  ON public.user_roles FOR ALL
  USING (auth.role() = 'service_role');
```

### Problema 3: RLS não está habilitado

**Solução:**
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
```

### Problema 4: Trigger não está ativo

**Solução:**
```sql
-- Verificar se a função existe
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Se não existir, criar a função primeiro
-- (use o código da migration 20251006160000_apply_fix_user_signup.sql)

-- Criar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Problema 5: Erro de permissão ao executar script

**Sintoma:**
```
ERROR: permission denied for table profiles
```

**Solução:**
Execute o script como **service_role** ou no SQL Editor do Supabase Dashboard (que usa service_role por padrão).

---

## 📊 Checklist de Validação

Execute este checklist após rodar o script de validação:

### Estrutura das Tabelas
- [ ] Tabela `profiles` existe
- [ ] Tabela `profiles` tem coluna `id`
- [ ] Tabela `profiles` tem coluna `email`
- [ ] Tabela `profiles` tem coluna `full_name`
- [ ] Tabela `profiles` tem coluna `display_name`
- [ ] Tabela `profiles` tem coluna `super_admin`
- [ ] Tabela `user_roles` existe
- [ ] Tabela `user_roles` tem coluna `id`
- [ ] Tabela `user_roles` tem coluna `user_id`
- [ ] Tabela `user_roles` tem coluna `role`

### RLS (Row Level Security)
- [ ] RLS está habilitado em `profiles`
- [ ] RLS está habilitado em `user_roles`
- [ ] Políticas RLS existem em `profiles`
- [ ] Políticas RLS existem em `user_roles`

### Trigger e Função
- [ ] Função `handle_new_user` existe
- [ ] Função `handle_new_user` retorna tipo `trigger`
- [ ] Trigger `on_auth_user_created` existe
- [ ] Trigger está configurado para `AFTER INSERT` em `auth.users`

### Constraints
- [ ] `profiles.id` é PRIMARY KEY
- [ ] `profiles.id` é FOREIGN KEY para `auth.users(id)`
- [ ] `user_roles.id` é PRIMARY KEY
- [ ] `user_roles.user_id` é FOREIGN KEY para `auth.users(id)`
- [ ] Existe constraint UNIQUE em `user_roles(user_id, role)`

---

## 🎯 Resultado Esperado

Após executar o script de validação, você deve ver:

```
=== RESUMO FINAL ===
NOTICE: Total de profiles: X
NOTICE: Total de user_roles: Y
NOTICE: Triggers encontrados: 1
NOTICE: ✅ Trigger handle_new_user está ativo
NOTICE: ✅ Tabela profiles tem dados
NOTICE: ✅ Tabela user_roles tem dados
```

---

## 🚨 Ações Corretivas

Se algum item do checklist falhar:

1. **Verifique as migrações:**
   ```bash
   ls -la supabase/migrations/
   ```

2. **Execute as migrações pendentes:**
   ```bash
   supabase db push
   ```

3. **Se necessário, execute as migrações manualmente:**
   - `20251006150000_fix_user_roles_conflict.sql`
   - `20251006151000_final_fix_user_registration.sql`
   - `20251006152000_fix_handle_new_user_trigger.sql`
   - `20251006160000_apply_fix_user_signup.sql`

4. **Verifique os logs do Supabase:**
   ```bash
   supabase functions logs --tail
   ```

---

## 📚 Referências

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)

---

**Status:** ✅ Pronto para validação  
**Data:** 2025-10-08  
**Script:** `scripts/validate_database_structure.sql`

