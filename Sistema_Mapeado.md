# Mapeamento Completo do Sistema - TV Doutor ADS

**Data de Criação**: 10/10/2025  
**Versão do Sistema**: 1.1.0  
**Tipo de Projeto**: Plataforma de Gestão de Publicidade Digital Out-of-Home (DOOH)

---

## 1. Visão Geral

### 1.1 Nome e Propósito
**Nome**: TV Doutor ADS  
**Propósito Principal**: Plataforma completa para gerenciamento de propostas comerciais, campanhas publicitárias e inventário de telas digitais (Digital Out-of-Home).

### 1.2 Principais Usuários e Perfis de Acesso

O sistema possui um modelo hierárquico de roles:

| Role | Descrição | Permissões |
|------|-----------|------------|
| **super_admin** | Super Administrador | Acesso total ao sistema, incluindo gerenciamento de roles e configurações críticas |
| **admin** | Administrador | Acesso administrativo completo, gerenciamento de usuários e dados |
| **manager** | Gerente | Pode criar, ler e editar, mas não pode excluir registros |
| **user** | Usuário Padrão | Acesso básico à plataforma, pode criar e gerenciar suas próprias propostas |
| **client** | Cliente | Acesso somente leitura para visualizar propostas e projetos atribuídos |

### 1.3 Principais Funcionalidades

1. **Gestão de Propostas Comerciais**
   - Criação de propostas avulsas ou vinculadas a projetos
   - Wizard de criação em 4 etapas
   - Cálculos automáticos de impactos e valores (CPM)
   - Geração de PDF profissional
   - Sistema de status (rascunho, enviada, em análise, aceita, rejeitada)

2. **Gerenciamento de Agências e Projetos**
   - Cadastro completo de agências
   - Gestão de contatos e deals por agência
   - Projetos com marcos/milestones
   - Equipes de projeto com papéis definidos
   - Tracking de orçamento e progresso

3. **Inventário de Telas (Screens)**
   - Cadastro de telas digitais com geolocalização
   - Classificação por tipo, classe e especialidades médicas
   - Integração com Google Maps para visualização
   - Busca avançada por localização e filtros
   - Heatmap de densidade de telas

4. **Mapa Interativo**
   - Visualização geoespacial de telas
   - Filtros por cidade, estado, tipo de local
   - Busca por especialidade médica
   - Cálculo de audiência e alcance
   - Clustering de marcadores

5. **Sistema de Notificações por Email**
   - Fila de emails pendentes
   - Processamento assíncrono via Edge Function
   - Integração com SendGrid (primário) e Resend (fallback)
   - Logs de envio e rastreamento de status

6. **Relatórios e Analytics**
   - Dashboard com estatísticas em tempo real
   - KPIs de propostas (taxa de conversão, valor médio)
   - Estatísticas de emails
   - Relatórios de desempenho de telas

7. **Gestão de Usuários**
   - Controle de acesso baseado em roles
   - Autenticação JWT via Supabase Auth
   - Perfis de usuário com avatar
   - Auditoria de ações

---

## 2. Arquitetura e Componentes

### 2.1 Arquitetura Geral

**Tipo**: Aplicação Web SPA (Single Page Application) com arquitetura Cliente-Servidor

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENTE (Frontend)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  React 18.3.1 + TypeScript + Vite 5.4.19              │ │
│  │  - React Router DOM (navegação)                        │ │
│  │  - TanStack React Query (cache/estado servidor)        │ │
│  │  - Shadcn/UI + Radix UI (componentes)                  │ │
│  │  - Tailwind CSS (estilização)                          │ │
│  │  - Leaflet/Mapbox (mapas)                              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS / REST API / WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   SERVIDOR (Backend - Supabase)              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL 13+ (Banco de Dados)                       │ │
│  │  - Row Level Security (RLS)                            │ │
│  │  - Triggers e Functions                                │ │
│  │  - Views e Materialized Views                          │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Supabase Auth (Autenticação JWT)                      │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Edge Functions (Deno Runtime)                         │ │
│  │  - process-pending-emails                              │ │
│  │  - generate-proposal-pdf                               │ │
│  │  - email-stats                                          │ │
│  │  - mapbox-token                                         │ │
│  │  - create-admin-user                                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Integrações Externas
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              SERVIÇOS EXTERNOS                               │
│  - Google Maps API (geocoding, mapas)                       │
│  - SendGrid (envio de emails - primário)                    │
│  - Resend (envio de emails - fallback)                      │
│  - Mapbox (tokens e visualização de mapas)                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Estrutura de Diretórios

