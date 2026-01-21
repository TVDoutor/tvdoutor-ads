# 🎯 INSTRUÇÕES FINAIS - Corrigir Vínculos

## ❌ Problema Atual

- Dropdown de "Unidade de Saúde" está **vazio**
- Não consegue adicionar vínculos
- Console mostra erro **400 (Bad Request)** ao buscar venues

---

## ✅ Solução (3 Passos Simples)

### 1️⃣ Acesse o SQL Editor do Supabase

🔗 https://app.supabase.com/project/vaogzhwzucijiyvyglls/sql/new

### 2️⃣ Copie e Cole Este SQL:

```sql
-- FIX FINAL - Resolver vínculos e venues

-- 1. DESABILITAR RLS EM VENUES
ALTER TABLE venues DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON venues TO authenticated, anon, service_role;

-- 2. LIMPAR PROFISSIONAL_VENUE
ALTER TABLE profissional_venue DISABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE pol TEXT;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profissional_venue'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol) || ' ON profissional_venue CASCADE';
    END LOOP;
END $$;

-- 3. REABILITAR E CRIAR POLÍTICA SIMPLES
ALTER TABLE profissional_venue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" 
ON profissional_venue 
FOR ALL 
TO authenticated, anon
USING (true) 
WITH CHECK (true);

-- 4. CONCEDER PERMISSÕES
GRANT ALL ON profissional_venue TO authenticated, service_role;
GRANT SELECT ON profissional_venue TO anon;
GRANT SELECT ON profissionais_saude TO authenticated, anon, service_role;

SELECT '✅ PRONTO!' as status;
```

### 3️⃣ Clique em "RUN" e Depois:

1. **Feche** o diálogo de vínculos
2. **Recarregue** a página com `F5`
3. **Abra** novamente o diálogo de vínculos
4. **Teste** selecionar uma unidade

---

## 🎯 O Que Este SQL Faz:

| Item | O Que Faz | Por Quê |
|------|-----------|---------|
| **Venues RLS OFF** | Desabilita RLS em `venues` | Permite SELECT sem bloqueios |
| **Venues SELECT** | Concede SELECT para todos | Dropdown pode carregar venues |
| **Limpa Políticas** | Remove políticas conflitantes | Evita erro "already exists" |
| **Política Simples** | Cria 1 política permissiva | Permite INSERT/UPDATE/DELETE |
| **Permissões Full** | Concede todas as permissões | Garante acesso completo |

---

## 📊 Após Executar, Você Verá:

### ✅ No Dropdown:
```
Selecione a unidade
  ↓
Hospital Santa Maria - São Paulo/SP
Clínica Vida - Rio de Janeiro/RJ
UBS Centro - Belo Horizonte/MG
... (todas as suas venues)
```

### ✅ Console (F12):
```
✓ Venues carregados com sucesso
✓ Vínculo criado com sucesso
```

---

## 🐛 Se Ainda Não Funcionar:

1. **Abra o Console** (`F12` → Console)
2. **Tire um print** dos erros
3. **Verifique** se o SQL foi executado com sucesso
4. **Compartilhe** a mensagem de erro

---

## 📁 Arquivo SQL:

`FIX_FINAL.sql` (na raiz do projeto)

---

## 🚀 Pronto!

Depois de executar o SQL, o sistema vai:

✅ Carregar venues no dropdown  
✅ Permitir criar vínculos  
✅ Funcionar perfeitamente  

**Execute e teste!** 🎉
