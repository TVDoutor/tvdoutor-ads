# 🔴 CORREÇÃO: Erro de Constraint ao Criar Proposta

## ❌ ERRO IDENTIFICADO

```
Erro ao criar proposta: 
{code: '23514', details: null, hint: null, 
message: 'new row for relation "proposals" violates check constraint 
"proposals_impact_formula_check"'}
```

**O que aconteceu:**
- O campo `impact_formula` na tabela `proposals` tem uma constraint que só aceita letras: `CHECK (impact_formula IN ('A', 'B', 'C', 'D', ...))` 
- Mas agora o sistema usa **IDs numéricos** (`1`, `2`, `3`) da tabela `impact_models`
- Quando tenta salvar `impact_formula = '1'`, a constraint rejeita

---

## ✅ SOLUÇÃO RÁPIDA (30 segundos)

### 1. Acesse o Dashboard do Supabase
- https://supabase.com/dashboard
- Vá para **SQL Editor**

### 2. Execute este código:

```sql
-- Remover constraint que está bloqueando
ALTER TABLE public.proposals 
DROP CONSTRAINT IF EXISTS proposals_impact_formula_check;

-- Verificar
SELECT '✅ Constraint removida! Agora aceita IDs numéricos.' AS status;
```

### 3. Resultado esperado:
```
✅ Constraint removida! Agora aceita IDs numéricos.
```

---

## 🔍 EXPLICAÇÃO TÉCNICA

### Antes (Problema):
```sql
-- Constraint antiga (muito restritiva)
ALTER TABLE proposals 
ADD CONSTRAINT proposals_impact_formula_check 
CHECK (impact_formula IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'));
```

**Problema:** 
- Só aceita letras fixas
- Rejeita IDs numéricos (`1`, `2`, `3`)
- Não é flexível para novos modelos

### Depois (Solução):
```sql
-- SEM constraint (totalmente flexível)
ALTER TABLE proposals 
DROP CONSTRAINT proposals_impact_formula_check;
```

**Benefício:**
- ✅ Aceita IDs numéricos (`1`, `2`, `3`, etc.)
- ✅ Aceita letras antigas (`A`, `B`, `C`) para retrocompatibilidade
- ✅ Flexível para adicionar novos modelos
- ✅ Não quebra propostas antigas

---

## 🧪 TESTAR APÓS CORREÇÃO

### 1. No SQL Editor (Verificar)

```sql
-- Ver constraint foi removida
SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'public.proposals'::regclass 
AND conname = 'proposals_impact_formula_check';

-- Resultado esperado: 0 linhas (constraint não existe mais)
```

### 2. No Frontend (Testar)

1. **Limpe o cache:**
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

2. **Faça login novamente**

3. **Crie uma nova proposta:**
   - Vá para "Nova Proposta"
   - Preencha os dados
   - Selecione uma fórmula de impacto (A, B ou C)
   - Clique em "Próximo"
   - ✅ **Deve funcionar sem erros!**

---

## 📊 IMPACTO DA MUDANÇA

### ✅ O que CONTINUA funcionando:
- ✅ Propostas antigas com fórmulas `A`, `B`, `C` continuam funcionando
- ✅ Leitura de todas as propostas existentes
- ✅ Relatórios e dashboards

### ✅ O que PASSA a funcionar:
- ✅ Criar novas propostas com IDs numéricos (`1`, `2`, `3`)
- ✅ Adicionar novos modelos de impacto dinamicamente
- ✅ Sistema totalmente dinâmico

### ⚠️ O que muda:
- ⚠️ O campo `impact_formula` agora aceita qualquer valor (mais flexível)
- ⚠️ A validação agora é feita no frontend, não no banco

---

## 🛠️ ALTERNATIVAS (Se quiser manter alguma validação)

### Opção 1: Aceitar apenas números
```sql
ALTER TABLE public.proposals 
ADD CONSTRAINT proposals_impact_formula_numeric
CHECK (impact_formula ~ '^[0-9]+$' OR impact_formula IS NULL);
```

### Opção 2: Aceitar letras OU números
```sql
ALTER TABLE public.proposals 
ADD CONSTRAINT proposals_impact_formula_alphanumeric
CHECK (impact_formula ~ '^[A-Z0-9]+$' OR impact_formula IS NULL);
```

### Opção 3: Sem constraint (Recomendado)
```sql
-- Não adicionar constraint
-- Deixar validação para o frontend e business logic
```

**Recomendação:** Use a **Opção 3** (sem constraint) para máxima flexibilidade.

---

## 🚨 SE O ERRO PERSISTIR

### Erro: "constraint does not exist"
- **Causa:** Constraint já foi removida
- **Solução:** Prossiga para testar no frontend

### Erro: "permission denied"
- **Causa:** Usuário sem permissão de ALTER TABLE
- **Solução:** Execute como usuário admin/postgres

### Erro ainda aparece no frontend
- **Causa:** Cache do navegador
- **Solução:** 
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

---

## ✅ CHECKLIST

Após aplicar a correção:

- [ ] Executei o DROP CONSTRAINT no Supabase
- [ ] Vi mensagem de sucesso
- [ ] Verifiquei que a constraint não existe mais
- [ ] Limpei cache do navegador
- [ ] Fiz login novamente
- [ ] Tentei criar uma nova proposta
- [ ] Consegui selecionar fórmula de impacto
- [ ] Proposta foi criada com sucesso
- [ ] Não há erro 23514 no console

---

## 📝 RESUMO

**Problema:** Constraint muito restritiva bloqueando IDs numéricos  
**Solução:** Remover constraint para permitir flexibilidade  
**Tempo:** 30 segundos  
**Impacto:** Positivo - sistema mais flexível  
**Retrocompatibilidade:** ✅ Mantida

---

**Última atualização**: 28/10/2025  
**Status**: 🔴 Correção urgente necessária  
**Arquivo SQL**: `CORRIGIR_CONSTRAINT_PROPOSALS.sql`  
**Prioridade**: ALTA - Bloqueia criação de propostas