```
tvdoutor-ads/
├── src/
│   ├── components/          # Componentes React reutilizáveis
│   │   ├── ui/              # Componentes base (Shadcn/UI)
│   │   ├── landing/         # Componentes da landing page
│   │   └── wizard/          # Componentes do wizard de propostas
│   ├── pages/               # Páginas/rotas da aplicação
│   ├── contexts/            # Contextos React (AuthContext)
│   ├── hooks/               # Hooks customizados
│   ├── lib/                 # Bibliotecas e serviços
│   │   ├── auth.ts          # Lógica de autenticação
│   │   ├── proposta-service.ts
│   │   ├── email-service.ts
│   │   ├── pdf-service.ts
│   │   └── ...
│   ├── integrations/
│   │   └── supabase/        # Cliente e tipos do Supabase
│   ├── types/               # Definições de tipos TypeScript
│   └── utils/               # Utilitários e helpers
├── supabase/
│   ├── migrations/          # 94 migrações SQL
│   ├── functions/           # 10 Edge Functions
│   └── config.toml          # Configuração do Supabase
├── public/                  # Arquivos estáticos
└── package.json             # Dependências e scripts
```

### 2.3 Módulos e Componentes Principais

#### Frontend (React)

**Páginas Principais:**
- `LandingPage`: Página inicial pública
- `Index`: Dashboard principal (após login)
- `NewProposal`: Wizard de criação de propostas
- `Propostas`: Listagem de propostas
- `ProposalDetails`: Detalhes de uma proposta
- `InteractiveMap`: Mapa interativo de telas
- `Inventory`: Gerenciamento de inventário
- `Agencias`: Gestão de agências
- `AgenciasProjetos`: Projetos por agência
- `ProjectManagement`: Gestão de projetos
- `Users`: Administração de usuários
- `Settings`: Configurações do sistema

**Componentes Chave:**
- `DashboardLayout`: Layout padrão com sidebar e header
- `ProtectedRoute`: Proteção de rotas autenticadas
- `NewProposalWizardImproved`: Wizard de 4 etapas para propostas
- `HeatmapComponent`: Visualização de densidade de telas
- `LocationSelection`: Seleção de telas com mapa
- `PDFDownloadButton`: Geração e download de PDF

#### Backend (Supabase)

**Edge Functions:**
1. `process-pending-emails`: Processa fila de emails
2. `generate-proposal-pdf`: Gera PDF de propostas
3. `email-stats`: Estatísticas de emails
4. `mapbox-token`: Fornece tokens do Mapbox
5. `create-admin-user`: Cria usuários admin
6. `maps-heatmap`: Dados para heatmap
7. `project-milestones`: Gerencia marcos de projeto
8. `send-proposal-email`: Envia email de proposta

### 2.4 Fluxos de Integração

#### Fluxo de Autenticação
```
1. Usuário → Login Page → Email/Senha
2. Frontend → Supabase Auth API → signInWithPassword()
3. Supabase Auth → Valida credenciais → Retorna JWT + Session
4. Frontend → Armazena sessão (localStorage)
5. Frontend → Busca perfil (profiles table)
6. Frontend → Busca roles (user_roles table)
7. AuthContext → Atualiza estado global
8. Usuário → Redirecionado para Dashboard
```

#### Fluxo de Criação de Proposta
```
1. Usuário → NewProposal Page → Wizard Step 1 (Informações)
2. Wizard Step 2 → Seleção de Telas (LocationSelection + Mapa)
3. Wizard Step 3 → Configuração (CPM, inserções, descontos)
4. Wizard Step 4 → Revisão e Submissão
5. Frontend → Valida dados → Calcula impactos
6. Frontend → supabase.from('proposals').insert()
7. Trigger no banco → Cria entrada em email_logs
8. Edge Function → Processa email assíncrono
9. Frontend → Redireciona para ProposalDetails
```

#### Fluxo de Geração de PDF
```
1. Usuário → Clica em "Download PDF"
2. Frontend → PDFDownloadButton component
3. Frontend → supabase.functions.invoke('generate-proposal-pdf')
4. Edge Function → Busca dados da proposta + telas
5. Edge Function → Gera HTML estruturado
6. Edge Function → Converte HTML → PDF
7. Edge Function → Retorna PDF buffer
8. Frontend → Cria blob → Download automático
```

---

## 3. Banco de Dados e Consultas SQL

### 3.1 Visão Geral do Banco de Dados

**SGBD**: PostgreSQL 13+  
**Provedor**: Supabase  
**Características**:
- Row Level Security (RLS) ativado em todas as tabelas
- Triggers para auditoria e automação
- Views para consultas otimizadas
- Stored Procedures para lógica complexa
- Constraints e Foreign Keys para integridade

### 3.2 Tabelas Principais

#### Autenticação e Usuários

**profiles** (Perfis de Usuários)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'user',
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
- Estende auth.users com informações de perfil
- Trigger `handle_new_user` cria automaticamente após signup

**user_roles** (Sistema de Roles)
```sql
CREATE TYPE app_role AS ENUM ('super_admin', 'admin', 'manager', 'user', 'client');

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);
```
- Permite múltiplas roles por usuário
- RLS: Usuários veem apenas suas roles, admins veem todas
- Trigger `prevent_role_escalation` previne mudança não autorizada

