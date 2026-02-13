# Demo: Criação de Usuário Admin com Docker

## ✅ Status Atual

A Edge Function foi criada com sucesso e está funcionando no Docker! 

## 🚀 Como Testar

### 1. Configurar Variáveis de Ambiente

Edite o arquivo `.env` e configure:

```env
SUPABASE_URL=https://vaoqzhwzucijjyyvgils.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-real-aqui
```

**Para obter a Service Role Key:**
1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard)
2. Vá para Settings > API
3. Copie a "service_role" key (não a "anon" key)

### 2. Executar o Teste

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\test-with-env.ps1
```

### 3. Ou testar com parâmetros customizados:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\test-with-env.ps1 -Email "novo@email.com" -Password "MinhaSenh@123" -FullName "João Silva" -Role "super_admin"
```

## 📋 O que o Script Faz

1. ✅ Verifica se Docker está rodando
2. ✅ Carrega variáveis de ambiente do arquivo .env
3. ✅ Constrói a imagem Docker da Edge Function
4. ✅ Executa o container com as variáveis de ambiente
5. ✅ Testa a função via HTTP POST
6. ✅ Exibe o resultado (sucesso ou erro)
7. ✅ Limpa os containers temporários

## 🎯 Resultado Esperado

Quando configurado corretamente, você verá:

```
SUCESSO!
ID: 12345678-1234-1234-1234-123456789abc
Email: publicidade3@tvdoutor.com.br
Nome: Maria Laura
Role: admin
Criado em: 2025-10-02T23:20:00.000Z
```

## 🔧 Alternativas de Uso

### Via Edge Function Deployada (Recomendado para Produção)

```bash
# Deploy da função
supabase functions deploy create-admin-user

# Chamar via HTTP
curl -X POST 'https://vaoqzhwzucijjyyvgils.supabase.co/functions/v1/create-admin-user' \
  -H 'Authorization: Bearer SEU_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "publicidade3@tvdoutor.com.br",
    "password": "Publi@2025!",
    "full_name": "Maria Laura",
    "role": "admin"
  }'
```

### Via Script Node.js Local

```bash
# Configurar variáveis
export VITE_SUPABASE_URL="https://vaoqzhwzucijjyyvgils.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"

# Executar
node scripts/create-admin-user-simple.js
```

## 🛡️ Segurança

- ✅ A função valida formato de email
- ✅ A função valida força da senha (mínimo 8 caracteres)
- ✅ A função valida roles permitidas (admin, super_admin)
- ✅ Usa Service Role Key para acesso completo ao banco
- ✅ Cria usuário em auth.users E profiles
- ✅ Limpa dados se houver erro na criação do perfil

## 🎉 Próximos Passos

1. Configure a Service Role Key no arquivo .env
2. Execute o teste para criar o usuário admin
3. Faça login na aplicação com as credenciais criadas
4. Verifique se o usuário tem as permissões corretas

A função está pronta para uso! 🚀
