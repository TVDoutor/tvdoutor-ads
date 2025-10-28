# 🔴 CORREÇÃO URGENTE: Erro de Permissão impact_models

## ❌ ERRO IDENTIFICADO

```
Erro ao buscar fórmulas de impacto:
{code: '42501', details: null, hint: null, 
message: 'permission denied for table impact_models'}
```

**Tradução**: O usuário não tem permissão para ler a tabela `impact_models`

**Causa**: As políticas RLS (Row Level Security) estão muito restritivas ou incorretas.

---

## ✅ SOLUÇÃO IMEDIATA

### 🚀 Opção 1: Correção Completa (Recomendada)

1. **Acesse o Dashboard do Supabase**
   - https://supabase.com/dashboard
   - Vá para **SQL Editor**

2. **Execute o script completo**
   - Abra: `CORRIGIR_PERMISSOES_IMPACT_MODELS.sql`
   - Copie TODO o conteúdo
   - Cole no SQL Editor
   - Clique em **RUN**

3. **Resultado esperado:**
   ```
   ✅ Políticas de segurança atualizadas com sucesso!
   ✅ Todos os usuários autenticados podem LER fórmulas
   ✅ Apenas ADMINs podem CRIAR/EDITAR fórmulas
   ✅ Apenas SUPER_ADMINs podem EXCLUIR fórmulas
   ```

---

### ⚡ Opção 2: Correção Rápida (Menos de 30 segundos)

Se você precisa de uma solução IMEDIATA, execute apenas isto no SQL Editor:

```sql
-- Remover políticas antigas
DROP POLICY IF EXISTS "Authenticated users can read impact models" ON public.impact_models;
DROP POLICY IF EXISTS "Only admins can manage impact models" ON public.impact_models;

-- Criar política permissiva para leitura
CREATE POLICY "allow_all_read_impact_models"
    ON public.impact_models
    FOR SELECT
    USING (true);

-- Testar
SELECT * FROM public.impact_models WHERE active = true;
```

**Esta opção permite que QUALQUER pessoa (mesmo não autenticada) leia as fórmulas.**

---

### 🔧 Opção 3: Desabilitar RLS Temporariamente (Para Teste)

**⚠️ Use apenas para diagnóstico! NÃO use em produção!**

```sql
-- Desabilitar RLS
ALTER TABLE public.impact_models DISABLE ROW LEVEL SECURITY;

-- Testar
SELECT * FROM public.impact_models;

-- IMPORTANTE: Após confirmar que funciona, reabilite:
-- ALTER TABLE public.impact_models ENABLE ROW LEVEL SECURITY;
```

---

## 🔍 DIAGNÓSTICO

### Verificar o Problema

Execute no SQL Editor para entender o problema:

```sql
-- 1. Verificar se RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'impact_models';

-- 2. Verificar políticas existentes
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'impact_models';

-- 3. Verificar se há dados
SELECT COUNT(*) FROM public.impact_models;

-- 4. Tentar ler dados (para ver o erro)
SELECT * FROM public.impact_models;
```

### Resultados Esperados

**Se RLS está habilitado mas sem políticas:**
- `rowsecurity = true`
- Nenhuma política listada
- **Solução**: Criar políticas (Opção 1 ou 2)

**Se há políticas mas estão incorretas:**
- Políticas listadas mas com condições muito restritivas
- **Solução**: Remover e recriar (Opção 1)

**Se não há dados:**
- `COUNT(*) = 0`
- **Solução**: Inserir dados iniciais (use script `APLICAR_MIGRACAO_IMPACT_MODELS.sql`)

---

## 📋 POLÍTICAS CORRETAS

Após aplicar a correção, você deve ter estas políticas:

| Nome da Política | Operação | Quem Pode | Condição |
|-----------------|----------|-----------|----------|
| `allow_authenticated_read_impact_models` | SELECT | authenticated, anon | Sempre (true) |
| `allow_admin_insert_impact_models` | INSERT | authenticated | Apenas admin/super_admin |
| `allow_admin_update_impact_models` | UPDATE | authenticated | Apenas admin/super_admin |
| `allow_superadmin_delete_impact_models` | DELETE | authenticated | Apenas super_admin |

---

## 🧪 TESTAR APÓS CORREÇÃO

### 1. No SQL Editor do Supabase

```sql
-- Deve retornar 3 fórmulas
SELECT id, name, multiplier 
FROM public.impact_models 
WHERE active = true 
ORDER BY multiplier DESC;
```

**Resultado esperado:**
```
id | name       | multiplier
---|------------|------------
1  | Fórmula A  | 1.50
2  | Fórmula B  | 1.00
3  | Fórmula C  | 0.70
```

### 2. No Frontend (Navegador)

1. **Limpe o cache:**
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

2. **Faça login novamente**

3. **Vá até Nova Proposta → Modelo de Impacto**

4. **Verifique:**
   - ✅ Sem erro "permission denied"
   - ✅ 3 fórmulas aparecem (A, B, C)
   - ✅ Pode selecionar uma fórmula

---

## 🚨 SE AINDA HOUVER ERRO

### Erro: "function is_admin() does not exist"

As políticas usam a função `is_admin()`. Se ela não existir, crie:

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'manager')
  );
$$;
```

### Erro: "relation impact_models does not exist"

A tabela não foi criada. Execute primeiro:
- `APLICAR_MIGRACAO_IMPACT_MODELS.sql`

### Erro: "Cannot read properties of undefined"

Problema no frontend. Verifique:
1. Cache do navegador foi limpo?
2. Token de autenticação está válido?
3. Há erros anteriores no console?

---

## 📊 COMPARAÇÃO: ANTES vs DEPOIS

### ❌ ANTES (Com Erro)

**Console do Navegador:**
```
🔴 GET /rest/v1/impact_models 403 (Forbidden)
🔴 Erro ao buscar fórmulas: permission denied for table impact_models
```

**Interface:**
```
🔴 Erro ao carregar fórmulas de impacto
```

### ✅ DEPOIS (Corrigido)

**Console do Navegador:**
```
✅ GET /rest/v1/impact_models 200 (OK)
✅ 3 fórmulas carregadas com sucesso
```

**Interface:**
```
✅ Fórmula A - Alto Tráfego (1.5x)
✅ Fórmula B - Médio Tráfego (1.0x)
✅ Fórmula C - Baixo Tráfego (0.7x)
```

---

## ✅ CHECKLIST DE VERIFICAÇÃO

Após aplicar a correção:

- [ ] Executei o script de correção no Supabase
- [ ] Vi mensagem de sucesso no SQL Editor
- [ ] Testei SELECT e retornou 3 fórmulas
- [ ] Verifiquei que 4 políticas foram criadas
- [ ] Limpei cache do navegador
- [ ] Fiz login novamente
- [ ] Acessei o wizard de propostas
- [ ] Vi as 3 fórmulas sem erros
- [ ] Console não mostra erro 403 ou "permission denied"

---

## 🎯 RESUMO

**Problema**: Políticas RLS muito restritivas  
**Solução**: Recriar políticas mais permissivas  
**Tempo**: 2-5 minutos  
**Impacto**: Zero (apenas corrige acesso)

**⚠️ IMPORTANTE**: Após aplicar a correção, **SEMPRE limpe o cache do navegador!**

---

**Última atualização**: 28/10/2025  
**Status**: 🔴 Correção urgente necessária  
**Arquivo SQL**: `CORRIGIR_PERMISSOES_IMPACT_MODELS.sql`

