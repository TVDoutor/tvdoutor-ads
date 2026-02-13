# ⚡ Diagnóstico Rápido - Profissional Não Salva

## 🎯 Teste Rápido (30 segundos)

### 1. Abra o Console do Navegador
- Pressione `F12`
- Vá na aba **Console**

### 2. Cadastre um Profissional de Teste
- Nome: Teste Debug
- Tipo: Médico
- Registro: TEST-001
- Clique em **Cadastrar**

### 3. Veja o que Aparece no Console

#### ✅ SE APARECER:
```
📝 Tentando criar profissional: {...}
✅ Profissional criado com sucesso: {...}
🎉 Sucesso! Profissional salvo: {...}
```
**= FUNCIONOU!** Profissional foi salvo. 

**Solução:** Recarregue a página (F5)

---

#### ❌ SE APARECER ERRO:

**Erro 1:** `permission denied for table profissionais_saude`

**Solução:**
1. Acesse: https://app.supabase.com/project/vaogzhwzucijiyvyglls/sql
2. Execute: Arquivo `FIX_RLS_PROFISSIONAIS_SAUDE.sql`
3. Recarregue a página

---

**Erro 2:** `null value in column "created_by"`

**Solução:** Execute no Supabase:
```sql
ALTER TABLE profissionais_saude 
ALTER COLUMN created_by DROP NOT NULL;
```

---

**Erro 3:** `duplicate key value violates unique constraint`

**Solução:** O registro já existe! 
- Troque o número do registro
- Ou exclua o existente primeiro

---

## 🔍 Verificar se Salvou no Banco

Execute no SQL Editor do Supabase:

```sql
SELECT * FROM profissionais_saude 
ORDER BY created_at DESC 
LIMIT 10;
```

- **Vazio** = Não salvou
- **Com dados** = Salvou mas não está carregando

---

## ⚡ Solução Mais Comum

Na maioria dos casos, é falta de permissão RLS:

```sql
-- Copie e execute isso:
ALTER TABLE profissionais_saude ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON profissionais_saude;

CREATE POLICY "auth_all" 
ON profissionais_saude 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

GRANT ALL ON profissionais_saude TO authenticated;
```

---

## 📞 Precisa de Mais Ajuda?

Leia o guia completo: **DEBUG_PROFISSIONAL_NAO_SALVA.md**

---

**Tempo:** 30 segundos - 2 minutos  
**Dificuldade:** Fácil ⭐
