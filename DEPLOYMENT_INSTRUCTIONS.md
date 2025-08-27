# Instruções de Implantação - TVDoutor ADS

## 📋 Resumo das Implementações

Este documento descreve as funcionalidades implementadas conforme o plano detalhado:

### ✅ Funcionalidades Implementadas

1. **Mapa Interativo com Mapbox GL**
   - Edge Function para token seguro
   - Marcadores reais baseados na tabela `screens`
   - Filtros por cidade, status e classe
   - Popup com detalhes das telas
   - Contagem de telas com coordenadas inválidas

2. **Sistema de Campanhas**
   - Tabelas `campaigns` e `campaign_screens` com RLS
   - Página de listagem com filtros
   - Página de detalhes com gestão de telas
   - CRUD completo para campanhas

3. **Relatórios com Dados Reais**
   - KPIs baseados em dados reais (telas ativas, propostas, taxa de aprovação)
   - Gráficos de propostas por mês
   - Distribuição de telas por cidade
   - Top clientes por número de propostas

## 🚀 Passos para Implantação

### 1. Executar Migrações do Banco

Execute a migração SQL para criar as tabelas de campanhas:

```bash
# No diretório do projeto
supabase db push
```

Ou execute manualmente o arquivo:
- `supabase/migrations/20250126000000_create_campaigns_tables.sql`

### 2. Implantar Edge Function

```bash
# Implantar a função mapbox-token
supabase functions deploy mapbox-token
```

### 3. Configurar Secrets

No painel do Supabase:

1. Acesse **Edge Functions → Secrets**
2. Adicione o secret:
   - **Nome**: `MAPBOX_PUBLIC_TOKEN`
   - **Valor**: Seu token público do Mapbox

### 4. Obter Token do Mapbox

1. Acesse [mapbox.com](https://mapbox.com)
2. Crie uma conta ou faça login
3. Vá em **Account → Access Tokens**
4. Copie o **Default Public Token** ou crie um novo
5. Use este token como valor do secret `MAPBOX_PUBLIC_TOKEN`

### 5. Instalar Dependências

```bash
npm install
```

### 6. Executar o Projeto

```bash
npm run dev
```

## 🔧 Configurações Necessárias

### Variáveis de Ambiente

Certifique-se de que as seguintes variáveis estão configuradas:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

### Permissões de Usuário

O sistema usa as seguintes roles:
- **User**: Acesso básico
- **Manager**: Acesso a campanhas e relatórios (mapeado para `admin` no banco)
- **Admin**: Acesso completo (mapeado para `super_admin` no banco)

## 📱 Funcionalidades Disponíveis

### Mapa Interativo (`/mapa-interativo`)
- Visualização de telas no mapa
- Filtros por cidade, status e classe
- Detalhes das telas em popup
- Alerta para telas sem coordenadas

### Campanhas (`/campaigns`)
- Lista de campanhas com filtros
- Criação de novas campanhas
- Detalhes da campanha com gestão de telas
- Adição/remoção de telas da campanha

### Relatórios (`/reports`)
- KPIs em tempo real
- Gráfico de propostas por mês
- Distribuição de telas por cidade
- Ranking de clientes por propostas

## 🐛 Troubleshooting

### Mapa não carrega
1. Verifique se o secret `MAPBOX_PUBLIC_TOKEN` foi configurado
2. Verifique se o token do Mapbox é válido
3. Verifique os logs da Edge Function

### Dados não aparecem nos relatórios
1. Verifique se há dados nas tabelas `screens` e `proposals`
2. Verifique as permissões RLS
3. Verifique se o usuário tem a role adequada

### Erro de permissão
1. Verifique se o usuário está logado
2. Verifique se o usuário tem a role necessária
3. Verifique as políticas RLS nas tabelas

## 📊 Estrutura das Tabelas

### Campanhas (`campaigns`)
- `id`: ID único
- `name`: Nome da campanha
- `customer_name`: Nome do cliente
- `status`: Status (draft, active, paused, completed, cancelled)
- `start_date`, `end_date`: Período da campanha
- `budget`: Orçamento
- `notes`: Observações
- `created_by`: ID do usuário criador

### Telas da Campanha (`campaign_screens`)
- `id`: ID único
- `campaign_id`: Referência para campanha
- `screen_id`: Referência para tela
- `quantity`: Quantidade de telas
- `created_by`: ID do usuário criador

## 🔐 Segurança

- Todas as tabelas têm RLS habilitado
- Edge Function com verificação JWT obrigatória
- Filtros por usuário proprietário ou admin
- Tokens de API seguros via Edge Functions

## 📈 Próximos Passos

Funcionalidades que podem ser implementadas no futuro:
- Clustering de marcadores no mapa
- Paginação nas listas de campanhas
- Exportação de relatórios em PDF/Excel
- Notificações em tempo real
- Dashboard de métricas avançadas