#### Propostas Comerciais

**proposals** (Propostas)
```sql
CREATE TABLE proposals (
  id BIGSERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  proposal_type TEXT CHECK (proposal_type IN ('avulsa', 'projeto')),
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviada', 'em_analise', 'aceita', 'rejeitada')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Configurações da campanha
  impact_formula TEXT,
  insertions_per_hour INTEGER,
  film_seconds INTEGER,
  cpm_mode TEXT CHECK (cpm_mode IN ('manual', 'auto')),
  cpm_value NUMERIC(10,2),
  discount_pct NUMERIC(5,2),
  discount_fixed NUMERIC(10,2),
  
  -- Métricas calculadas
  days_calendar INTEGER,
  days_business INTEGER,
  impacts_calendar BIGINT,
  impacts_business BIGINT,
  gross_calendar NUMERIC(12,2),
  gross_business NUMERIC(12,2),
  net_calendar NUMERIC(12,2),
  net_business NUMERIC(12,2),
  
  -- JSONB para flexibilidade
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  quote JSONB NOT NULL DEFAULT '{}'::jsonb,
  screens JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Relacionamentos
  agencia_id UUID REFERENCES agencias(id),
  projeto_id UUID REFERENCES agencia_projetos(id),
  created_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
- Chave primária: BIGSERIAL para alto volume
- Status workflow: rascunho → enviada → em_analise → aceita/rejeitada
- JSONB para dados variáveis (filters, quote)

**proposal_screens** (Telas da Proposta)
```sql
CREATE TABLE proposal_screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id BIGINT REFERENCES proposals(id) ON DELETE CASCADE NOT NULL,
  screen_id UUID REFERENCES screens(id) ON DELETE CASCADE NOT NULL,
  custom_cpm NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (proposal_id, screen_id)
);
```
- Relacionamento N:N entre proposals e screens
- Permite CPM customizado por tela

#### Inventário de Telas

**screens** (Telas Digitais)
```sql
CREATE TABLE screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  venue_id UUID REFERENCES venues(id),
  
  -- Localização
  address TEXT,
  city TEXT,
  state TEXT,
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  
  -- Classificação
  class TEXT CHECK (class IN ('A', 'B', 'C', 'D')),
  type TEXT,
  status TEXT DEFAULT 'ativo',
  
  -- Métricas
  average_audience INTEGER,
  operating_hours JSONB,
  
  -- Relacionamento com especialidades médicas
  specialty_tags TEXT[],
  
  -- Google Places
  google_place_id TEXT,
  google_place_name TEXT,
  google_rating NUMERIC(3,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
- Geolocalização com latitude/longitude
- Array de especialidades para busca
- Integração com Google Places

**venues** (Locais/Pontos)
```sql
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Agências e Projetos

**agencias** (Agências)
```sql
CREATE TABLE agencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_agencia TEXT NOT NULL UNIQUE,
  tipo_agencia TEXT,
  cnpj TEXT UNIQUE,
  website TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

**agencia_contatos** (Contatos da Agência)
```sql
CREATE TABLE agencia_contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id UUID REFERENCES agencias(id) ON DELETE CASCADE NOT NULL,
  nome_contato TEXT NOT NULL,
  cargo TEXT,
  email_contato TEXT,
  telefone_contato TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**agencia_projetos** (Projetos)
```sql
CREATE TABLE agencia_projetos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id UUID REFERENCES agencias(id) ON DELETE CASCADE NOT NULL,
  nome_projeto TEXT NOT NULL,
  descricao TEXT,
  status_projeto TEXT DEFAULT 'planejamento',
  prioridade TEXT DEFAULT 'media',
  data_inicio DATE,
  data_fim DATE,
  orcamento_projeto NUMERIC(12,2),
  valor_gasto NUMERIC(12,2) DEFAULT 0,
  progresso INTEGER DEFAULT 0,
  responsavel_projeto UUID REFERENCES pessoas_projeto(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**agencia_projeto_marcos** (Milestones)
```sql
CREATE TABLE agencia_projeto_marcos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID REFERENCES agencia_projetos(id) ON DELETE CASCADE NOT NULL,
  nome_marco TEXT NOT NULL,
  descricao TEXT,
  data_prevista DATE NOT NULL,
  data_conclusao DATE,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'cancelado')),
  ordem INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Sistema de Emails

**email_logs** (Logs de Emails)
```sql
CREATE TABLE email_logs (
  id BIGSERIAL PRIMARY KEY,
  proposal_id BIGINT REFERENCES proposals(id),
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_type TEXT,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  customer_name TEXT,
  proposal_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
- Fila de processamento assíncrono
- Status: pending → sent/failed
- Processado pela Edge Function `process-pending-emails`

### 3.3 Views e Funções

**v_screens_enriched** (View Enriquecida de Telas)
```sql
CREATE OR REPLACE VIEW v_screens_enriched AS
SELECT 
  s.*,
  v.name AS venue_name,
  v.type AS venue_type,
  -- Endereço formatado
  CONCAT_WS(', ', s.address, s.city, s.state) AS full_address,
  -- Especialidades como array
  s.specialty_tags,
  -- Métricas
  COALESCE(s.average_audience, 0) AS audience
FROM screens s
LEFT JOIN venues v ON s.venue_id = v.id
WHERE s.status = 'ativo';
```

**has_role()** (Função de Verificação de Role)
```sql
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

**is_admin()** e **is_super_admin()** (Helpers de Permissão)
```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT has_role(auth.uid(), 'super_admin')
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

### 3.4 Row Level Security (RLS)

**Políticas de Segurança - Exemplos:**

```sql
-- Profiles: Todos podem ver, apenas próprio pode atualizar
CREATE POLICY "Authenticated users can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Proposals: Usuários veem suas propostas, admins veem todas
CREATE POLICY "Users can view own proposals"
  ON proposals FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR is_admin());

CREATE POLICY "Users can create proposals"
  ON proposals FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can modify all proposals"
  ON proposals FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- User Roles: Apenas super_admins podem gerenciar
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Only super admins can manage roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
```

### 3.5 Triggers

**handle_new_user** (Criação Automática de Perfil)
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    'user',
    NOW()
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**prevent_role_escalation** (Previne Escalação de Privilégios)
```sql
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT has_role(auth.uid(), 'super_admin') THEN
      RAISE EXCEPTION 'Only super administrators can change user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_profile_role_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();
```

### 3.6 Consultas SQL Relevantes

**Buscar Propostas com Estatísticas**
```sql
SELECT 
  p.*,
  COUNT(ps.id) AS total_screens,
  u.name AS created_by_name,
  a.nome_agencia,
  proj.nome_projeto
FROM proposals p
LEFT JOIN proposal_screens ps ON p.id = ps.proposal_id
LEFT JOIN profiles u ON p.created_by = u.id
LEFT JOIN agencias a ON p.agencia_id = a.id
LEFT JOIN agencia_projetos proj ON p.projeto_id = proj.id
WHERE p.created_by = auth.uid() OR is_admin()
GROUP BY p.id, u.name, a.nome_agencia, proj.nome_projeto
ORDER BY p.created_at DESC;
```

**Telas por Especialidade e Localização**
```sql
SELECT 
  s.id,
  s.name,
  s.city,
  s.state,
  s.latitude,
  s.longitude,
  s.class,
  s.average_audience,
  v.name AS venue_name
FROM screens s
LEFT JOIN venues v ON s.venue_id = v.id
WHERE 
  s.status = 'ativo'
  AND s.state = 'SP'
  AND 'Cardiologia' = ANY(s.specialty_tags)
  AND s.latitude IS NOT NULL
  AND s.longitude IS NOT NULL
ORDER BY s.average_audience DESC
LIMIT 100;
```

**KPIs de Propostas**
```sql
SELECT 
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS total_proposals,
  COUNT(*) FILTER (WHERE status = 'aceita') AS accepted,
  COUNT(*) FILTER (WHERE status = 'rejeitada') AS rejected,
  AVG(net_calendar) AS avg_value,
  SUM(net_calendar) FILTER (WHERE status = 'aceita') AS total_revenue
FROM proposals
WHERE created_at >= NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

---

## 4. Regras de Negócio

### 4.1 Workflow de Propostas

**Estados e Transições:**
```
rascunho → enviada → em_analise → aceita ✓
                              ↘ rejeitada ✗
```

**Regras:**
1. Apenas propostas em status "rascunho" podem ser editadas
2. Ao mudar status para "enviada", um email é automaticamente adicionado à fila
3. Apenas admins podem alterar status de propostas de outros usuários
4. Propostas aceitas não podem ser editadas (apenas visualizadas)
5. Ao rejeitar, um campo de motivo deve ser preenchido

### 4.2 Cálculos de Impactos e Valores

**Fórmula de Impactos (Calendar Days):**
```javascript
impacts_calendar = Σ(telas) [
  audience_per_screen * 
  insertions_per_hour * 
  operating_hours_per_day * 
  days_calendar
]
```

**Fórmula de Impactos (Business Days):**
```javascript
impacts_business = Σ(telas) [
  audience_per_screen * 
  insertions_per_hour * 
  operating_hours_per_day * 
  days_business
]
```

**Cálculo de Valores:**
```javascript
// Valor Bruto
gross_value = (impacts / 1000) * cpm_value

// Descontos
discount_total = (gross_value * discount_pct / 100) + discount_fixed

// Valor Líquido
net_value = gross_value - discount_total
```

**Regras de CPM:**
- **Modo Auto**: CPM base por classe de tela (A: R$50, B: R$40, C: R$30, D: R$20)
- **Modo Manual**: CPM definido manualmente na proposta
- **Custom CPM**: Pode ser sobrescrito por tela individualmente

### 4.3 Validações de Dados

**Propostas:**
- `customer_name`: obrigatório, mínimo 3 caracteres
- `customer_email`: obrigatório, formato válido de email
- `start_date` < `end_date`
- Pelo menos 1 tela selecionada
- `insertions_per_hour`: entre 1 e 60
- `film_seconds`: 15, 30, 45 ou 60 segundos
- `discount_pct`: entre 0 e 100
- `discount_fixed`: >= 0

**Agências:**
- `nome_agencia`: único, obrigatório
- `cnpj`: formato válido (14 dígitos), único se fornecido
- `website`: URL válida se fornecido

**Projetos:**
- `orcamento_projeto`: >= 0
- `valor_gasto`: <= `orcamento_projeto`
- `progresso`: entre 0 e 100
- `data_fim`: >= `data_inicio`

### 4.4 Automações

**Trigger: Criação de Email ao Enviar Proposta**
```sql
-- Quando status muda para 'enviada', criar log de email
CREATE OR REPLACE FUNCTION auto_create_proposal_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'enviada' AND OLD.status != 'enviada' THEN
    INSERT INTO email_logs (
      proposal_id,
      email_type,
      recipient_email,
      recipient_type,
      subject,
      customer_name,
      proposal_type,
      status
    ) VALUES (
      NEW.id,
      'proposal_sent',
      NEW.customer_email,
      'customer',
      'Nova Proposta Comercial - TV Doutor ADS',
      NEW.customer_name,
      NEW.proposal_type,
      'pending'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Processamento Automático de Emails:**
- Edge Function `process-pending-emails` é invocada a cada 5 minutos (via cron job ou manual)
- Busca emails com status "pending"
- Tenta enviar via SendGrid → se falhar, tenta Resend
- Atualiza status para "sent" ou "failed"
- Registra error_message em caso de falha

---

## 5. Integrações Externas

### 5.1 Google Maps API

**Uso**: Geocoding, visualização de mapas, busca de lugares

**Configuração:**
```env
VITE_GOOGLE_MAPS_API_KEY=<GOOGLE_MAPS_API_KEY>
```

**Restrições de Segurança:**
- Referer HTTP: `https://tvdoutor-ads.vercel.app/*`
- APIs habilitadas:
  - Maps JavaScript API
  - Geocoding API
  - Places API

**Endpoints Utilizados:**
1. **Geocoding API**: Conversão de endereço → lat/lng
   ```
   GET https://maps.googleapis.com/maps/api/geocode/json
   ?address={endereco}&key={API_KEY}
   ```

2. **Places API**: Busca de locais e detalhes
   ```
   GET https://maps.googleapis.com/maps/api/place/autocomplete/json
   ?input={query}&key={API_KEY}
   ```

3. **Maps JavaScript API**: Renderização de mapas interativos

**Tratamento de Erros:**
- Limite de requisições: 25.000/dia (plano gratuito)
- Fallback: Usar coordenadas pré-cadastradas se API falhar
- Cache: Coordenadas são salvas no banco após primeira busca

### 5.2 SendGrid (Email Primário)

**Uso**: Envio de emails transacionais

**Configuração:**
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxx
```

**Autenticação**: API Key via header `Authorization: Bearer {API_KEY}`

**Endpoint:**
```
POST https://api.sendgrid.com/v3/mail/send
```

**Payload Exemplo:**
```json
{
  "personalizations": [{
    "to": [{"email": "cliente@exemplo.com"}],
    "subject": "Nova Proposta Comercial"
  }],
  "from": {"email": "noreply@tvdoutor.com.br"},
  "content": [{
    "type": "text/html",
    "value": "<html>...</html>"
  }]
}
```

**Limites:**
- Plano gratuito: 100 emails/dia
- Plano pago: ilimitado

**Tratamento de Erros:**
- Status 200-299: Sucesso
- Status 400+: Fallback para Resend
- Retry: 3 tentativas com backoff exponencial

### 5.3 Resend (Email Fallback)

**Uso**: Backup para SendGrid

**Configuração:**
```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxx
```

**Endpoint:**
```
POST https://api.resend.com/emails
```

**Payload Exemplo:**
```json
{
  "from": "TV Doutor ADS <noreply@tvdoutor.com.br>",
  "to": ["cliente@exemplo.com"],
  "subject": "Nova Proposta Comercial",
  "html": "<html>...</html>"
}
```

**Limites:**
- Plano gratuito: 100 emails/dia
- Timeout: 30 segundos

### 5.4 Mapbox (Tokens e Mapas)

**Uso**: Visualização de mapas (alternativa ao Google Maps)

**Configuração:**
- Token armazenado no backend
- Edge Function `mapbox-token` fornece token ao frontend

**Endpoint:**
```
GET https://api.mapbox.com/styles/v1/mapbox/streets-v11
?access_token={TOKEN}
```

**Tiles:**
- Raster: `https://api.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={TOKEN}`
- Vector: `https://api.mapbox.com/v4/{id}/{z}/{x}/{y}.mvt?access_token={TOKEN}`

### 5.5 Supabase Auth (OAuth Providers)

**Providers Configurados:**
- Email/Password (nativo)
- Google OAuth (planejado)

**Fluxo OAuth Google:**
```
1. Frontend → supabase.auth.signInWithOAuth({ provider: 'google' })
2. Redirect → Google OAuth
3. Usuário autoriza
4. Callback → Supabase
5. Supabase → Cria sessão + JWT
6. Frontend → Recebe sessão
```

---

## 6. Segurança e Controle de Acesso

### 6.1 Autenticação

**Método**: JWT (JSON Web Tokens) via Supabase Auth

**Fluxo de Login:**
1. Usuário envia credenciais → `supabase.auth.signInWithPassword()`
2. Supabase valida → gera JWT + Refresh Token
3. JWT armazenado em `localStorage` (auto-gerenciado pelo SDK)
4. Cada request inclui header: `Authorization: Bearer {JWT}`
5. Backend valida JWT e extrai `auth.uid()`

**Expiração:**
- Access Token: 1 hora
- Refresh Token: 30 dias
- Auto-refresh: SDK renova automaticamente antes de expirar

**Proteção de Rotas:**
```typescript
<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } 
/>
```

### 6.2 Autorização (RBAC - Role-Based Access Control)

**Hierarquia de Roles:**
```
super_admin > admin > manager > user > client
```

**Permissões por Role:**

| Ação | super_admin | admin | manager | user | client |
|------|-------------|-------|---------|------|--------|
| Gerenciar roles | ✓ | ✗ | ✗ | ✗ | ✗ |
| Criar usuários | ✓ | ✓ | ✗ | ✗ | ✗ |
| Deletar propostas | ✓ | ✓ | ✗ | ✗ | ✗ |
| Editar propostas | ✓ | ✓ | ✓ | próprias | ✗ |
| Criar propostas | ✓ | ✓ | ✓ | ✓ | ✗ |
| Ver propostas | ✓ | ✓ | ✓ | próprias | atribuídas |
| Gerenciar telas | ✓ | ✓ | ✗ | ✗ | ✗ |
| Ver relatórios | ✓ | ✓ | ✓ | ✗ | ✗ |

**Verificação de Permissões:**
```typescript
// Frontend
const { hasRole, isAdmin, isSuperAdmin } = useAuth();

if (isAdmin()) {
  // Exibir opções de admin
}

// Backend (RLS)
CREATE POLICY "admin_only" ON proposals
  FOR DELETE
  TO authenticated
  USING (is_admin());
```

### 6.3 Row Level Security (RLS)

**Princípios:**
1. **Deny by Default**: Sem política = sem acesso
2. **Least Privilege**: Usuários têm apenas acesso necessário
3. **Defense in Depth**: RLS + validações no frontend + Edge Functions

**Exemplos de Políticas:**

**Proposals - SELECT:**
```sql
-- Usuários veem apenas suas propostas, admins veem todas
CREATE POLICY "proposals_select" ON proposals
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() 
    OR is_admin()
    OR (
      proposal_type = 'projeto' 
      AND projeto_id IN (
        SELECT projeto_id FROM agencia_projeto_equipe 
        WHERE pessoa_id = (
          SELECT id FROM pessoas_projeto WHERE user_id = auth.uid()
        )
      )
    )
  );
```

**Screens - UPDATE:**
```sql
-- Apenas admins podem atualizar telas
CREATE POLICY "screens_update" ON screens
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
```

### 6.4 Prevenção de Ataques

**SQL Injection:**
- ✓ Uso de prepared statements (Supabase SDK)
- ✓ Validação de tipos no TypeScript
- ✓ RLS impede acesso direto não autorizado

**XSS (Cross-Site Scripting):**
- ✓ React escapa automaticamente JSX
- ✓ Sanitização de HTML em emails
- ✓ Content Security Policy (CSP) headers

**CSRF (Cross-Site Request Forgery):**
- ✓ JWT em header (não em cookie)
- ✓ SameSite cookie policy
- ✓ Origin checking em Edge Functions

**Rate Limiting:**
- Implementado via `rate-limiting.ts`
- Limite: 100 requests/minuto por IP
- Endpoints críticos: 10 requests/minuto

**SSRF Protection:**
- Implementado via `ssrf-protection.ts`
- Whitelist de domínios permitidos
- Validação de URLs em geocoding

### 6.5 Logs e Auditoria

**Admin Logs:**
```sql
CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Eventos Auditados:**
- Login/Logout
- Mudança de roles
- Criação/edição/exclusão de propostas
- Acesso a dados sensíveis
- Falhas de autenticação

**Retenção:**
- Logs de auditoria: 1 ano
- Logs de email: 90 dias
- Logs de erro: 30 dias

---

## 7. Ambientes e Configurações

### 7.1 Ambientes

| Ambiente | Descrição | URL | Branch Git |
|----------|-----------|-----|------------|
| **Desenvolvimento** | Local | http://localhost:5173 | - |
| **Staging/Preview** | Testes | https://tvdoutor-ads-*.vercel.app | feature/* |
| **Produção** | Público | https://tvdoutor-ads.vercel.app | main |

### 7.2 Variáveis de Ambiente

**Frontend (.env):**
```bash
# Supabase
VITE_SUPABASE_URL=https://vaogzhwzucijiyvyglls.supabase.co
VITE_SUPABASE_ANON_KEY=<ANON_KEY>

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=<GOOGLE_API_KEY>

# App Info
VITE_APP_NAME=TV Doutor ADS
VITE_APP_VERSION=1.1.0
```

**Backend (Supabase Secrets):**
```bash
# Email
SENDGRID_API_KEY=<SENDGRID_KEY>
RESEND_API_KEY=<RESEND_KEY>

# Supabase (auto-injetadas)
SUPABASE_URL=<URL>
SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_KEY>
```

### 7.3 Deploy e CI/CD

**Frontend (Vercel):**
- Build Command: `npm run build:prod`
- Output Directory: `dist`
- Framework: Vite
- Node Version: 18.x
- Auto-deploy: Push em `main` → produção

**Backend (Supabase):**
- Migrations: `npx supabase db push`
- Edge Functions: Deploy via Supabase CLI
- Rollback: Migrations versionadas (down migration)

**Scripts de Deploy:**
```json
{
  "deploy:full": "npm run build:prod && vercel --prod && supabase db push",
  "deploy:vercel": "vercel --prod",
  "deploy:supabase": "supabase db push",
  "deploy:preview": "vercel"
}
```

### 7.4 Monitoramento

**Logs:**
- Frontend: Console + Sentry (planejado)
- Backend: Supabase Logs Dashboard
- Edge Functions: Deno Deploy Logs

**Métricas:**
- Uptime: Vercel Analytics
- Performance: Web Vitals (LCP, FID, CLS)
- Erros: Taxa de erro por página
- API: Latência média, taxa de sucesso

**Alertas:**
- Email quando taxa de erro > 5%
- Slack quando API latency > 2s
- Discord quando uptime < 99%

---

## 8. Pontos de Atenção e Melhorias

### 8.1 Débitos Técnicos Conhecidos

1. **Geração de PDF**
   - Atual: Edge Function com PDF básico (placeholder)
   - Ideal: Puppeteer ou jsPDF para PDFs profissionais
   - Impacto: Clientes recebem PDF simples sem layout adequado
   - Prioridade: ALTA

2. **Processamento de Emails**
   - Atual: Simulado (não envia emails reais em dev)
   - Ideal: Integração completa com SendGrid/Resend em todos ambientes
   - Impacto: Emails não são enviados automaticamente
   - Prioridade: ALTA

3. **Testes Automatizados**
   - Atual: Nenhum teste unitário ou E2E
   - Ideal: Jest + React Testing Library + Cypress
   - Impacto: Bugs podem chegar em produção
   - Prioridade: MÉDIA

4. **Documentação de API**
   - Atual: Documentação inline nos arquivos
   - Ideal: Swagger/OpenAPI para Edge Functions
   - Impacto: Dificuldade para novos desenvolvedores
   - Prioridade: BAIXA

5. **Cache de Dados**
   - Atual: React Query com cache padrão (5 minutos)
   - Ideal: Redis para cache de telas e propostas
   - Impacto: Queries repetidas sobrecarregam DB
   - Prioridade: MÉDIA

### 8.2 Gargalos de Performance

1. **Queries N+1 em Propostas**
   - Problema: Busca telas em loop ao carregar propostas
   - Solução: View materializada ou eager loading
   - Ganho esperado: -70% no tempo de carregamento

2. **Heatmap com Muitas Telas**
   - Problema: Renderizar 1000+ telas trava o navegador
   - Solução: Clustering no backend + paginação
   - Ganho esperado: Renderização < 2s

3. **Geocoding Síncrono**
   - Problema: Buscar lat/lng ao criar tela bloqueia UI
   - Solução: Background job + fila
   - Ganho esperado: UX mais fluida

### 8.3 Riscos de Segurança

1. **Exposição de API Keys**
   - Risco: VITE_GOOGLE_MAPS_API_KEY no código fonte
   - Mitigação Atual: Restrição por referer
   - Mitigação Ideal: Proxy via Edge Function
   - Severidade: MÉDIA

2. **RLS Recursion**
   - Risco: Políticas RLS podem causar loop infinito
   - Mitigação Atual: SECURITY DEFINER em funções
   - Mitigação Ideal: Testes automatizados de RLS
   - Severidade: ALTA

3. **Falta de 2FA**
   - Risco: Contas podem ser comprometidas com senha
   - Mitigação Atual: Senha forte obrigatória
   - Mitigação Ideal: TOTP ou SMS 2FA
   - Severidade: MÉDIA

### 8.4 Sugestões de Melhorias

#### Curto Prazo (1-2 meses)

1. **Implementar PDF profissional com Puppeteer**
   - Esforço: 3 dias
   - Impacto: ALTO (satisfação do cliente)

2. **Adicionar testes E2E críticos (login, criar proposta)**
   - Esforço: 5 dias
   - Impacto: ALTO (redução de bugs)

3. **Otimizar queries de propostas (view materializada)**
   - Esforço: 2 dias
   - Impacto: MÉDIO (performance)

4. **Implementar monitoramento com Sentry**
   - Esforço: 1 dia
   - Impacto: ALTO (visibilidade de erros)

#### Médio Prazo (3-6 meses)

1. **Sistema de notificações in-app (WebSocket)**
   - Esforço: 10 dias
   - Impacto: MÉDIO (UX)

2. **Dashboard de analytics avançado (Recharts)**
   - Esforço: 8 dias
   - Impacto: ALTO (tomada de decisão)

3. **Exportação de relatórios (Excel/CSV)**
   - Esforço: 5 dias
   - Impacto: MÉDIO (produtividade)

4. **Mobile App (React Native)**
   - Esforço: 60 dias
   - Impacto: ALTO (novo canal)

#### Longo Prazo (6-12 meses)

1. **IA para sugestão de telas (ML)**
   - Esforço: 90 dias
   - Impacto: MUITO ALTO (diferencial competitivo)

2. **Integração com CRM (HubSpot/Salesforce)**
   - Esforço: 30 dias
   - Impacto: ALTO (automatização de vendas)

3. **Multi-tenancy (white-label)**
   - Esforço: 120 dias
   - Impacto: MUITO ALTO (escalabilidade)

### 8.5 Otimizações Recomendadas

**Banco de Dados:**
- Criar índices compostos:
  ```sql
  CREATE INDEX idx_proposals_status_created 
    ON proposals (status, created_at DESC);
  
  CREATE INDEX idx_screens_location 
    ON screens USING GIST (point(latitude, longitude));
  ```

- Particionar tabela `email_logs` por data (mensalmente)

**Frontend:**
- Code splitting por rota
- Lazy loading de componentes pesados
- Compressão de imagens (WebP)
- Service Worker para cache offline

**Backend:**
- Connection pooling (Supabase Pooler)
- Read replicas para queries pesadas
- CDN para assets estáticos (Vercel Edge Network)

---

## Histórico de Atualizações

### 10/10/2025 - v1.0.0
- **Criação**: Mapeamento inicial completo do sistema
- **Responsável**: Assistente IA
- **Escopo**: Documentação de arquitetura, banco de dados, regras de negócio, integrações, segurança e configurações
- **Observações**: 
  - Sistema em produção (v1.1.0)
  - 94 migrações SQL aplicadas
  - 10 Edge Functions ativas
  - RLS habilitado em todas as tabelas
  - Deploy em Vercel (frontend) + Supabase (backend)

---

## Anexos

### Tecnologias Utilizadas

**Frontend:**
- React 18.3.1
- TypeScript 5.8.3
- Vite 5.4.19
- React Router DOM 6.30.1
- TanStack React Query 5.85.5
- Shadcn/UI + Radix UI
- Tailwind CSS 3.4.17
- Leaflet 1.9.4 + Mapbox GL 3.14.0
- Recharts 2.15.4
- Framer Motion 12.23.12
- React Hook Form 7.61.1 + Zod 3.25.76

**Backend:**
- Supabase (PostgreSQL 13+)
- Deno Runtime (Edge Functions)
- Supabase Auth (JWT)

**Integrações:**
- Google Maps API
- SendGrid API
- Resend API
- Mapbox API

**DevOps:**
- Vercel (hosting frontend)
- Git + GitHub
- Supabase CLI
- ESLint + TypeScript ESLint

### Recursos Adicionais

**Documentos Relacionados:**
- `README.md` - Guia de instalação e uso
- `DEPLOYMENT_INSTRUCTIONS.md` - Instruções de deploy
- `SECURITY_IMPLEMENTATION_GUIDE.md` - Guia de segurança
- `API_ENHANCEMENT.md` - Melhorias de API
- `VERSIONING.md` - Controle de versão

**Links Úteis:**
- Supabase Project: `https://supabase.com/dashboard/project/vaogzhwzucijiyvyglls`
- Vercel Dashboard: `https://vercel.com/dashboard`
- Repositório Git: `C:\Users\hilca\OneDrive\Documentos\GitHub\TVDoutor-ADS-2\tvdoutor-ads`

---

**Fim do Documento**
