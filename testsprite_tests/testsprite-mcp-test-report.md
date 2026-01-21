## 1️⃣ Document Metadata
- **Project Name:** tvdoutor-ads
- **Date:** 2026-01-20
- **Prepared by:** TestSprite MCP
- **Environment:** Local dev (`http://localhost:8080`)
- **Scope:** Frontend test plan (P0/P1 prioritized)

---

## 2️⃣ Requirement Validation Summary
### Auth & Access
- **TC001 User login with valid credentials** — ❌ Failed  
  **Analysis:** Login returned "Invalid login credentials" and Supabase token endpoint responded 400; valida credencial ou config do Supabase.
- **TC002 Login failure with invalid credentials** — ✅ Passed  
  **Analysis:** Mensagem de erro exibida corretamente para credenciais invalidas.
- **TC003 Role-based access restriction enforcement** — ❌ Failed  
  **Analysis:** Bloqueado por falha de login; nao foi possivel validar roles.

### Dashboard
- **TC012 Dashboard data visualization and live data refresh** — ❌ Failed  
  **Analysis:** Falha de login impediu acesso ao dashboard.

### Proposals
- **TC004 Create new advertising proposal via wizard - happy path** — ❌ Failed  
  **Analysis:** Sem login valido nao foi possivel acessar o wizard.
- **TC005 Proposal wizard prevents advancing on missing mandatory fields** — ❌ Failed  
  **Analysis:** Sem login valido nao foi possivel validar regras de campos obrigatorios.

### Campaigns & Venues
- **TC006 Create and edit campaigns and link venues** — ❌ Failed  
  **Analysis:** Credenciais de manager invalidas; fluxo bloqueado.

### Inventory & Screens
- **TC007 Inventory screen image upload with validation** — ❌ Failed  
  **Analysis:** Credenciais invalidas; upload e validacoes nao puderam ser exercitados.

### Maps & Heatmap
- **TC008 Interactive map loads with geospatial points and heatmap rendering** — ❌ Failed  
  **Analysis:** Login falhou e login Google nao concluiu; pagina de mapa inacessivel.

### Reports & Exports
- **TC009 Generate reports with filters and export to PDF** — ❌ Failed  
  **Analysis:** Sem acesso ao modulo de relatorios por falha de login.

### Profile & Settings
- **TC010 User profile update and password change validation** — ❌ Failed  
  **Analysis:** Login falhou e recuperacao de senha nao liberou acesso.

### Agencies & Projects
- **TC011 Manage agencies, projects, and associating people** — ❌ Failed  
  **Analysis:** Credenciais invalidas; fluxo nao executado.

### Email Notifications
- **TC013 Email notification system sends transactional emails** — ❌ Failed  
  **Analysis:** Reset de senha foi acionado, mas envio de email de proposta nao foi validado por falta de login.

### Admin & Impact Models
- **TC014 Admin user management and impact model administration** — ❌ Failed  
  **Analysis:** Credenciais admin invalidas; modulo nao acessivel.

---

## 3️⃣ Coverage & Matching Metrics
- **Total tests:** 14
- **Passed:** 1
- **Failed:** 13
- **Pass rate:** 7.14%

| Requirement Area             | Total Tests | ✅ Passed | ❌ Failed |
|-----------------------------|-------------|-----------|----------|
| Auth & Access               | 3           | 1         | 2        |
| Dashboard                   | 1           | 0         | 1        |
| Proposals                   | 2           | 0         | 2        |
| Campaigns & Venues          | 1           | 0         | 1        |
| Inventory & Screens         | 1           | 0         | 1        |
| Maps & Heatmap              | 1           | 0         | 1        |
| Reports & Exports           | 1           | 0         | 1        |
| Profile & Settings          | 1           | 0         | 1        |
| Agencies & Projects         | 1           | 0         | 1        |
| Email Notifications         | 1           | 0         | 1        |
| Admin & Impact Models       | 1           | 0         | 1        |

---

## 4️⃣ Key Gaps / Risks
- **Bloqueio geral por login invalido:** a maioria dos testes falhou por credenciais invalidas e respostas 400 do endpoint de token do Supabase.
- **Cobertura funcional incompleta:** fluxos P0/P1 (propostas, campanhas, relatorios, mapas) nao puderam ser exercitados.
- **Risco de configuracao de ambiente:** possivel problema de variaveis de ambiente, banco de testes ou usuarios inexistentes.
- **Dependencias externas:** login Google e geocoding nao foram validados por falta de acesso.
