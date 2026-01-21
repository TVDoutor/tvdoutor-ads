# 🐛 Debug: Profissional Não Salva no Supabase

## 🔍 Investigando o Problema

### Passo 1: Verificar Console do Navegador

1. **Abra o Console** (F12 → Aba Console)
2. **Cadastre um profissional de teste**
3. **Procure por estas mensagens:**

   ```
   📝 Tentando criar profissional: {...}
   ✅ Profissional criado com sucesso: {...}
   🎉 Sucesso! Profissional salvo: {...}
   ```

   **OU erros:**
   ```
   ❌ Erro ao inserir no Supabase: {...}
   ❌ Erro completo: {...}
   ```

4. **Copie qualquer erro** que aparecer

---

### Passo 2: Verificar no Supabase

1. **Acesse o SQL Editor**: https://app.supabase.com/project/vaogzhwzucijiyvyglls/sql

2. **Execute este SQL**:
   ```sql
   -- Ver todos os profissionais
   SELECT * FROM profissionais_saude ORDER BY created_at DESC;
   ```

3. **Resultado esperado:**
   - Se estiver vazio = profissional não foi salvo
   - Se aparecer = profissional foi salvo mas não está carregando na página

---

### Passo 3: Testar Insert Manual

Execute no SQL Editor:

```sql
-- Tentar inserir manualmente
INSERT INTO profissionais_saude (
    nome,
    tipo_profissional,
    tipo_registro,
    registro_profissional,
    email,
    telefone,
    ativo
) VALUES (
    'Dr. Teste Manual',
    'Médico',
    'CRM',
    'TESTE-999-SP',
    'teste@manual.com',
    '11999999999',
    true
) RETURNING *;
```

**Se der erro:**
- ❌ **"permission denied"** → Políticas RLS não foram aplicadas
- ❌ **"violates foreign key"** → Problema com relacionamentos
- ❌ **"column does not exist"** → Estrutura da tabela diferente
- ✅ **Sucesso** → Problema está no código frontend

---

## 🔧 Possíveis Causas e Soluções

### Causa 1: Políticas RLS Não Aplicadas

**Sintoma:** Erro "permission denied"

**Solução:**
```sql
-- Copie e execute todo o conteúdo de:
-- FIX_RLS_PROFISSIONAIS_SAUDE.sql
```

---

### Causa 2: Campo `created_by` Obrigatório

**Sintoma:** Erro "null value in column 'created_by'"

**Solução:** Verificar se o campo aceita NULL:

```sql
-- Ver estrutura da tabela
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profissionais_saude';

-- Se created_by não aceitar NULL, alterar:
ALTER TABLE profissionais_saude 
ALTER COLUMN created_by DROP NOT NULL;
```

---

### Causa 3: Validação de Email ou Telefone

**Sintoma:** Erro de constraint ou validação

**Solução:** Verificar constraints:

```sql
-- Ver constraints da tabela
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'profissionais_saude';

-- Se houver constraint de email inválido:
ALTER TABLE profissionais_saude
DROP CONSTRAINT IF EXISTS profissionais_saude_email_check;
```

---

### Causa 4: Trigger ou Function Falhando

**Sintoma:** Insert silenciosamente não salva

**Solução:** Verificar triggers:

```sql
-- Ver triggers da tabela
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profissionais_saude';

-- Se houver trigger problemático, desabilitar temporariamente:
-- ALTER TABLE profissionais_saude DISABLE TRIGGER nome_do_trigger;
```

---

## 🧪 Teste Completo

Execute este script no SQL Editor para diagnóstico completo:

