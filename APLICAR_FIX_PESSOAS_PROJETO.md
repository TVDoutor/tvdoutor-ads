# 🚨 CORREÇÃO URGENTE: Erro ao Criar Pessoa do Projeto

## 📋 **Problema Identificado**

```
❌ Erro: code "42501" - new row violates row-level security policy for table 'pessoas_projeto'
```

**Causa**: A política RLS `FOR ALL` está muito restritiva e bloqueia até mesmo administradores de criar registros.

---

## 🔧 **Solução**

### **Passo 1: Acessar o Supabase SQL Editor**

1. Acesse: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
2. Ou navegue: `Project` → `SQL Editor` → `New Query`

---

### **Passo 2: Executar o Script de Correção**

**Copie e cole o conteúdo do arquivo `FIX_PESSOAS_PROJETO_RLS.sql` no editor SQL:**

```sql
-- =====================================================================
-- CORREÇÃO URGENTE: FIX RLS PARA PESSOAS_PROJETO
-- =====================================================================
-- (Copiar todo o conteúdo do arquivo FIX_PESSOAS_PROJETO_RLS.sql)
```

---

### **Passo 3: Executar**

1. Clique em **"Run"** ou pressione `Ctrl+Enter`
2. Aguarde a mensagem: `✅ Políticas RLS corrigidas para pessoas_projeto!`

---

## ✅ **O que foi corrigido**

### **Antes (Problema)**:
```sql
CREATE POLICY "Apenas administradores podem gerenciar pessoas do projeto."
  ON public.pessoas_projeto FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
```
- ❌ `FOR ALL` muito restritivo
- ❌ `is_admin()` pode falhar em alguns contextos
- ❌ Bloqueia inserções mesmo para admins

### **Depois (Solução)**:
```sql
-- Políticas separadas por operação

✅ INSERT: "Admins podem criar pessoas do projeto"
✅ UPDATE: "Admins podem atualizar pessoas do projeto"  
✅ DELETE: "Admins podem deletar pessoas do projeto"
```

- ✅ Políticas específicas por operação
- ✅ Verificação direta na tabela `profiles`
- ✅ Suporta tanto `admin` quanto `super_admin`

---

## 🧪 **Testar a Correção**

1. **Recarregue a página** no navegador (Ctrl+F5)
2. Tente **criar uma nova pessoa**:
   - Nome: `Mary Lu`
   - Email: `marylu@testes.com.br`
   - Agência: `Local`
3. Clique em **"Criar"**
4. Deve funcionar sem erros! ✅

---

## 📊 **Verificação de Políticas**

Execute no SQL Editor para ver todas as políticas:

```sql
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'pessoas_projeto'
ORDER BY policyname;
```

**Resultado esperado**:
```
✅ Admins podem criar pessoas do projeto (INSERT)
✅ Admins podem atualizar pessoas do projeto (UPDATE)
✅ Admins podem deletar pessoas do projeto (DELETE)
✅ Pessoas do projeto são visíveis para usuários autenticados (SELECT)
```

---

## 🔐 **Segurança Mantida**

- ✅ Apenas admins podem criar/editar/deletar
- ✅ Usuários autenticados podem ver a lista (para seletores)
- ✅ RLS continua habilitado
- ✅ Validação por role na tabela `profiles`

---

## 🚀 **Próximos Passos**

Após aplicar a correção:

1. ✅ Testar criação de pessoa
2. ✅ Testar edição de pessoa
3. ✅ Testar exclusão de pessoa
4. ✅ Verificar seletores de pessoas em outras telas

---

## 📝 **Rollback (Se necessário)**

Se precisar reverter:

```sql
-- Remover políticas novas
DROP POLICY IF EXISTS "Admins podem criar pessoas do projeto" ON public.pessoas_projeto;
DROP POLICY IF EXISTS "Admins podem atualizar pessoas do projeto" ON public.pessoas_projeto;
DROP POLICY IF EXISTS "Admins podem deletar pessoas do projeto" ON public.pessoas_projeto;

-- Recriar política original
CREATE POLICY "Apenas administradores podem gerenciar pessoas do projeto."
  ON public.pessoas_projeto FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
```

---

**IMPORTANTE**: Execute este script **imediatamente** para resolver o problema! 🚨

