# Funcionalidades da Aplicação – TV Doutor ADS

Este documento descreve **todas as funcionalidades** da aplicação TV Doutor ADS e **como elas devem funcionar**, para uso da equipe e de novos desenvolvedores.

---

## 1. Visão geral

**TV Doutor ADS** é uma plataforma web para **gestão de publicidade digital out-of-home (DOOH)** da TV Doutor. Ela centraliza:

- **Propostas comerciais** (criação, aprovação, acompanhamento)
- **Campanhas** e **locais (venues)** com visão geoespacial
- **Inventário de telas** (farmacias, clínicas, etc.)
- **Agências, projetos e pessoas**
- **Relatórios e exportações**
- **Controle de acesso** por perfis (roles)

A aplicação é um **frontend React/Vite** integrado ao **Supabase** (Auth, Database, Storage).

---

## 2. Perfis de acesso (roles)

O sistema usa **controle de acesso por perfil**. Cada usuário tem uma ou mais roles que definem o que pode ver e fazer.

| Perfil        | Descrição              | Acesso típico                                                                 |
|---------------|------------------------|-------------------------------------------------------------------------------|
| **super_admin** | Super administrador     | Tudo, incluindo gestão de roles, monitor de sessões (`/user-management`)     |
| **admin**       | Administrador          | Gestão de usuários, dados administrativos, modelos de impacto                |
| **manager**     | Gerente                | Campanhas, venues, agências, projetos, relatórios, inventário                |
| **user**        | Usuário padrão         | Dashboard, propostas (criar e ver as próprias), mapa, inventário (leitura)   |
| **client**      | Cliente                | Somente leitura: propostas e projetos atribuídos                             |

**Comportamento esperado:**

- Rotas protegidas checam a role do usuário; sem permissão, há redirecionamento ou bloqueio.
- Usuários veem apenas os dados permitidos pela role (ex.: usuário vê só suas propostas; admin vê todas).

---

## 3. Autenticação e conta

### 3.1 Login

- **Onde:** `/login` (rota pública).
- **Como deve funcionar:**
  - Usuário informa **e-mail** e **senha**.
  - Sistema autentica via Supabase Auth.
  - Com credenciais válidas: redireciona para `/dashboard` e mantém sessão (JWT).
  - Com credenciais inválidas: exibe mensagem de erro, **sem** criar sessão.

### 3.2 Recuperação de senha

- **Onde:** `/reset-password` (rota pública).
- **Como deve funcionar:**
  - Usuário informa o e-mail.
  - Sistema envia e-mail de redefinição com link válido (Supabase Auth).
  - Ao acessar o link e definir nova senha, o usuário consegue fazer login com a nova senha.

### 3.3 Perfil e configurações

- **Perfil:** `/profile` – dados do usuário (nome, e-mail, avatar).
- **Configurações:** `/settings` – preferências da conta.
- **Comportamento esperado:** Usuário autenticado pode ver e editar **apenas o próprio** perfil; alteração de roles fica restrita ao **super_admin**.

---

## 4. Dashboard

- **Onde:** `/dashboard` (e alternativo `/dashboard-old`).
- **Como deve funcionar:**
  - Exibe **indicadores principais** e resumos (propostas, campanhas, telas, etc.).
  - Cards e métricas devem refletir dados reais conforme permissões do usuário.
  - **Centro de alertas**: notificações como e-mails pendentes, propostas em rascunho, prazos, orçamento de campanha, etc., com prioridade (crítico, importante, informativo).

---

## 5. Propostas comerciais

### 5.1 Nova proposta (wizard)

- **Onde:** `/nova-proposta`.
- **Como deve funcionar:**
  - Wizard em **várias etapas** (ex.: informações do cliente, seleção de telas, configuração de CPM/inserções/descontos, revisão).
  - Campos obrigatórios validados; não é possível avançar com dados inválidos.
  - Seleção de telas pode usar **mapa** e **busca por endereço/CEP e raio**.
  - Cálculos automáticos de **impactos** e **valores** (dias úteis/calendário, CPM, descontos).
  - Ao concluir, a proposta é salva e fica acessível em **Propostas** e em **Detalhes da proposta**.

### 5.2 Listagem de propostas

- **Onde:** `/propostas`.
- **Como deve funcionar:**
  - Lista de propostas com **filtros** (status, período, agência, etc.).
  - Resultados coerentes com os filtros e com a role (ex.: user vê só as suas).
  - Ações: abrir detalhes, editar (quando permitido por status).

