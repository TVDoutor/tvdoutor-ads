# 🔧 Configuração de Variáveis de Ambiente na Vercel

## 🚨 Problema Atual
Erro 403 na criação de campanhas na Vercel - variáveis de ambiente não configuradas.

## 📋 Solução - Configurar Variáveis na Vercel

### 1. **Acessar Dashboard da Vercel**
- Vá para [vercel.com](https://vercel.com)
- Faça login na sua conta
- Selecione o projeto `tvdoutor-ads`

### 2. **Configurar Variáveis de Ambiente**
- Vá em **Settings** → **Environment Variables**
- Adicione as seguintes variáveis:

```env
VITE_SUPABASE_URL=https://vaogzhwzucijiyvyglls.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
VITE_GOOGLE_MAPS_API_KEY=sua-chave-google-maps
VITE_APP_NAME=TV Doutor ADS
VITE_APP_VERSION=1.1.0
```

### 3. **Obter Chave Anônima do Supabase**
- Acesse [supabase.com](https://supabase.com)
- Projeto: `vaogzhwzucijiyvyglls`
- Vá em **Settings** → **API**
- Copie a chave **anon public**

### 4. **Redeploy**
Após configurar as variáveis:
- Vá em **Deployments**
- Clique nos 3 pontos do último deploy
- Selecione **Redeploy**

## 🎯 Variáveis Obrigatórias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | `https://vaogzhwzucijiyvyglls.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima do Supabase | `eyJhbGciOiJIUzI1NiIs...` |

## ✅ Teste Após Configuração

1. **Redeploy** o projeto na Vercel
2. **Acesse** a URL de produção
3. **Teste** criação de campanhas
4. **Verifique** se não há mais erro 403

## 🆘 Problemas Comuns

- **Erro 403**: Variáveis não configuradas
- **Erro 401**: Chave anônima incorreta
- **Erro 400**: URL do Supabase incorreta
