# Correção dos Problemas de Geração de PDF

## Problemas Identificados

Baseado nos logs do console, foram identificados os seguintes problemas:

### 1. ❌ Erro de CORS
```
Access to fetch at ... from origin 'http://localhost:8080' has been blocked by CORS policy
```

### 2. ❌ Falha na Edge Function
```
FunctionsFetchError: Failed to send a request to the Edge Function
```

### 3. ❌ Referência Incorreta da Função
O frontend estava tentando chamar `pdf-proposal-pro` mas a nova função é `generate-pdf-proposal`

### 4. ❌ Erro de RLS na tabela admin_logs
```
[PostgrestError] {"message":"new row violates row-level security policy for table \"admin_logs\""}
```

## Correções Aplicadas

### 1. ✅ Correção da Função SQL

**Arquivo:** `supabase/migrations/20250131000017_create_get_proposal_details_function.sql`

**Problema:** Referência incorreta a `ci.city` em vez de `s.city`

**Correção:**
```sql
-- ANTES (incorreto)
SELECT jsonb_agg(
    jsonb_build_object(
        'city', ci.city,  -- ❌ ci não existe
        'state', ci.state,
        'screens_in_city', COUNT(s.id)
    )
)

-- DEPOIS (correto)
SELECT jsonb_agg(
    jsonb_build_object(
        'city', s.city,   -- ✅ s.city é correto
        'state', s.state,
        'screens_in_city', COUNT(s.id)
    )
)
```

### 2. ✅ Melhoria nos Headers CORS

**Arquivo:** `supabase/functions/generate-pdf-proposal/index.ts`

**Correção:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}
```

### 3. ✅ Correção da Referência da Edge Function

**Arquivo:** `src/lib/pdf.ts`

**Correção:**
```typescript
// ANTES
const { data, error } = await supabase.functions.invoke('pdf-proposal-pro', {

// DEPOIS  
const { data, error } = await supabase.functions.invoke('generate-pdf-proposal', {
```

### 4. ✅ Melhor Tratamento de Preflight CORS

**Correção:**
```typescript
if (req.method === 'OPTIONS') {
  console.log('✅ Respondendo preflight CORS');
  return new Response(null, { 
    status: 200,
    headers: corsHeaders 
  })
}
```

## Como Aplicar as Correções

### 1. Aplicar Migração SQL
```bash
supabase db push
```

### 2. Fazer Deploy da Edge Function
```bash
supabase functions deploy generate-pdf-proposal
```

### 3. Aplicar Correção de RLS
```bash
# A migração SQL já foi aplicada no passo 1, mas você pode verificar:
supabase db shell
# Execute: SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'admin_logs';
```

### 4. Verificar Logs
```bash
supabase functions logs generate-pdf-proposal
```

### 4. Testar no Frontend
- Acesse uma proposta existente
- Clique no botão "PDF Profissional"
- Verifique se não há mais erros de CORS no console

## Verificação de Funcionamento

### 1. Teste da Função SQL
```sql
-- Testar se a função existe e funciona
SELECT get_proposal_details(39); -- Use o ID da proposta que estava falhando
```

### 2. Teste da Edge Function
```bash
# Usar curl para testar
curl -X POST \
  https://seu-projeto.supabase.co/functions/v1/generate-pdf-proposal \
  -H "Authorization: Bearer SEU_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"proposalId": 39}'
```

### 3. Verificação no Console
Após as correções, você deve ver:
- ✅ "Respondendo preflight CORS"
- ✅ "Nova requisição recebida: POST"
- ✅ "Request body received"
- ✅ "Proposal ID extraído: 39"
- ✅ "Dados da proposta encontrados"
- ✅ "PDF gerado com sucesso!"

## Troubleshooting Adicional

### Se ainda houver problemas de CORS:

1. **Verificar origem:**
   ```javascript
   // No console do navegador
   console.log(window.location.origin);
   ```

2. **Testar com Postman/curl:**
   ```bash
   curl -X OPTIONS \
     https://seu-projeto.supabase.co/functions/v1/generate-pdf-proposal \
     -H "Origin: http://localhost:8080"
   ```

### Se a Edge Function não responder:

1. **Verificar logs:**
   ```bash
   supabase functions logs generate-pdf-proposal --follow
   ```

2. **Verificar variáveis de ambiente:**
   ```bash
   supabase secrets list
   ```

3. **Testar localmente:**
   ```bash
   supabase functions serve
   ```

## Status Esperado

Após aplicar todas as correções:

- ✅ CORS funcionando corretamente
- ✅ Edge Function respondendo
- ✅ PDF sendo gerado e salvo no Storage
- ✅ URL do PDF sendo retornada
- ✅ Frontend abrindo o PDF em nova aba

## Próximos Passos

1. Aplicar as correções usando o script `scripts/fix-pdf-generation.sh`
2. Testar a funcionalidade completa
3. Verificar se não há mais erros no console
4. Documentar qualquer problema adicional

---

**Nota:** Se persistirem problemas após estas correções, verifique:
- Permissões do bucket de Storage
- Configuração de RLS no Supabase
- Conectividade com o Supabase
- Versões das dependências