### 5.3 Detalhes da proposta

- **Onde:** `/propostas/:id`.
- **Como deve funcionar:**
  - Exibe **todos os dados** da proposta (cliente, datas, telas, valores, status).
  - **Exportar/Download em PDF**: gera PDF da proposta (via Edge Function) e disponibiliza para download.
  - Status da proposta segue o fluxo: **rascunho → enviada → em análise → aceita** ou **rejeitada**. Apenas rascunho deve permitir edição; ao marcar como “enviada”, pode ser disparado e-mail ao cliente (fila de e-mails).

---

## 6. Campanhas publicitárias

- **Onde:** `/campaigns` e `/campaigns/:id` (detalhes).
- **Quem acessa:** **manager** ou superior.
- **Como deve funcionar:**
  - **Criar/editar campanhas**: nome, cliente, status (rascunho, ativa, pausada, concluída, cancelada), datas, orçamento (budget) e valor gasto (spent).
  - **Vincular** campanha a **agência** e **projeto** (opcional).
  - **Vincular telas** à campanha (múltiplas telas por campanha).
  - Listagem com **filtros** (status, data, agência) e abas (ex.: Ativas, Concluídas, Todas).
  - Na tela de detalhes: métricas e telas associadas.

---

## 7. Locais (Venues)

- **Onde:** `/venues` e `/venues/:id`.
- **Quem acessa:** **manager** ou superior.
- **Como deve funcionar:**
  - **Listar locais** com filtros (cidade, estado, tipo) e busca por nome.
  - **Tipos hierárquicos**: parent → child → grandchildren (ex.: Clínica Médica → Cardiologia → Consultório).
  - **Detalhes do venue**: nome, endereço, telas associadas, estatísticas (total de telas, ativas/inativas, classes, especialidades).
  - Visualização em **mapa** das telas do venue.
  - Modo de exibição em **grid** ou **lista**.

---

## 8. Mapa interativo e heatmap

### 8.1 Mapa interativo

- **Onde:** `/mapa-interativo`.
- **Como deve funcionar:**
  - Mapa com **pontos** (telas) geolocalizados.
  - **Filtros** por cidade, estado, tipo de local, especialidade médica.
  - **Busca geoespacial**: por endereço (autocomplete) ou **CEP** (com/sem hífen), com **raio em km** (ex.: 1–50 km). Sistema converte endereço/CEP em coordenadas (Google/ViaCEP) e lista telas dentro do raio.
  - **Proximidade venue–farmácia**: filtro por “farmácia a até X km” do venue (uso da view e RPCs de distância); no mapa, é possível exibir apenas farmácias dentro do raio selecionado.
  - **Clustering** de marcadores quando há muitos pontos.
  - Cálculo de **audiência/alcance** quando aplicável.
  - Página de **resultados de busca**: `/resultados` (pode ser pública para compartilhamento de buscas).

### 8.2 Heatmap

- **Onde:** `/heatmap` (página dedicada). Rotas de teste: `/test-heatmap`, `/simple-heatmap`.
- **Como deve funcionar:**
  - Mapa de **calor** (densidade de telas ou de uso).
  - Filtros por cidade, estado, classe de tela, status (ativa/inativa).
  - Intensidade baseada em dados agregados (ex.: número de propostas por tela); cores indicam densidade (ex.: azul → verde → amarelo → vermelho).
  - Alternância entre visualização **heatmap** e **marcadores**.

---

## 9. Inventário de telas

- **Onde:** `/inventory`.
- **Como deve funcionar:**
  - **Listar e gerenciar** telas digitais: código, nome, cidade, estado, endereço, classe (A, B, C, etc.), tipo, status (ativo/inativo), especialidades, coordenadas.
  - **Campos por tela (inventário, venues, relatórios e propostas):**
    - **Ambiente**: tipo/característica do ambiente (ex.: sala de espera, consultório).
    - **Audiências segmentadas**: pacientes, local, HCP (Healthcare Professionals), médica (valores mensais).
    - **Aceita convênio**: indicador sim/não para o local.
    - **Audiência mensal** (audience_monthly): valor editável de audiência do ponto.
  - **Cadastro/edição** de telas; upload de **imagens** de telas (validação de tipo/tamanho, URL pública no Storage).
  - **Importação em massa**: upload de arquivo **CSV/Excel** (template disponível); validação de campos (classes permitidas, coordenadas, códigos únicos); normalização de especialidades; preview antes de importar; criação de venues se necessário.
  - **Exportação** do inventário (ex.: Excel).
  - Duplicatas por código devem ser detectadas e tratadas (ex.: ignorar ou avisar).

