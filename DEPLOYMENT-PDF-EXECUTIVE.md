# 🚀 Deployment - PDF Resumo Executivo

Este guia implementa sua especificação completa para transformar o PDF de listagem de telas em resumo executivo por cidade/UF/categoria/especialidade.

## ✅ MVP Executável Implementado

### 1. SQL (Views + RPC) ✅

**Arquivos criados:**
- `supabase/sql/v_proposal_items.sql` - View consolidada fonte única
- `supabase/sql/func_helpers.sql` - Funções period_label e array_distinct_nonempty  
- `supabase/sql/rpc_proposal_summary.sql` - RPC que retorna JSON consolidado

### 2. Edge Function ✅

**Arquivo criado:**
- `supabase/functions/pdf-proposal-pro/index.ts` - Função modificada para resumo executivo
- `supabase/functions/pdf-proposal-pro/deno.json` - Configuração Deno
- `supabase/functions/pdf-proposal-pro/README.md` - Documentação

### 3. Contrato de Payload ✅

**DB → Edge Function:** `proposal_summary(p_id)` retorna JSON consolidado
**Edge Function → Storage:** PDF salvo com `pdf_path` e `pdf_url` atualizados
**Front → Edge Function:** `{proposalId, logoUrl?}`

---

## 🎯 Comandos de Deployment

### Passo 1: Deploy SQL
```bash
# No Supabase SQL Editor ou psql, execute na ordem:

# 1. View consolidada
\i supabase/sql/v_proposal_items.sql

# 2. Funções helper
\i supabase/sql/func_helpers.sql

# 3. RPC de resumo
\i supabase/sql/rpc_proposal_summary.sql
```

### Passo 2: Deploy Edge Function
```bash
supabase functions deploy pdf-proposal-pro
```

### Passo 3: Teste Rápido
```bash
# Teste a RPC SQL
select public.proposal_summary(1); -- substitua 1 pelo ID real

# Teste a Edge Function
curl -X POST "https://YOUR-PROJECT.supabase.co/functions/v1/pdf-proposal-pro" \
  -H "Authorization: Bearer YOUR-SERVICE-KEY" \
  -H "Content-Type: application/json" \
  -d '{"proposalId": 1, "logoUrl": "https://example.com/logo.png"}'
```

---

## 📋 Checklist Visual "Proposta de Milhões"

### ✅ Design Implementado
- [x] **Capa** com logo grande + "Aos cuidados" + marca d'água leve
- [x] **Página "Resumo do Inventário"** com 4 linhas: Cidades/UFs/Categorias/Especialidades  
- [x] **Bloco "Período de Veiculação"**, "Especialidade", "Validade 30 dias" e "Aos Cuidados"
- [x] **Rodapé** com página X/Y + contato comercial
- [x] **Paleta**: primária #0EA5E9, escuro #111827, neutros #F3F4F6/#6B7280
- [x] **Tipos**: Helvetica (10–12 corpo, 16–20 títulos)
- [x] **Sem fotos clínicas**: usar hero leve (fundo) como nos PDFs

### ✅ Estrutura Comercial
- [x] **Negócio**: Escopo (onde e quanto) + condições comerciais
- [x] **Operação**: Snapshot + resumo no DB (imutabilidade)
- [x] **Performance**: PDF mais leve (sem listagem detalhada)
- [x] **Consistência**: Segue padrão "Praça/Especialidade/Período"

---

## 🔧 Integração com Frontend

### Chamada no Front (React/TypeScript)
```typescript
// Função helper no front
async function generateProPDF(proposalId: number, orgLogoUrl?: string) {
  const response = await fetch('/api/supabase/functions/pdf-proposal-pro', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`
    },
    body: JSON.stringify({
      proposalId,
      logoUrl: orgLogoUrl
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message)
  }

  // PDF será salvo automaticamente no storage
  const result = await response.json()
  return { ok: true, pdf_url: result.pdf_url }
}

// Uso
const { ok, pdf_url } = await generateProPDF(proposalId, orgLogoUrl)
if (ok) {
  window.open(pdf_url, '_blank') // Abrir PDF
}
```

### Adaptações no Wizard/Resumo
Trocar tabela detalhada por chips "Cidades", "UFs", "Categorias" e "Especialidades":

```typescript
// Em vez de listar todas as telas, mostrar resumos
const { data: summary } = await supabase.rpc('proposal_summary', { p_id: proposalId })

// Renderizar chips
<div className="summary-chips">
  <div className="chip-group">
    <span className="label">Cidades:</span>
    {summary.city_summary.map(city => (
      <Chip key={city.city}>{city.city} ({city.qty})</Chip>
    ))}
  </div>
  
  <div className="chip-group">
    <span className="label">Especialidades:</span>
    {summary.specialties.map(spec => (
      <Chip key={spec}>{spec}</Chip>
    ))}
  </div>
</div>
```

---

## 📊 Formato de Dados

### JSON retornado pela RPC
```json
{
  "header": {
    "id": 123,
    "customer_name": "Nestlé",
    "nome_agencia": "Publicis",
    "nome_projeto": "Materna 2024",
    "period_label": "Mensal",
    "cpm_mode": "blended",
    "cpm_value": 72.5,
    "discount_pct": 10,
    "discount_fixed": 0
  },
  "city_summary": [
    {"city": "São Paulo", "qty": 20},
    {"city": "Campinas", "qty": 10}
  ],
  "state_summary": [
    {"state": "SP", "qty": 30},
    {"state": "PE", "qty": 5}
  ],
  "category_summary": [
    {"category": "Hospital", "qty": 22},
    {"category": "Clínica", "qty": 13}
  ],
  "specialties": ["Cardiologia", "Cirurgia Geral", "Pediatria"],
  "totals": {
    "screens": 35,
    "cities": 3, 
    "states": 2,
    "categories": 2
  }
}
```

---

## 🚀 Próximas Iterações (Opcional)

Como mencionou, para a próxima versão podemos adicionar:

1. **QR code** para o mapa da seleção
2. **Seções dinâmicas** (defesa/benefícios) por "tipo de proposta"
3. **Templates** diferentes para "Projeto Especial", "Campanha Sazonal", etc.
4. **Gráficos** de distribuição geográfica
5. **Métricas** de audiência estimada

---

## 📞 Suporte

- **Documentação**: `supabase/functions/pdf-proposal-pro/README.md`
- **Script de teste**: `scripts/test-pdf-executive.sh` (Linux/macOS)
- **Linting**: Sem erros detectados ✅

**Status**: ✅ MVP executável pronto para produção!
