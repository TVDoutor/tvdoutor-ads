# 🚨 EMERGÊNCIA: Sistema de Autenticação Falhando

## 📋 Problema Crítico

O sistema de **login não está funcionando** devido à URL incorreta do Supabase:

- ❌ **Erro:** `Failed to fetch`
- ❌ **DNS:** `ERR_NAME_NOT_RESOLVED`
- ❌ **URL:** `vaoqzhwzucijjyyvgils.supabase.co` (incorreta)

## 🔥 Solução de Emergência

### **Passo 1: Verificar Projeto Supabase**

1. **Acesse:** [supabase.com](https://supabase.com)
2. **Faça login** na sua conta
3. **Verifique se o projeto está ativo:**
   - Projeto pode ter sido pausado por inatividade
   - Verifique se há cobranças pendentes
   - Projeto pode ter sido deletado

### **Passo 2: Obter URL Correta**

1. **Vá em:** Settings → API
2. **Copie a Project URL** correta
3. **Exemplo de URL válida:** `https://abcdefghijklmnop.supabase.co`

### **Passo 3: Atualizar Arquivo .env**

Edite o arquivo `.env` e substitua:

```env
# ANTES (incorreto)
VITE_SUPABASE_URL=https://vaoqzhwzucijjyyvgils.supabase.co

# DEPOIS (correto)
VITE_SUPABASE_URL=https://SUA-URL-CORRETA.supabase.co
```

### **Passo 4: Reiniciar Servidor**

```bash
# Pare o servidor (Ctrl+C)
npm run dev
```

## 🆘 Se o Projeto Não Existe Mais

### **Opção 1: Criar Novo Projeto**

1. **Crie um novo projeto** no Supabase
2. **Execute as migrações:**
   ```bash
   npx supabase db push
   ```
3. **Deploy das Edge Functions:**
   ```bash
   npx supabase functions deploy
   ```
4. **Atualize o .env** com as novas credenciais

### **Opção 2: Usar Projeto Existente**

Se você tem outro projeto Supabase ativo:
1. **Use as credenciais** desse projeto
2. **Execute as migrações** se necessário
3. **Deploy das Edge Functions**

## 🔧 Scripts de Ajuda

Execute estes scripts para diagnóstico:

```bash
# Testar conectividade
node test-supabase-connection.js

# Debugar URL
node debug-supabase-url.js

# Verificar configurações
node test-env-simple.js
```

## ⚠️ Impacto Atual

**Sem a URL correta, o sistema não funciona:**
- ❌ Login falha
- ❌ Autenticação não funciona
- ❌ Usuários não conseguem acessar
- ❌ Edge Functions não respondem
- ❌ Banco de dados inacessível

## 🎯 Prioridade

**URGENTE:** Corrigir a URL do Supabase é a **prioridade máxima** para restaurar o funcionamento do sistema.

## 📞 Próximos Passos

1. **Verificar status do projeto** no Supabase
2. **Obter URL correta** ou criar novo projeto
3. **Atualizar .env** com credenciais válidas
4. **Testar login** após correção
5. **Verificar todas as funcionalidades**

---

**Status:** 🚨 CRÍTICO - Sistema inacessível
**Ação:** Corrigir URL do Supabase imediatamente