---

## 10. Farmácias

- **Onde:** `/farmacias`.
- **Como deve funcionar:**
  - **CRUD** de farmácias: razão social, nome fantasia, CNPJ, endereço completo (tipo logradouro, número, complemento, bairro, cidade, UF, CEP), grupo, coordenadas (lat/lng).
  - **Geolocalização**: integração com Google (geocoding) para preencher endereço formatado e coordenadas.
  - **Importação em massa** e **exportação para Excel**.
  - Listagem com **filtros** (cidade, UF, grupo, busca) e **paginação**.
  - Indicador de registros **pendentes de mapeamento** (sem coordenadas).

---

## 11. Profissionais da saúde

- **Onde:** `/profissionais-saude`.
- **Como deve funcionar:**
  - **Cadastro** de profissionais: nome, tipo de profissional, tipo/registro profissional, e-mail, telefone, ativo.
  - **Vínculos** com **venues** (unidades): um profissional pode estar vinculado a vários locais, com **cargo na unidade** e status ativo/inativo.
  - **Listagem** com busca (nome, registro, tipo) e filtros.
  - Diálogos para **criar/editar** profissional e para **gerenciar vínculos** com venues.
  - Badges de status (ativo/inativo) e exibição dos vínculos (ex.: popover).

---

## 12. Agências e projetos

### 12.1 Agências

- **Onde:** `/agencias`.
- **Quem acessa:** **manager** ou superior.
- **Como deve funcionar:**
  - **CRUD** de agências: nome, tipo, CNPJ, site, observações, ativo.
  - **Contatos** por agência (nome, cargo, e-mail, telefone).
  - Agência criada pode ser **vinculada a projetos**.

### 12.2 Projetos (por agência)

- **Onde:** `/agencias/projetos` e `/gerenciamento-projetos`.
- **Como deve funcionar:**
  - **Projetos** vinculados a agência: nome, descrição, status, prioridade, datas, orçamento, valor gasto, progresso (%).
  - **Marcos (milestones)** por projeto: nome, descrição, data prevista, data conclusão, status (pendente, em andamento, concluído, cancelado).
  - Acompanhamento de orçamento e progresso.

### 12.3 Pessoas por projeto

- **Onde:** `/pessoas-projeto`.
- **Quem acessa:** **admin** ou superior.
- **Como deve funcionar:**
  - **Associar pessoas** a projetos (equipe do projeto), com papéis definidos.
  - Pessoas associadas aparecem no contexto do projeto e podem ser usadas em propostas tipo “projeto” e em permissões (ex.: cliente vê projetos em que está como pessoa).

---

## 13. Usuários e administração

### 13.1 Gestão de usuários

- **Onde:** `/users`.
- **Quem acessa:** **admin** ou superior.
- **Como deve funcionar:**
  - Listar usuários; **criar/editar** usuário e **atribuir roles** (respeitando hierarquia; apenas **super_admin** altera roles sensíveis).
  - Alterações persistem em `profiles` e `user_roles`; RLS e triggers (ex.: `prevent_role_escalation`) garantem que apenas super_admin mude certas roles.

### 13.2 Monitor de sessões (User Management)

- **Onde:** `/user-management`.
- **Quem acessa:** **super_admin** apenas.
- **Como deve funcionar:**
  - Lista de **usuários online** e **histórico de sessões** (quando o recurso estiver ativo).
  - Exibição de tempo de sessão, última atividade, navegador, dispositivo, IP (se disponível).
  - **Nota:** Este módulo pode estar temporariamente desabilitado por estabilidade (evitar polling excessivo); quando reativado, deve usar rate limiting e, idealmente, WebSockets.

---

## 14. Modelos de impacto

- **Onde:** `/impact-models`.
- **Quem acessa:** **admin** ou superior.
- **Como deve funcionar:**
  - **CRUD** de modelos de impacto: nome, descrição, nível de tráfego (Baixo, Médio, Alto, Muito Alto), **multiplicador**, exemplos, esquema de cores (fundo, texto, borda).
  - Definir modelo **padrão** e **ativo/inativo**.
  - Estatísticas de **uso** (quantas propostas usam cada modelo).
  - **Não** permitir excluir modelo que esteja em uso; permitir desativar.

