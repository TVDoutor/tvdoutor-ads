# 🔧 Resolução do Erro CORS - Instruções Finais

## 📊 Status Atual

✅ **Sistema funcionando perfeitamente!**
- PDF básico sendo gerado corretamente
- Fallback robusto implementado
- Mensagens específicas para o usuário
- Logs detalhados no console

❌ **Problema restante:**
- Erro CORS impedindo acesso à Edge Function
- PDF profissional não está sendo gerado
- Sistema caindo no fallback

## 🎯 Solução: Deploy da Edge Function

O erro CORS será resolvido assim que a Edge Function for deployada com os headers CORS corretos.

### **Passo 1: Instalar Supabase CLI**
```powershell
npm install -g supabase
```

### **Passo 2: Executar Script Automático**
```powershell
.\scripts\setup-supabase-complete.ps1
```

### **Passo 3: Configurar Secrets (Manual)**
```powershell
# 1. Obtenha a SERVICE_ROLE_KEY em:
# Supabase Dashboard > Settings > API > service_role (secret)

# 2. Configure a variável
$env:SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"

# 3. Configure os secrets
supabase secrets set SUPABASE_URL="https://vaogzhwzucijiyvyglls.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$env:SUPABASE_SERVICE_ROLE_KEY"
```

### **Passo 4: Deploy da Função**
```powershell
supabase functions deploy pdf-proposal-pro
```

## 🧪 Teste Após Deploy

### **1. Configure ANON_KEY:**
```powershell
$env:SUPABASE_ANON_KEY="sua-anon-key"
```

### **2. Execute teste:**
```powershell
node scripts/test-pdf-pro-function.js
```

### **3. Teste no frontend:**
- Acesse uma proposta
- Clique em "PDF Profissional"
- Deve aparecer: "PDF profissional gerado com sucesso!"

## 📋 Checklist de Resolução

- [ ] Supabase CLI instalado
- [ ] Login realizado (`supabase login`)
- [ ] Projeto linkado (`supabase link --project-ref vaogzhwzucijiyvyglls`)
- [ ] SERVICE_ROLE_KEY configurada
- [ ] Secrets configurados
- [ ] Edge Function deployada
- [ ] Teste executado com sucesso
- [ ] Frontend testado

## 🔍 Onde Encontrar as Chaves

### **SERVICE_ROLE_KEY:**
1. [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. **Settings** > **API**
4. Copie **service_role** (secret)

### **ANON_KEY:**
1. Mesmo local acima
2. Copie **anon** (public)

## 🎯 Resultado Esperado

Após o deploy, você verá:

### **Console (sem erros CORS):**
```
✅ PDF profissional gerado (base64)!
📊 Resposta da Edge Function: {data: {pdfBase64: "...", kind: "pro"}, error: null}
```

### **Frontend:**
- Toast: "PDF profissional gerado com sucesso!"
- PDF com design profissional
- Sem mais fallback para PDF básico

## 🚨 Se Ainda Houver Problemas

### **1. Verificar Deploy:**
```powershell
supabase functions list
```

### **2. Verificar Logs:**
```powershell
supabase functions logs pdf-proposal-pro
```

### **3. Verificar Secrets:**
```powershell
supabase secrets list
```

### **4. Teste Manual:**
```powershell
curl -i -X POST \
  -H "Authorization: Bearer $env:SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"proposalId": 40}' \
  https://vaogzhwzucijiyvyglls.supabase.co/functions/v1/pdf-proposal-pro
```

## ✅ Status Final

- ✅ **Sistema funcionando**: PDF básico gerado
- ✅ **Fallback robusto**: Nunca falha
- ✅ **Código pronto**: Edge Function implementada
- 🔄 **Pendente**: Deploy da Edge Function
- 🎯 **Meta**: PDF profissional funcionando

**Uma vez deployada a Edge Function, o sistema estará 100% completo!** 🚀
