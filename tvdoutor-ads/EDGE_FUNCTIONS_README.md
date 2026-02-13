# Edge Functions para Sistema de Emails

Este documento explica como as Edge Functions foram implementadas para resolver os problemas de permissões RLS no sistema de emails.

## 🚀 Edge Functions Criadas

### 1. `process-pending-emails`
**Endpoint**: `https://[seu-projeto].supabase.co/functions/v1/process-pending-emails`

**Funcionalidades**:
- **GET**: Busca emails pendentes para processamento
- **POST**: Processa emails pendentes em lote

**Métodos**:
```typescript
// Buscar emails pendentes
GET /functions/v1/process-pending-emails

// Processar emails pendentes
POST /functions/v1/process-pending-emails
{
  "action": "process"
}
```

### 2. `email-stats`
**Endpoint**: `https://[seu-projeto].supabase.co/functions/v1/email-stats`

**Funcionalidades**:
- **GET**: Retorna estatísticas de emails (total, hoje, últimos 7 dias)

**Métodos**:
```typescript
// Buscar estatísticas
GET /functions/v1/email-stats
```

### 3. `project-milestones`
**Endpoint**: `https://[seu-projeto].supabase.co/functions/v1/project-milestones`

**Funcionalidades**:
- **GET**: Busca marcos de projeto
- **POST**: Cria novo marco
- **PUT**: Atualiza marco existente
- **DELETE**: Remove marco

**Métodos**:
```typescript
// Buscar marcos
GET /functions/v1/project-milestones?projeto_id=123&agencia_id=456

// Criar marco
POST /functions/v1/project-milestones
{
  "agencia_id": "uuid",
  "projeto_id": "uuid",
  "nome_marco": "Kick-off",
  "descricao": "Descrição do marco",
  "data_prevista": "2025-01-30",
  "status": "pendente",
  "ordem": 1
}

// Atualizar marco
PUT /functions/v1/project-milestones
{
  "id": "uuid",
  "nome_marco": "Kick-off Atualizado",
  "status": "concluido"
}

// Deletar marco
DELETE /functions/v1/project-milestones?id=uuid
```

### 4. `marco-templates`
**Endpoint**: `https://[seu-projeto].supabase.co/functions/v1/marco-templates`

**Funcionalidades**:
- **GET**: Retorna lista de nomes únicos de marcos para usar como templates

**Métodos**:
```typescript
// Buscar templates de marcos
GET /functions/v1/marco-templates
```

## 🔧 Como Fazer Deploy

### Opção 1: Script Automático
```bash
chmod +x deploy-edge-functions.sh
./deploy-edge-functions.sh
```

### Opção 2: Manual
```bash
# Deploy da função de processamento
supabase functions deploy process-pending-emails

# Deploy da função de estatísticas
supabase functions deploy email-stats
```

## 🔑 Configuração de Variáveis de Ambiente

As Edge Functions precisam das seguintes variáveis de ambiente no Supabase:

```bash
SUPABASE_URL=https://[seu-projeto].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[sua-service-role-key]
```

## 📊 Vantagens da Implementação

### ✅ **Problemas Resolvidos**:
1. **Erros 403 Forbidden**: As Edge Functions usam `SUPABASE_SERVICE_ROLE_KEY` que bypassa RLS
2. **Permissões RLS**: Não há mais dependência de políticas RLS complexas
3. **Performance**: Processamento em lote no servidor
4. **Segurança**: Chaves de serviço são mais seguras que tokens de usuário

### 🔄 **Fluxo Atualizado**:
```
Cliente (Frontend) 
    ↓
Edge Function (Servidor)
    ↓
Supabase Database (com Service Role)
    ↓
Resposta para Cliente
```

## 🧪 Testando as Edge Functions

### 1. Teste via Dashboard do Supabase
- Acesse: https://supabase.com/dashboard/project/[seu-projeto]/functions
- Clique em "Invoke" para testar cada função

### 2. Teste via cURL
```bash
# Buscar emails pendentes
curl -X GET "https://[seu-projeto].supabase.co/functions/v1/process-pending-emails" \
  -H "Authorization: Bearer [seu-anon-key]"

# Processar emails pendentes
curl -X POST "https://[seu-projeto].supabase.co/functions/v1/process-pending-emails" \
  -H "Authorization: Bearer [seu-anon-key]" \
  -H "Content-Type: application/json" \
  -d '{"action": "process"}'

# Buscar estatísticas
curl -X GET "https://[seu-projeto].supabase.co/functions/v1/email-stats" \
  -H "Authorization: Bearer [seu-anon-key]"
```

## 📝 Logs e Monitoramento

### Visualizar Logs:
```bash
# Logs da função de processamento
supabase functions logs process-pending-emails

# Logs da função de estatísticas
supabase functions logs email-stats
```

### Dashboard do Supabase:
- Acesse: https://supabase.com/dashboard/project/[seu-projeto]/functions
- Clique em cada função para ver logs e métricas

## 🔄 Migração do Código

O arquivo `src/lib/email-service.ts` foi atualizado para usar as Edge Functions:

### Antes (Acesso Direto):
```typescript
const { data, error } = await supabase
  .from('email_logs')
  .select('*')
  .eq('status', 'pending')
```

### Depois (Edge Function):
```typescript
const { data, error } = await supabase.functions.invoke('process-pending-emails', {
  method: 'GET',
  body: {}
})
```

## 🚨 Troubleshooting

### Erro: "Function not found"
- Verifique se as funções foram deployadas corretamente
- Confirme se o nome da função está correto

### Erro: "Permission denied"
- Verifique se `SUPABASE_SERVICE_ROLE_KEY` está configurada
- Confirme se a chave tem as permissões necessárias

### Erro: "CORS"
- As funções já incluem headers CORS adequados
- Verifique se não há conflitos com outros headers

## 📈 Próximos Passos

1. **Integração com Resend**: Substituir simulação por envio real de emails
2. **Rate Limiting**: Implementar controle de taxa para evitar spam
3. **Retry Logic**: Adicionar lógica de retry para emails falhados
4. **Monitoring**: Implementar alertas para falhas de processamento
5. **Batch Processing**: Otimizar processamento em lotes maiores

## 🔗 Links Úteis

- [Documentação Edge Functions](https://supabase.com/docs/guides/functions)
- [Service Role Keys](https://supabase.com/docs/guides/auth/service-role-key)
- [CORS Configuration](https://supabase.com/docs/guides/functions/cors)
