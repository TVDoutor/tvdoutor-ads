# 🎯 Deployment - PDF Profissional de Propostas

## ✅ Sistema Implementado

### 📋 Blueprint Profissional Completo

**Páginas & Seções (implementadas):**
1. **Capa** — Logo, título, cliente, cidade, data, investimento total destacado
2. **Resumo Executivo** — Objetivos, highlights (alcance, telas, período, investimento)
3. **Investimento** — Tabela detalhada com totais, descontos e valor final
4. **Cronograma & SLA** — Datas-chave, lead time, contatos
5. **Termos Comerciais** — Validade, faturamento, impostos, logística
6. **Aceite** — Bloco para assinatura física
7. **Anexos** — QR code para mapa interativo (quando >25 telas)

**Identidade Visual:**
- ✅ **Tipografia**: Helvetica (texto), Helvetica Bold (títulos)
- ✅ **Paleta**: #0EA5E9 (primária), #111827 (escuro), #F3F4F6/#6B7280 (neutros)
- ✅ **Layout**: Margens A4 24mm, cabeçalho/rodapé com paginação e marca d'água

---

## 🚀 Comandos de Deployment

### 1. SQL - Deploy das estruturas de dados
```bash
# No Supabase SQL Editor, execute na ordem:

# 1. View otimizada para PDF
\i supabase/sql/v_proposal_pdf.sql

# 2. Tabela de snapshots + função imutável
\i supabase/sql/proposal_snapshots_table.sql
```

### 2. Edge Function - Deploy da função profissional
```bash
supabase functions deploy pdf-proposal-pro
```

### 3. Frontend - Integração com React
```bash
# Arquivo já criado: src/lib/pdf.ts
# Uso direto no componente:

import { PDFGenerateButton } from '@/lib/pdf'

<PDFGenerateButton 
  proposalId={proposalId}
  logoUrl="https://seulogo.com/logo.png"
  onSuccess={(result) => console.log('PDF gerado:', result.pdf_url)}
/>
```

---

## 🧪 Teste Completo

### Teste Rápido via curl
```bash
curl -X POST "https://YOUR-PROJECT.supabase.co/functions/v1/pdf-proposal-pro" \
  -H "Authorization: Bearer YOUR-SERVICE-KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "proposalId": 1, 
    "logoUrl": "https://via.placeholder.com/200x80/0EA5E9/FFFFFF?text=LOGO"
  }'
```

### Teste no Frontend
```typescript
import { generateProPDF, openPDF } from '@/lib/pdf'

// Gerar e abrir PDF
const handleGeneratePDF = async () => {
  const result = await generateProPDF(proposalId, logoUrl)
  
  if (result.ok && result.pdf_url) {
    openPDF(result.pdf_url, `proposta-${proposalId}.pdf`)
    
    // PDF foi salvo automaticamente no storage
    console.log('PDF salvo em:', result.pdf_path)
  }
}
```

---

## 📊 Estrutura de Dados

### Snapshot Imutável (make_proposal_snapshot)
```json
{
  "header": {
    "id": 123,
    "customer_name": "Nestlé Brasil",
    "nome_agencia": "Publicis",
    "nome_projeto": "Materna 2024",
    "city": "São Paulo",
    "created_at": "2024-01-15",
    "cpm_mode": "blended",
    "cpm_value": 75.50,
    "discount_pct": 10,
    "discount_fixed": 1000
  },
  "items": [
    {
      "screen_id": 456,
      "code": "SP001",
      "screen_name": "Hospital Albert Einstein - Recepção",
      "city": "São Paulo",
      "state": "SP",
      "category": "Hospital",
      "base_daily_traffic": 5000,
      "effective_cpm": 75.50,
      "screen_value": 377.50
    }
  ]
}
```

### Resposta da Edge Function
```json
{
  "ok": true,
  "pdf_url": "https://project.supabase.co/storage/v1/object/sign/proposals/pdf/proposal_123_professional.pdf?token=...",
  "pdf_path": "pdf/proposal_123_professional.pdf"
}
```

---

## 🎨 Características Visuais Profissionais

### ✅ Capa Impactante
- Logo da empresa (quando fornecido)
- Investimento total destacado em azul (#0EA5E9)
- Marca d'água "TV DOUTOR ADS" discreta em rotação
- Informações essenciais: cliente, projeto, agência, data

### ✅ Resumo Executivo com Bullets
- Telas selecionadas, audiência estimada
- CPM médio e modo (manual/automático)
- Cálculo de investimento bruto → líquido
- Período de veiculação (se definido)
- Caixa de observação com bordas coloridas

### ✅ Tabela de Investimento Profissional
- Cabeçalho com fundo cinza claro
- Linhas zebradas para legibilidade
- Alinhamento numérico correto
- Paginação automática para muitas telas
- Totais destacados em caixa colorida

### ✅ Cronograma & SLA Detalhado
- Início previsto, entrega de arte, validação
- SLA de publicação (48h)
- Validade da proposta (15 dias)
- Contatos organizados (comercial, ops, suporte)

### ✅ Seção de Aceite Formal
- Termos comerciais completos
- Linhas para assinatura física
- Campos para nome, cargo, CPF/CNPJ
- Layout profissional para impressão

### ✅ Anexos Inteligentes
- QR code placeholder para mapa interativo
- Link direto para visualização online
- Apenas quando há muitas telas (>25)

---

## 🔧 Personalização

### Logos Personalizados
```typescript
// No componente React
<PDFGenerateButton 
  proposalId={123}
  logoUrl="https://cliente.com/logo-empresa.png"  // PNG ou JPG
/>
```

### Variáveis de Ambiente
```bash
# .env.local
VITE_SUPABASE_URL=https://projeto.supabase.co
VITE_SUPABASE_SERVICE_KEY=eyJ...
VITE_SUPABASE_FUNCTIONS_URL=https://projeto.supabase.co/functions/v1
```

---

## 📈 Vantagens do Sistema

### 🎯 **Negócios**
- **Impacto Visual**: PDF "proposta de milhões" com design profissional
- **Credibilidade**: Marca d'água, termos claros, seção de aceite formal
- **Eficiência**: Geração automática, sem intervenção manual

### ⚡ **Técnico**
- **Imutabilidade**: Snapshots garantem consistência histórica
- **Performance**: PDF-lib nativo, sem dependências pesadas
- **Storage**: Integração automática com Supabase Storage
- **Rastreabilidade**: URLs assinadas, logs de geração

### 🎨 **Design**
- **Marca consistente**: Paleta TV Doutor ADS aplicada
- **Tipografia profissional**: Helvetica, tamanhos hierárquicos
- **Layout responsivo**: Paginação automática, quebras inteligentes
- **Elementos visuais**: Gradientes, bordas, marca d'água discreta

---

## 📞 Suporte e Manutenção

- **Logs**: Verifique no Supabase Functions → pdf-proposal-pro
- **Storage**: Bucket `proposals/pdf/` para todos os PDFs
- **Debugging**: Console do navegador para erros frontend
- **Snapshots**: Tabela `proposal_snapshots` para histórico

**Status**: ✅ Sistema profissional pronto para produção!

Este PDF agora tem a qualidade visual e estrutura de uma proposta de milhões, com todas as seções essenciais para fechamento de negócios de alto valor.
