# 🔧 Configuração das Variáveis de Ambiente

## 🚨 Problema Atual
A página principal não está carregando devido ao erro: **"supabaseUrl is required"**

## 📋 Solução Passo a Passo

### 1. **Verificar Arquivo .env Atual**
```bash
# Verifique se o arquivo .env existe na raiz do projeto
ls -la .env
# ou no Windows:
dir .env
```

### 2. **Configurar Variáveis Obrigatórias**
Edite o arquivo `.env` e configure:

```env
# OBRIGATÓRIO - Substitua pelos valores reais do seu projeto Supabase
VITE_SUPABASE_URL=https://seu-projeto-id.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui

# OPCIONAL - Configure conforme necessário
VITE_GOOGLE_MAPS_API_KEY=sua-chave-google-maps
RESEND_API_KEY=re_sua-chave-resend
VITE_APP_NAME=TV Doutor ADS
VITE_APP_VERSION=1.0.0
```

### 3. **Como Obter as Credenciais do Supabase**

1. **Acesse o Supabase Dashboard:**
   - Vá para [supabase.com](https://supabase.com)
   - Faça login na sua conta
   - Selecione seu projeto

2. **Obtenha a URL do Projeto:**
   - Vá em **Settings** → **API**
   - Copie o **Project URL**
   - Exemplo: `https://abcdefghijklmnop.supabase.co`

3. **Obtenha a Chave Anônima:**
   - Na mesma página **Settings** → **API**
   - Copie a chave **anon public**
   - Exemplo: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 4. **Testar a Configuração**

Execute o script de teste:
```bash
node test-env.js
```

### 5. **Reiniciar o Servidor**
```bash
# Pare o servidor atual (Ctrl+C)
# Execute novamente:
npm run dev
```

## 🔍 Verificações Importantes

### ✅ Formato Correto do .env
```env
# CORRETO - sem espaços, sem aspas
VITE_SUPABASE_URL=https://projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# INCORRETO - com espaços ou aspas
VITE_SUPABASE_URL = "https://projeto.supabase.co"
VITE_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIs..."
```

### ✅ Localização do Arquivo
O arquivo `.env` deve estar na **raiz do projeto**, mesmo diretório do `package.json`:
```
tvdoutor-ads/
├── .env          ← AQUI
├── package.json
├── src/
└── ...
```

### ✅ Prefixo VITE_
Todas as variáveis que serão usadas no frontend devem começar com `VITE_`

## 🧪 Teste de Funcionamento

Após configurar corretamente, você deve ver:

1. **No Console do Navegador:**
   - ✅ Sem erros de "supabaseUrl is required"
   - ✅ Mensagens de inicialização do React

2. **Na Página:**
   - ✅ Landing page carregando normalmente
   - ✅ Ou redirecionamento para login

## 🆘 Solução de Problemas

### Problema: "supabaseUrl is required"
**Causa:** Variável `VITE_SUPABASE_URL` não configurada
**Solução:** Verifique se a variável está no arquivo `.env` sem aspas

### Problema: "Invalid API key"
**Causa:** Chave anônima incorreta
**Solução:** Copie novamente a chave do dashboard do Supabase

### Problema: "Failed to fetch"
**Causa:** URL do Supabase incorreta
**Solução:** Verifique se a URL está correta e sem espaços

### Problema: Servidor não reinicia
**Causa:** Erro de sintaxe no arquivo `.env`
**Solução:** Verifique se não há espaços extras ou caracteres especiais

## 📞 Suporte

Se o problema persistir:
1. Execute `node test-env.js` e compartilhe o resultado
2. Verifique o console do navegador (F12)
3. Confirme se o projeto Supabase está ativo