```sql
-- =====================================================
-- DIAGNÓSTICO COMPLETO
-- =====================================================

-- 1. Verificar se a tabela existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'profissionais_saude'
        ) 
        THEN '✅ Tabela existe'
        ELSE '❌ Tabela NÃO existe'
    END as status_tabela;

-- 2. Ver estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profissionais_saude'
ORDER BY ordinal_position;

-- 3. Verificar políticas RLS
SELECT 
    COUNT(*) as total_politicas,
    CASE 
        WHEN COUNT(*) >= 4 THEN '✅ Políticas OK'
        ELSE '❌ Faltam políticas'
    END as status
FROM pg_policies
WHERE tablename = 'profissionais_saude';

-- 4. Ver políticas em detalhe
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'profissionais_saude';

-- 5. Verificar permissões
SELECT 
    grantee,
    string_agg(privilege_type, ', ') as permissoes
FROM information_schema.table_privileges
WHERE table_name = 'profissionais_saude'
    AND grantee IN ('authenticated', 'anon')
GROUP BY grantee;

-- 6. Contar profissionais existentes
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN ativo = true THEN 1 END) as ativos,
    COUNT(CASE WHEN ativo = false THEN 1 END) as inativos
FROM profissionais_saude;

-- 7. Tentar inserir um teste
DO $$
BEGIN
    INSERT INTO profissionais_saude (
        nome,
        tipo_profissional,
        tipo_registro,
        registro_profissional,
        ativo
    ) VALUES (
        'Dr. Teste SQL',
        'Médico',
        'CRM',
        'SQL-TEST-001',
        true
    );
    
    RAISE NOTICE '✅ Insert de teste funcionou!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erro no insert: %', SQLERRM;
END $$;

-- 8. Verificar se o teste foi salvo
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM profissionais_saude 
            WHERE registro_profissional = 'SQL-TEST-001'
        )
        THEN '✅ Profissional de teste foi salvo'
        ELSE '❌ Profissional de teste NÃO foi salvo'
    END as resultado_teste;

-- 9. Limpar teste
DELETE FROM profissionais_saude 
WHERE registro_profissional = 'SQL-TEST-001';
```

---

## 📋 Checklist de Verificação

Execute na ordem:

- [ ] Políticas RLS aplicadas (`FIX_RLS_PROFISSIONAIS_SAUDE.sql`)
- [ ] Insert manual funciona no SQL Editor
- [ ] Console do navegador mostra logs de debug
- [ ] Não há erros no console
- [ ] Toast de sucesso aparece ao cadastrar
- [ ] Profissional aparece na lista após cadastro
- [ ] Profissional está salvo no Supabase (SQL: `SELECT * FROM profissionais_saude`)

---

## 🔍 Logs Esperados no Console

Ao cadastrar um profissional, você DEVE ver:

```
📝 Tentando criar profissional: {
  nome: "Jose do Sinai",
  tipo_profissional: "Médico",
  tipo_registro: "CRM",
  registro_profissional: "123456-SP",
  ...
}

✅ Profissional criado com sucesso: {
  id: "uuid-gerado",
  nome: "Jose do Sinai",
  ...
}

🎉 Sucesso! Profissional salvo: {...}
```

**Se não aparecer:**
- Formulário não está enviando dados
- Verificar se `onSubmit` está sendo chamado

**Se aparecer erro:**
- Copiar o erro completo
- Verificar mensagem e hint
- Aplicar solução correspondente

---

## ⚡ Solução Rápida

Se nada funcionar, **recrie a tabela**:

```sql
-- CUIDADO: Isso apaga todos os dados!
DROP TABLE IF EXISTS profissional_especialidades CASCADE;
DROP TABLE IF EXISTS profissional_venue CASCADE;
DROP TABLE IF EXISTS profissionais_saude CASCADE;

-- Recriar tabela principal
CREATE TABLE profissionais_saude (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    tipo_profissional VARCHAR(100) NOT NULL,
    tipo_registro VARCHAR(50),
    registro_profissional VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(20),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Recriar vínculos
CREATE TABLE profissional_venue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profissional_id UUID NOT NULL REFERENCES profissionais_saude(id) ON DELETE CASCADE,
    venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    cargo_na_unidade VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profissional_id, venue_id)
);

-- Recriar especialidades
CREATE TABLE profissional_especialidades (
    profissional_id UUID NOT NULL REFERENCES profissionais_saude(id) ON DELETE CASCADE,
    specialty_id UUID NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
    PRIMARY KEY (profissional_id, specialty_id)
);

-- Aplicar políticas RLS
-- (Execute todo o FIX_RLS_PROFISSIONAIS_SAUDE.sql)
```

---

## 📞 Próximos Passos

1. Execute o diagnóstico completo
2. Copie todos os resultados
3. Compartilhe os erros encontrados
4. Aplicar correção específica

---

**Tempo estimado:** 5-10 minutos  
**Dificuldade:** Intermediária ⭐⭐
