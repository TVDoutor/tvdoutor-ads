# 🐳 Deploy da Edge Function via Docker

## ✅ Imagem Criada com Sucesso!

A imagem Docker da Edge Function `pdf-proposal-pro` foi criada com sucesso. Agora você precisa executar o container.

## 🔐 Configurar Variáveis de Ambiente

Primeiro, você precisa das credenciais do seu projeto Supabase:

### 1. Obter Credenciais do Supabase
- Acesse: https://supabase.com/dashboard
- Selecione seu projeto
- Vá em **Settings** → **API**
- Copie:
  - **Project URL** (SUPABASE_URL)
  - **service_role key** (SUPABASE_SERVICE_ROLE_KEY)

### 2. Executar Container (PowerShell)
```powershell
# Configure as variáveis (substitua pelos valores reais)
$env:SUPABASE_URL="https://vaoqzhwzucijjyyvgils.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key-aqui"

# Execute o container
docker run -d `
  --name pdf-proposal-pro `
  -p 8001:8000 `
  -e SUPABASE_URL="$env:SUPABASE_URL" `
  -e SUPABASE_SERVICE_ROLE_KEY="$env:SUPABASE_SERVICE_ROLE_KEY" `
  -e DENO_DEPLOYMENT_ID="docker-local" `
  --restart unless-stopped `
  pdf-proposal-pro
```

### 3. Verificar se Funcionou
```powershell
# Ver logs
docker logs pdf-proposal-pro

# Testar a função
curl -X POST http://localhost:8001 `
  -H "Content-Type: application/json" `
  -d '{"proposalId": 32}'
```

## 🎯 Como a Interface Vai Funcionar

Com o container rodando na porta 8001, a função `generateProPDF` no frontend vai automaticamente usar o endpoint local quando você estiver em desenvolvimento:

- **Development**: `http://localhost:8001` (Docker local)
- **Production**: URL do Supabase Functions

## 🔧 Comandos Úteis

```powershell
# Ver containers rodando
docker ps

# Parar o container
docker stop pdf-proposal-pro

# Ver logs em tempo real
docker logs -f pdf-proposal-pro

# Remover container
docker rm pdf-proposal-pro

# Refazer build se precisar
docker build -t pdf-proposal-pro ./supabase/functions/pdf-proposal-pro/
```

## 🌟 Vantagens do Docker

- ✅ **Isolamento**: Função roda em container separado
- ✅ **Consistência**: Mesmo ambiente em qualquer máquina
- ✅ **Deploy fácil**: Um comando para subir tudo
- ✅ **Logs centralizados**: `docker logs` para debug
- ✅ **Auto-restart**: Container reinicia automaticamente

## 🚀 Próximo Passo

Execute os comandos acima com suas credenciais reais do Supabase e teste a geração de PDF na interface web!

---

**Status**: ✅ Imagem Docker pronta, aguardando configuração das credenciais
