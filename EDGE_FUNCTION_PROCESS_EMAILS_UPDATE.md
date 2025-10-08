# 📧 Atualização da Edge Function: process-pending-emails

## 📋 Resumo das Mudanças

A Edge Function `process-pending-emails` foi modificada para ser mais robusta e flexível, permitindo chamadas sem autenticação durante o signup.

## ✅ Funcionalidades Implementadas

### 1. **Autenticação Opcional com Fallback**

A função agora suporta dois modos de operação:

#### Modo Autenticado (com JWT Token)
```typescript
// Quando há um header Authorization com Bearer token
if (authHeader && authHeader.startsWith('Bearer ')) {
  // Valida o token JWT
  // Se válido: usa cliente autenticado
  // Se inválido: faz fallback para Service Role
}
```

#### Modo Service Role (sem autenticação)
```typescript
// Quando não há token JWT (ex: durante signup)
else {
  // Usa Service Role Key para operações admin
  console.log('🔑 Nenhum token JWT fornecido, usando Service Role para operações admin')
}
```

### 2. **Tratamento de Erros Robusto**

#### Validação de Variáveis de Ambiente
- Verifica `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- Retorna erro detalhado se alguma estiver faltando

#### Parsing de JSON Seguro
```typescript
try {
  requestBody = await req.json()
} catch (e) {
  // Retorna erro 400 com detalhes do problema
}
```

#### Validação de Parâmetros
- Verifica se o parâmetro `action` foi fornecido
- Valida se a ação é reconhecida
- Retorna lista de ações válidas no erro

#### Erros de Banco de Dados Detalhados
```typescript
console.error('❌ Erro ao buscar emails pendentes:', {
  message: fetchError.message,
  code: fetchError.code,
  details: fetchError.details,
  hint: fetchError.hint
})
```

#### Processamento Individual com Fallback
- Cada email é processado individualmente
- Se falhar, marca o email como `failed` no banco
- Continua processando os próximos emails
- Registra todos os erros para análise

### 3. **Logs Aprimorados**

#### Logs de Autenticação
```
🔑 Usando token JWT do usuário
✅ Token JWT válido para usuário: user@example.com
⚠️ Token JWT inválido ou expirado, usando Service Role
🔑 Nenhum token JWT fornecido, usando Service Role para operações admin
```

#### Logs de Processamento
```
🔄 Iniciando processamento de emails pendentes...
📤 [1/5] Processando email ID 123 para: customer@example.com
   Tipo: proposal, Assunto: Nova proposta disponível
✅ Email ID 123 processado com sucesso
ℹ️ Nenhum email pendente para processar
```

#### Logs de Erro
```
❌ Erro ao buscar emails pendentes: { message, code, details, hint }
❌ Erro crítico na Edge Function: { error, message, stack }
```

## 📊 Estrutura de Resposta

### GET /process-pending-emails
Lista emails pendentes:
```json
{
  "success": true,
  "data": [...],
  "count": 5,
  "timestamp": "2025-10-08T12:00:00.000Z"
}
```

### POST /process-pending-emails
```json
{
  "action": "process"
}
```

Resposta:
```json
{
  "success": true,
  "processed": 5,
  "successful": 4,
  "failed": 1,
  "errors": [
    {
      "emailId": 123,
      "error": "Erro ao atualizar status"
    }
  ],
  "message": "Processados 5 emails: 4 sucessos, 1 falhas",
  "timestamp": "2025-10-08T12:00:00.000Z"
}
```

### Erros
```json
{
  "success": false,
  "error": "Descrição do erro",
  "details": "Detalhes adicionais",
  "code": "ERROR_CODE",
  "timestamp": "2025-10-08T12:00:00.000Z"
}
```

## 🔐 Segurança

### Service Role Key
- ✅ Usado quando não há autenticação (signup)
- ✅ Usado como fallback quando JWT é inválido
- ✅ Permite operações admin sem autenticação de usuário

### Validação de JWT
- ✅ Valida token quando fornecido
- ✅ Verifica usuário com `getUser(token)`
- ✅ Fallback seguro para Service Role

### CORS
- ✅ Headers CORS configurados para '*'
- ✅ Suporte a OPTIONS preflight
- ✅ Headers permitidos: authorization, apikey, content-type, x-requested-with

## 🚀 Como Usar

### Durante o Signup (sem autenticação)
```javascript
const response = await fetch(
  'https://your-project.supabase.co/functions/v1/process-pending-emails',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'process' })
  }
)
```

### Com Autenticação (usuário logado)
```javascript
const response = await fetch(
  'https://your-project.supabase.co/functions/v1/process-pending-emails',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({ action: 'process' })
  }
)
```

## 📝 Variáveis de Ambiente Necessárias

Certifique-se de que estas variáveis estão configuradas no Supabase:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

## 🔄 Deploy

Para fazer deploy da função atualizada:

```bash
# Deploy da função
supabase functions deploy process-pending-emails

# Verificar logs
supabase functions logs process-pending-emails --tail
```

## ⚠️ Observações Importantes

1. **Simulação de Envio**: A função atualmente simula o envio de emails. Para implementar envio real, integre com SendGrid, Resend ou outro serviço de email.

2. **Status de Emails**: A função atualiza o status dos emails para:
   - `sent`: Email processado com sucesso
   - `failed`: Erro ao processar email

3. **Performance**: A função processa emails sequencialmente. Para alto volume, considere implementar processamento em lote ou paralelo.

4. **Monitoramento**: Use os logs para monitorar o processamento e identificar problemas.

## 🐛 Troubleshooting

### Erro: "Configuração do servidor incompleta"
- Verifique se as variáveis de ambiente estão configuradas corretamente

### Erro: "Token JWT inválido ou expirado"
- Token será automaticamente substituído por Service Role
- Verifique os logs para detalhes

### Erro ao buscar/atualizar emails
- Verifique as permissões RLS na tabela `email_logs`
- Service Role deve ter acesso total

## 📚 Referências

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Service Role Key](https://supabase.com/docs/guides/api#the-service_role-key)

