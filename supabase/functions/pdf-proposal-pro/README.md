# PDF Proposal Pro - Resumo Executivo

Esta Edge Function gera PDFs executivos para propostas, focando em resumos por cidade/UF/categoria/especialidade em vez de listar telas individuais.

## Características

- **Design limpo**: Sem tabelas de telas, apenas resumos agregados
- **Estrutura profissional**: Capa + Resumo + Condições Comerciais + Contatos
- **Paleta de cores**: #0EA5E9 (primária), #111827 (escuro), tons neutros
- **Tipografia**: Inter/Helvetica 10-12pt corpo, 16-20pt títulos
- **Layout**: Espelha os modelos "Praça/Especialidade/Período de Veiculação"

## Dependências SQL

Antes de usar esta função, execute os scripts SQL na ordem:

1. `supabase/sql/v_proposal_items.sql` - View consolidada
2. `supabase/sql/func_helpers.sql` - Funções helper (period_label, array_distinct_nonempty)  
3. `supabase/sql/rpc_proposal_summary.sql` - RPC que retorna JSON consolidado

## Deploy

```bash
supabase functions deploy pdf-proposal-pro
```

## Uso

```bash
curl -X POST "https://<PROJECT>.supabase.co/functions/v1/pdf-proposal-pro" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"proposalId": 123, "logoUrl": "https://example.com/logo.png"}'
```

## Parâmetros

- `proposalId` (obrigatório): ID da proposta
- `logoUrl` (opcional): URL do logo da organização

## Retorno

- **Sucesso**: PDF binário pronto para download
- **Erro**: JSON com detalhes do erro

## Estrutura do PDF

1. **Capa**: Cliente, Projeto, Agência, Período de Veiculação
2. **Resumo Executivo**: Agregações por cidade/UF/categoria/especialidade
3. **Condições Comerciais**: CPM, descontos, validade
4. **Contatos**: "Aos Cuidados", praças, especialidades

## Payload JSON (DB → Edge Function)

A função `proposal_summary(p_id)` retorna:

```json
{
  "header": {
    "customer_name": "Cliente",
    "nome_agencia": "Agência", 
    "nome_projeto": "Projeto",
    "period_label": "Mensal",
    "cpm_mode": "blended",
    "cpm_value": 72.5
  },
  "city_summary": [{"city": "São Paulo", "qty": 20}],
  "state_summary": [{"state": "SP", "qty": 30}],
  "category_summary": [{"category": "Hospital", "qty": 15}],
  "specialties": ["Cardiologia", "Pediatria"],
  "totals": {"screens": 35, "cities": 3, "states": 2}
}
```

## Storage

O PDF é automaticamente salvo em:
- **Bucket**: `proposals` 
- **Arquivo**: `proposta-executiva-{id}-{timestamp}.pdf`
- **Update**: Campos `pdf_path` e `pdf_url` na tabela `proposals`