---

## 15. Relatórios

- **Onde:** `/reports`.
- **Quem acessa:** **manager** ou superior.
- **Como deve funcionar:**
  - Relatórios por **performance de propostas** (conversão, valor médio, aceitas vs rejeitadas, top agências).
  - **Analytics de telas** (distribuição por classe, telas mais usadas, análise geográfica).
  - **Performance de e-mails** (entrega, pendentes, falhas).
  - **Análise financeira** (receita por período, ticket médio, ROI por campanha).
  - **Proximidade venue–farmácia**: relatórios por especialidade e raio (ex.: quantidade de venues/telas com farmácia a até X km), quando disponível.
  - **Filtros** por período, status, agência, classe, região.
  - **Exportação** em PDF, Excel, CSV, PNG (gráficos), conforme implementado.

---

## 16. E-mails e notificações

- **Como deve funcionar:**
  - Ao mudar proposta para **“enviada”**, um registro é criado na **fila de e-mails** (`email_logs`) para envio ao cliente.
  - **Edge Function** processa a fila (ex.: periodicamente ou sob demanda), envia via **SendGrid** (primário) ou **Resend** (fallback) e atualiza status (enviado/falha).
  - Logs de envio e erros ficam disponíveis para auditoria e relatórios de e-mail.

---

## 17. Integrações externas

- **Supabase:** Auth, Database, Storage, Edge Functions.
- **Google Maps / Geocoding:** endereços, lugares, mapas.
- **ViaCEP:** validação e preenchimento por CEP (sem chave).
- **SendGrid / Resend:** envio de e-mails.
- **Mapbox:** tokens e mapas (quando usado).
- **Geração de PDF:** Edge Function para proposta em PDF.

---

## 18. Resumo das rotas por módulo

| Módulo              | Rotas principais                                      | Acesso mínimo |
|---------------------|--------------------------------------------------------|---------------|
| Login / conta       | `/`, `/login`, `/reset-password`, `/profile`, `/settings` | Público / user |
| Dashboard           | `/dashboard`, `/dashboard-old`                         | user          |
| Propostas           | `/nova-proposta`, `/propostas`, `/propostas/:id`       | user          |
| Campanhas           | `/campaigns`, `/campaigns/:id`                         | manager       |
| Venues              | `/venues`, `/venues/:id`                               | manager       |
| Mapa / Heatmap      | `/mapa-interativo`, `/heatmap`, `/resultados`          | user          |
| Inventário          | `/inventory`                                           | user          |
| Farmácias           | `/farmacias`                                           | user          |
| Prof. saúde         | `/profissionais-saude`                                | user          |
| Agências / Projetos | `/agencias`, `/agencias/projetos`, `/gerenciamento-projetos`, `/pessoas-projeto` | manager / admin |
| Usuários            | `/users`                                               | admin         |
| User Management     | `/user-management`                                     | super_admin   |
| Modelos de impacto  | `/impact-models`                                       | admin         |
| Relatórios          | `/reports`                                             | manager       |

---

## 19. Comportamentos gerais esperados

1. **Segurança:** Todas as telas sensíveis atrás de login; rotas protegidas verificam role; RLS no banco garante que cada usuário acesse só o que sua role permite.
2. **Validação:** Formulários validam campos obrigatórios e formatos (e-mail, CNPJ, CEP, datas, números) antes de salvar.
3. **Feedback:** Sucesso/erro em operações (toast/notificação); mensagens de erro claras em falhas de rede ou permissão.
4. **Performance:** Listagens com paginação e filtros; mapas com clustering quando há muitos pontos; importações em lote com preview e tratamento de erros.
5. **Responsividade:** Uso em desktop e tablet; componentes se adaptam ao tamanho da tela.

**Última atualização:** 12/02/2026 (v1.4 – campos de telas ambiente/audiências/aceita_convenio, venue–farmácia).

Este documento reflete o **comportamento esperado** das funcionalidades. Para detalhes técnicos de banco de dados, APIs e deploy, consulte `docs/PRD.md`, `Sistema_Mapeado.md` e os guias na raiz do projeto.
