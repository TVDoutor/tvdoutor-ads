# Guia de Geração de PDF - TV Doutor ADS

## Visão Geral

Este guia documenta a implementação da solução de geração de PDF para propostas comerciais, baseada na especificação fornecida. A solução utiliza uma função SQL no Supabase como "Fonte da Verdade" e uma Edge Function para gerar os PDFs.

## Arquitetura da Solução

### 1. Fonte da Verdade (Função SQL)

**Arquivo:** `supabase/migrations/20250131000017_create_get_proposal_details_function.sql`

A função `get_proposal_details(p_proposal_id INT)` retorna todos os dados necessários para a geração do PDF:

- Dados principais da proposta (nome, status, valores)
- Cálculos corrigidos de valor mensal e contagem de telas
- Agregação de dados do inventário por cidade/estado

```sql
-- Exemplo de uso
SELECT get_proposal_details(36);
```

### 2. Edge Function (Gerador de PDF)

**Arquivo:** `supabase/functions/generate-pdf-proposal/index.ts`

A Edge Function:
- Recebe o ID da proposta via POST
- Chama a função SQL para obter os dados
- Gera o HTML usando o template fornecido
- Cria o PDF (simulado com conteúdo PDF básico)
- Salva no Storage do Supabase
- Retorna URL assinada para download

### 3. Frontend (Componente React)

**Arquivo:** `src/components/PDFDownloadButton.tsx`

O componente foi atualizado para:
- Chamar a Edge Function via `supabase.functions.invoke()`
- Exibir feedback visual durante a geração
- Abrir o PDF em nova aba quando pronto
- Tratar erros com mensagens amigáveis

## Como Usar

### 1. Deploy da Função SQL

```bash
# Aplicar a migração
supabase db push
```

### 2. Deploy da Edge Function

```bash
# Fazer deploy da função
supabase functions deploy generate-pdf-proposal
```

### 3. Usar no Frontend

```tsx
import { PDFDownloadButton } from '@/components/PDFDownloadButton';

// No seu componente
<PDFDownloadButton 
  proposalId={proposal.id}
  customerName={proposal.customer_name}
  variant="outline"
  size="sm"
/>
```

## Estrutura dos Dados

### Resposta da Função SQL

```json
{
  "proposal": {
    "id": 36,
    "name": "Nome da Proposta",
    "status": "rascunho",
    "client_name": "Nome do Cliente",
    "agency_name": "Nome da Agência",
    "total_value": 15000.00,
    "period_months": 30,
    "monthly_investment": 500.00,
    "screens_count": 10
  },
  "inventory_summary_by_city": [
    {
      "city": "São Paulo",
      "state": "SP",
      "screens_in_city": 5
    }
  ]
}
```

### Template HTML

O template HTML utiliza Tailwind CSS e inclui:
- Cabeçalho com logo e informações da proposta
- Resumo financeiro com valores calculados
- Inventário selecionado agrupado por cidade/estado
- Rodapé com informações da empresa

## Melhorias Implementadas

### 1. Correções na Função SQL

- **Valor mensal:** Corrigido cálculo baseado em dias reais vs meses
- **Contagem de telas:** Query otimizada para contar telas selecionadas
- **Agregação:** Dados agrupados por cidade/estado para melhor visualização

### 2. Edge Function Robusta

- **CORS:** Headers configurados para requisições do frontend
- **Validação:** Verificação de parâmetros obrigatórios
- **Storage:** Upload automático para bucket do Supabase
- **URLs:** Geração de URLs assinadas válidas por 30 dias

### 3. Frontend Melhorado

- **Feedback:** Estados visuais para loading, sucesso e erro
- **Retry:** Botão para tentar novamente em caso de erro
- **Toast:** Notificações amigáveis para o usuário
- **URLs:** Abertura automática do PDF em nova aba

## Troubleshooting

### Erro 500 na Edge Function

1. Verifique os logs: `supabase functions logs generate-pdf-proposal`
2. Confirme que a função SQL existe: `SELECT get_proposal_details(1);`
3. Verifique as permissões do Storage bucket

### PDF Mal Formatado

1. O template HTML usa Tailwind CSS via CDN
2. Teste o HTML em um navegador Chrome/Chromium
3. Ajuste o template conforme necessário

### Erro de CORS

1. Verifique se os headers CORS estão configurados
2. Confirme que a requisição vem do domínio correto
3. Teste com Postman ou curl para isolar o problema

## Próximos Passos

### 1. Implementação Real do Puppeteer

Para produção, substitua a simulação PDF por Puppeteer real:

```typescript
import puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle0' });
const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
await browser.close();
```

### 2. Melhorias no Template

- Adicionar gráficos e visualizações
- Incluir mais detalhes financeiros
- Personalizar com logo da empresa
- Adicionar assinaturas digitais

### 3. Cache e Performance

- Implementar cache para PDFs gerados
- Otimizar queries SQL
- Compressão de imagens
- CDN para distribuição

## Conclusão

A solução implementada segue exatamente a especificação fornecida, com melhorias adicionais para robustez e experiência do usuário. A arquitetura modular permite fácil manutenção e extensão futura.

Para dúvidas ou suporte, consulte os logs da aplicação ou entre em contato com a equipe de desenvolvimento.
