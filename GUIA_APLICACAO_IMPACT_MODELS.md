# 🚀 Guia de Aplicação: Sistema de Modelos de Impacto

## 🔴 PROBLEMA IDENTIFICADO

**Erro no Console:**
```
Erro ao buscar fórmulas de impacto: 
{code: "PGRST205", details: null, hint: "Perhaps you meant the table 'public.campaign_screens'?", 
message: "Could not find the table 'public.impact_models' in the schema cache"}
```

**Causa:** A tabela `impact_models` não existe no banco de dados Supabase.

**Solução:** Aplicar a migração manualmente via Dashboard do Supabase.

---

## ✅ SOLUÇÃO: Aplicar Migração no Supabase

### 📋 Passo 1: Acessar o Dashboard do Supabase

1. Acesse: https://supabase.com/dashboard
2. Faça login com sua conta
3. Selecione o projeto **TVDoutor**

### 📋 Passo 2: Abrir o SQL Editor

1. No menu lateral, clique em **SQL Editor** (ícone de banco de dados)
2. Clique em **+ New Query** para criar uma nova consulta

### 📋 Passo 3: Aplicar a Migração

1. **Abra o arquivo**: `APLICAR_MIGRACAO_IMPACT_MODELS.sql`
2. **Copie TODO o conteúdo** do arquivo
3. **Cole no SQL Editor** do Supabase
4. **Clique em RUN** (ou pressione `Ctrl+Enter`)

### 📋 Passo 4: Verificar Sucesso

Você deve ver no console do SQL Editor:

```
✅ Migração aplicada com sucesso!
Total de fórmulas: 3

Fórmulas criadas:
- Fórmula A (Multiplicador: 1.50)
- Fórmula B (Multiplicador: 1.00)
- Fórmula C (Multiplicador: 0.70)
```

---

## 🔍 VERIFICAÇÃO

### 1. Verificar Tabela Criada

Execute no SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'impact_models';
```

**Resultado esperado:** Uma linha com `impact_models`

### 2. Verificar Dados Iniciais

Execute no SQL Editor:

```sql
SELECT id, name, description, multiplier, active 
FROM public.impact_models 
ORDER BY multiplier DESC;
```

**Resultado esperado:**
| id | name | description | multiplier | active |
|----|------|-------------|------------|--------|
| 1  | Fórmula A | Para locais com grande movimento... | 1.50 | true |
| 2  | Fórmula B | Para locais com movimento moderado... | 1.00 | true |
| 3  | Fórmula C | Para locais com menor movimento... | 0.70 | true |

### 3. Verificar Políticas RLS

Execute no SQL Editor:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'impact_models';
```

**Resultado esperado:** 2 políticas
- `Authenticated users can read impact models`
- `Only admins can manage impact models`

---

## 🌐 TESTAR NO FRONTEND

### 1. Limpar Cache do Navegador

```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 2. Fazer Login Novamente

- Acesse a aplicação
- Faça login com um usuário admin
- Navegue até o wizard de propostas

### 3. Verificar Modelo de Impacto

Na etapa **"Modelo de Impacto"** do wizard, você deve ver:

✅ **3 opções de fórmula**:
- Fórmula A (com gradiente verde)
- Fórmula B (com gradiente azul)
- Fórmula C (com gradiente laranja/vermelho)

✅ **Sem erros no console**

---

## 🛠️ SOLUÇÃO DE PROBLEMAS

### Erro: "relation impact_models does not exist"

**Causa:** A migração não foi aplicada corretamente.

**Solução:**
1. Verifique se você executou TODO o script SQL
2. Verifique se não há erros no console do SQL Editor
3. Tente executar novamente

### Erro: "permission denied for table impact_models"

**Causa:** As políticas RLS não foram criadas corretamente.

**Solução:**
Execute apenas a parte das políticas:

```sql
ALTER TABLE public.impact_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read impact models" ON public.impact_models;
DROP POLICY IF EXISTS "Only admins can manage impact models" ON public.impact_models;

CREATE POLICY "Authenticated users can read impact models"
    ON public.impact_models
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can manage impact models"
    ON public.impact_models
    FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());
```

### Erro: "function is_admin() does not exist"

**Causa:** A função `is_admin()` não existe no banco.

**Solução:** Aplique a migração de roles primeiro:

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

### Nenhuma fórmula aparece no wizard

**Causa:** Os dados iniciais não foram inseridos.

**Solução:**
Execute apenas a parte de INSERT:

```sql
INSERT INTO public.impact_models (name, description, traffic_level, multiplier, examples, color_scheme, created_by) 
VALUES
('Fórmula A', 'Para locais com grande movimento de pessoas', 'Alto', 1.5, 
 ARRAY['Shopping centers movimentados', 'Aeroportos e terminais'], 
 '{"gradient": "from-green-500 to-emerald-600"}'::jsonb, NULL),
('Fórmula B', 'Para locais com movimento moderado de pessoas', 'Médio', 1.0,
 ARRAY['Farmácias de bairro', 'Clínicas médicas'], 
 '{"gradient": "from-blue-500 to-cyan-600"}'::jsonb, NULL),
('Fórmula C', 'Para locais com menor movimento de pessoas', 'Baixo', 0.7,
 ARRAY['Consultórios médicos', 'Clínicas especializadas'], 
 '{"gradient": "from-orange-500 to-red-500"}'::jsonb, NULL)
ON CONFLICT (name) DO NOTHING;
```

---

## 📊 ESTRUTURA DA TABELA

```sql
CREATE TABLE public.impact_models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    traffic_level VARCHAR(20) NOT NULL,
    multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    examples TEXT[],
    color_scheme JSONB,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);
```

### Campos:
- **id**: Identificador único (auto-incremento)
- **name**: Nome da fórmula (ex: "Fórmula A")
- **description**: Descrição da fórmula
- **traffic_level**: Nível de tráfego (Alto, Médio, Baixo)
- **multiplier**: Multiplicador de impacto (decimal)
- **examples**: Array de exemplos de locais
- **color_scheme**: JSON com cores da interface
- **active**: Se a fórmula está ativa (true/false)
- **created_at**: Data de criação
- **updated_at**: Data de atualização
- **created_by**: Usuário que criou
- **updated_by**: Usuário que atualizou

---

## 🎯 RESULTADO ESPERADO

Após aplicar a migração:

✅ Tabela `impact_models` criada
✅ 3 fórmulas iniciais inseridas (A, B, C)
✅ RLS habilitado com 2 políticas
✅ Função `get_active_impact_models()` criada
✅ Trigger para `updated_at` criado
✅ Constraint da tabela `proposals` atualizada

---

## 📝 CHECKLIST FINAL

- [ ] Acessei o Dashboard do Supabase
- [ ] Abri o SQL Editor
- [ ] Copiei e colei o script `APLICAR_MIGRACAO_IMPACT_MODELS.sql`
- [ ] Executei o script (RUN)
- [ ] Vi a mensagem de sucesso
- [ ] Verifiquei que 3 fórmulas foram criadas
- [ ] Limpei o cache do navegador
- [ ] Fiz login novamente
- [ ] Testei o wizard de propostas
- [ ] Vejo as 3 fórmulas sem erros no console

---

**Data de criação**: 28/10/2025  
**Status**: ⚠️ Aguardando aplicação manual da migração  
**Prioridade**: 🔴 ALTA - Sistema não funciona sem esta migração

