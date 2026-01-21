# 🔧 Como Corrigir o Erro de Permissão

## ❌ Erro Atual

```
Erro ao carregar profissionais
permission denied for table profissionais_saude
```

## ✅ Solução

O erro ocorre porque as **políticas RLS (Row Level Security)** não foram configuradas no Supabase.

---

## 🚀 Opção 1: Aplicar Automaticamente (RÁPIDO)

### Via PowerShell:

```powershell
.\scripts\apply_rls_profissionais.ps1
```

---

## 📋 Opção 2: Aplicar Manualmente no Supabase (RECOMENDADO)

### Passo a Passo:

1. **Acesse o Supabase Dashboard**
   - URL: https://app.supabase.com
   - Login com sua conta

2. **Selecione o Projeto**
   - Project ID: `vaogzhwzucijiyvyglls`

3. **Vá para SQL Editor**
   - Menu lateral → "SQL Editor"
   - Ou acesse: https://app.supabase.com/project/vaogzhwzucijiyvyglls/sql

4. **Copie o Script SQL**
   - Abra o arquivo: `FIX_RLS_PROFISSIONAIS_SAUDE.sql`
   - Selecione todo o conteúdo (Ctrl+A)
   - Copie (Ctrl+C)

   **OU** execute este comando no PowerShell para copiar automaticamente:
   ```powershell
   Get-Content .\FIX_RLS_PROFISSIONAIS_SAUDE.sql | Set-Clipboard
   ```

5. **Execute o Script**
   - Cole o SQL no editor (Ctrl+V)
   - Clique em "Run" ou pressione Ctrl+Enter
   - Aguarde a execução

6. **Verifique o Sucesso**
   - Deve aparecer mensagem: "✅ Políticas RLS configuradas com sucesso!"
   - Se houver erros, verifique se as tabelas existem

7. **Recarregue a Página**
   - Volte para: http://localhost:8080/profissionais-saude
   - Pressione F5 para recarregar
   - O erro deve ter sumido! 🎉

---

## 🔍 O que o Script Faz?

O script SQL cria **políticas de segurança** que permitem:

✅ **SELECT** - Visualizar profissionais  
✅ **INSERT** - Cadastrar novos profissionais  
✅ **UPDATE** - Editar profissionais  
✅ **DELETE** - Excluir profissionais  

Para as tabelas:
- `profissionais_saude` (dados principais)
- `profissional_venue` (vínculos com unidades)
- `profissional_especialidades` (especialidades)

---

## ⚡ Solução Rápida (Copiar e Colar)

Se preferir, **copie e execute diretamente este SQL** no SQL Editor do Supabase:

```sql
-- Habilitar RLS
ALTER TABLE profissionais_saude ENABLE ROW LEVEL SECURITY;
ALTER TABLE profissional_venue ENABLE ROW LEVEL SECURITY;
ALTER TABLE profissional_especialidades ENABLE ROW LEVEL SECURITY;

-- Políticas para profissionais_saude
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar profissionais" ON profissionais_saude;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir profissionais" ON profissionais_saude;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar profissionais" ON profissionais_saude;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar profissionais" ON profissionais_saude;

CREATE POLICY "Usuários autenticados podem visualizar profissionais" ON profissionais_saude FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem inserir profissionais" ON profissionais_saude FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar profissionais" ON profissionais_saude FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem deletar profissionais" ON profissionais_saude FOR DELETE TO authenticated USING (true);

-- Políticas para profissional_venue
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar vínculos" ON profissional_venue;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir vínculos" ON profissional_venue;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar vínculos" ON profissional_venue;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar vínculos" ON profissional_venue;

CREATE POLICY "Usuários autenticados podem visualizar vínculos" ON profissional_venue FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem inserir vínculos" ON profissional_venue FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar vínculos" ON profissional_venue FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem deletar vínculos" ON profissional_venue FOR DELETE TO authenticated USING (true);

-- Políticas para profissional_especialidades
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar especialidades" ON profissional_especialidades;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir especialidades" ON profissional_especialidades;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar especialidades" ON profissional_especialidades;

CREATE POLICY "Usuários autenticados podem visualizar especialidades" ON profissional_especialidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem inserir especialidades" ON profissional_especialidades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem deletar especialidades" ON profissional_especialidades FOR DELETE TO authenticated USING (true);

-- Conceder permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON profissionais_saude TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profissional_venue TO authenticated;
GRANT SELECT, INSERT, DELETE ON profissional_especialidades TO authenticated;

SELECT '✅ Políticas RLS configuradas com sucesso!' as status;
```

---

## 🐛 Se o Erro Persistir

### 1. Verifique se as tabelas existem

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profissionais_saude', 'profissional_venue', 'profissional_especialidades');
```

Se retornar vazio, você precisa criar as tabelas primeiro!

### 2. Verifique as políticas

```sql
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('profissionais_saude', 'profissional_venue', 'profissional_especialidades');
```

Deve mostrar as 11 políticas criadas.

### 3. Limpe o cache do navegador

- Pressione Ctrl+Shift+Delete
- Limpe cache e cookies
- Recarregue a página (F5)

### 4. Verifique a autenticação

- Faça logout e login novamente
- Verifique se o token JWT está válido

---

## ✅ Checklist de Solução

- [ ] Script SQL executado no Supabase
- [ ] Mensagem de sucesso apareceu
- [ ] Página recarregada (F5)
- [ ] Erro desapareceu
- [ ] Profissionais carregam normalmente

---

## 📞 Ainda com Problemas?

Se o erro persistir:

1. Abra o Console do navegador (F12)
2. Vá na aba "Console"
3. Copie o erro completo
4. Verifique se o usuário está autenticado
5. Confirme que as tabelas existem no Supabase

---

**Tempo estimado para resolver:** 2-5 minutos ⏱️  
**Dificuldade:** Fácil ⭐
