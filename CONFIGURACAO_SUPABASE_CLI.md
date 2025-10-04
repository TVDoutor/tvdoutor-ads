# Configuração do Supabase CLI

## 🚀 Instalação do Supabase CLI

### **Windows (PowerShell):**
```powershell
# Instalar via npm
npm install -g supabase

# Ou via Chocolatey
choco install supabase

# Ou via Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### **Verificar Instalação:**
```powershell
supabase --version
```

## 🔧 Configuração do Projeto

### **1. Login no Supabase:**
```powershell
supabase login
```

### **2. Link do Projeto:**
```powershell
# Substitua YOUR_PROJECT_REF pelo ID do seu projeto
supabase link --project-ref YOUR_PROJECT_REF
```

### **3. Configurar Secrets:**
```powershell
# Obtenha a SERVICE_ROLE_KEY em: Supabase Dashboard > Settings > API
$env:SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key-aqui"

# Configure os secrets
supabase secrets set SUPABASE_URL="https://vaogzhwzucijiyvyglls.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$env:SUPABASE_SERVICE_ROLE_KEY"
```

### **4. Deploy da Edge Function:**
```powershell
supabase functions deploy pdf-proposal-pro
```

## 🧪 Teste da Função

### **1. Configure a ANON_KEY:**
```powershell
$env:SUPABASE_ANON_KEY="sua-anon-key"
```

### **2. Execute o teste:**
```powershell
node scripts/test-pdf-pro-function.js
```

## 📋 Checklist de Configuração

- [ ] Supabase CLI instalado
- [ ] Login realizado (`supabase login`)
- [ ] Projeto linkado (`supabase link`)
- [ ] Secrets configurados
- [ ] Edge Function deployada
- [ ] Teste executado com sucesso

## 🔍 Onde Encontrar as Chaves

### **SERVICE_ROLE_KEY:**
1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** > **API**
4. Copie a chave **service_role** (secret)

### **ANON_KEY:**
1. Mesmo local acima
2. Copie a chave **anon** (public)

### **PROJECT_REF:**
1. Na URL do dashboard: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
2. O `YOUR_PROJECT_REF` é o ID do projeto

## ⚠️ Importante

- **NUNCA** exponha a SERVICE_ROLE_KEY no frontend
- Use apenas ANON_KEY no frontend
- SERVICE_ROLE_KEY só deve ser usada na Edge Function

## 🎯 Resultado Esperado

Após o deploy, o erro CORS deve desaparecer e você verá:
- "PDF profissional gerado com sucesso!"
- PDF com design profissional
- Sem mais fallback para PDF básico
