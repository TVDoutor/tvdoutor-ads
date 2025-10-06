# 🚨 CORREÇÃO URGENTE - Arquivo .env

## ⚠️ **PROBLEMA CRÍTICO IDENTIFICADO**

O arquivo `.env` atual tem a `SUPABASE_SERVICE_ROLE_KEY` configurada com um valor placeholder:
```
SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"
```

**Isso está causando os erros 401 Unauthorized nas Edge Functions!**

## 🔧 **SOLUÇÃO IMEDIATA**

### 1. **Obter a Chave Real do Supabase**

1. Acesse: https://supabase.com/dashboard/project/vaogzhwzucijiyvyglls
2. Vá em **Settings** → **API**
3. Copie a chave **"service_role"** (não a anon key)
4. A chave deve começar com `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 2. **Atualizar o Arquivo .env**

Substitua esta linha no arquivo `.env`:
```env
# ANTES (INCORRETO):
SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"

# DEPOIS (CORRETO):
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sua_chave_real_aqui
```

### 3. **Configuração Completa do .env**

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://vaogzhwzucijiyvyglls.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_NgqtM9lDxmuihvScJ9V-NA_1Qz7blee
SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_SERVICE_ROLE_REAL_AQUI

# Google Maps API Configuration
VITE_GOOGLE_MAPS_API_KEY=AIzaSyDzLEDOq1CbnfG5eNFWg6xQURMfURggZPA

# Email Service Configuration (Resend)
RESEND_API_KEY=re_HcsregrU_LD4JiZpuWpLv7mvRdMtbQqkR

# Other configurations
VITE_APP_NAME=TV Doutor ADS
VITE_APP_VERSION=1.0.2

# Configurações para o Docker da Edge Function
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_NgqtM9lDxmuihvScJ9V-NA_1Qz7blee
DENO_DEPLOYMENT_ID=docker-local
```

## 🎯 **RESULTADO ESPERADO**

Após corrigir a `SUPABASE_SERVICE_ROLE_KEY`:

✅ **Erros 401 Unauthorized** nas Edge Functions serão resolvidos
✅ **Processamento de emails** funcionará corretamente  
✅ **Cadastro de usuários** funcionará sem erros 500
✅ **Console limpo** sem erros de autenticação

## 🔍 **Como Verificar se Funcionou**

1. Reinicie o servidor: `npm run dev`
2. Abra o console do navegador (F12)
3. Tente fazer um cadastro de usuário
4. Verifique se não há mais erros 401 ou 500

## 📞 **Se Ainda Houver Problemas**

1. Verifique se a chave service_role está correta
2. Confirme se o projeto Supabase está ativo
3. Teste as Edge Functions no dashboard do Supabase

---

**⚠️ IMPORTANTE:** Esta correção é crítica para o funcionamento das Edge Functions e processamento de emails!
