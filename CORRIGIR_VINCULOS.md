# 🔧 Corrigir Erro ao Criar Vínculos

## ❌ Erro Atual

```
400 (Bad Request)
GET/POST profissional_venue - Erro
```

## ✅ Solução Rápida (1 minuto)

### Acesse o Supabase SQL Editor:
https://app.supabase.com/project/vaogzhwzucijiyvyglls/sql

### Execute este SQL:

```sql
-- Habilitar RLS
ALTER TABLE profissional_venue ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "profissional_venue_select" ON profissional_venue;
DROP POLICY IF EXISTS "profissional_venue_insert" ON profissional_venue;
DROP POLICY IF EXISTS "profissional_venue_update" ON profissional_venue;
DROP POLICY IF EXISTS "profissional_venue_delete" ON profissional_venue;

-- Criar políticas permissivas
CREATE POLICY "profissional_venue_select" 
ON profissional_venue FOR SELECT 
TO authenticated, anon USING (true);

CREATE POLICY "profissional_venue_insert" 
ON profissional_venue FOR INSERT 
TO authenticated WITH CHECK (true);

CREATE POLICY "profissional_venue_update" 
ON profissional_venue FOR UPDATE 
TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "profissional_venue_delete" 
ON profissional_venue FOR DELETE 
TO authenticated USING (true);

-- Conceder permissões
GRANT ALL ON profissional_venue TO authenticated;
GRANT SELECT ON profissional_venue TO anon;
GRANT SELECT ON venues TO authenticated, anon;
```

---

## 🧪 Teste

Após executar o SQL acima:

1. **Recarregue a página** (F5)
2. **Abra o diálogo de vínculos** novamente
3. **Selecione uma unidade**
4. **Clique em "Adicionar Vínculo"**
5. ✅ Deve funcionar!

---

## 🔍 Verificar se Funcionou

Execute no Supabase:

```sql
-- Ver vínculos criados
SELECT 
    pv.*,
    ps.nome as profissional_nome,
    v.name as venue_nome
FROM profissional_venue pv
JOIN profissionais_saude ps ON pv.profissional_id = ps.id
JOIN venues v ON pv.venue_id = v.id;
```

---

## 📋 Arquivo Completo

Para correção completa, execute:  
**FIX_RLS_VINCULOS.sql**

---

**Tempo:** 1 minuto  
**Dificuldade:** Fácil ⭐
