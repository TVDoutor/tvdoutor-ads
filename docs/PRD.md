# PRD - TVDoutor ADS

## Visao geral
Sistema web para gestao de propostas, campanhas e ativos de midia da TVDoutor, com mapas, relatorios e controle de acesso por perfis. A aplicacao e um frontend React/Vite integrado ao Supabase (Auth, Database, Storage).

## Objetivos
- Centralizar criacao, aprovacao e acompanhamento de propostas comerciais.
- Gerenciar campanhas, locais (venues), telas e inventario com visao geoespacial.
- Oferecer relatorios e exportacoes para tomada de decisao.
- Garantir governanca por perfis de acesso e auditoria basica.

## Personas e perfis
- **Usuario**: acesso basico a funcionalidades gerais.
- **Cliente**: visualiza propostas e projetos atribuidos.
- **Manager**: cria/edita campanhas, locais, relatorios e operacao.
- **Admin**: gerencia usuarios e dados administrativos.
- **Super admin**: acesso total e configuracoes sensiveis.

## Escopo
### Incluido
- Autenticacao, controle de acesso e reset de senha.
- Dashboard e metricas operacionais.
- Propostas: criacao (wizard), listagem, detalhes, exportacao/PDF.
- Campanhas e locais (venues) com visao e detalhes.
- Inventario de telas e farmacias.
- Mapa interativo e heatmap geoespacial.
- Agencias, projetos e pessoas por projeto.
- Usuarios, perfis e roles.
- Modelos de impacto.
- Relatorios e exportacoes.
- Perfil e configuracoes da conta.
- Integracao com email e notificacoes basicas.

### Fora de escopo (por enquanto)
- Modulo financeiro completo (faturamento, notas).
- Mobile app nativo.
- BI avancado e data warehouse.
- Marketplace externo de dados/terceiros.
- Motor de recomendacao automatica.

### Assuncaoes e restricoes
- O backend principal e o Supabase, com RLS como camada base de seguranca.
- O sistema e focado em operacao web (desktop-first).
- As integracoes externas dependem de chaves e limites de terceiros.

## Mapeamento funcional (rotas e modulos)
- Publico: `/login`, `/reset-password`, `/resultados`.
- Dashboard: `/dashboard`.
- Propostas: `/nova-proposta`, `/propostas`, `/propostas/:id`.
- Campanhas: `/campaigns`, `/campaigns/:id`.
- Locais: `/venues`, `/venues/:id`.
- Mapa: `/mapa-interativo`, `/heatmap`.
- Inventario: `/inventory`, `/farmacias`.
- Agencias: `/agencias`, `/agencias/projetos`.
- Projetos: `/gerenciamento-projetos`, `/pessoas-projeto`.
- Usuarios: `/users`, `/user-management`.
- Modelos de impacto: `/impact-models`.
- Perfil/Config: `/profile`, `/settings`.
- Relatorios: `/reports`.

## Requisitos por modulo e criterios de aceite
### Autenticacao e acesso
- RF-01: Autenticar usuario com email/senha via Supabase.
  - CA-01: Com credenciais validas, usuario acessa `/dashboard`.
  - CA-02: Com credenciais invalidas, exibir erro sem criar sessao.
- RF-02: Recuperar senha via email.
  - CA-03: Sistema envia email de reset com link valido.
  - CA-04: Ao redefinir, usuario consegue logar com nova senha.
- RF-03: Restringir rotas por perfil (user/client/manager/admin/super_admin).
  - CA-05: Usuario sem role exigida recebe redirecionamento ou bloqueio.
  - CA-06: Usuario com role exigida acessa a rota sem erro.

### Dashboard
- RF-04: Exibir indicadores principais e dados resumidos.
  - CA-07: Cards mostram dados e atualizam sem erro de permissao.

### Propostas
- RF-10: Criar proposta via wizard com validacoes.
  - CA-08: Campos obrigatorios bloqueiam avancar quando invalidos.
  - CA-09: Proposta salva cria registro acessivel em `/propostas`.
- RF-11: Listar propostas com filtros.
  - CA-10: Filtros retornam lista coerente com criterios selecionados.
- RF-12: Visualizar detalhes e gerar PDF.
  - CA-11: Detalhe abre com dados completos da proposta.
  - CA-12: Exportacao gera PDF sem erro e com layout esperado.

### Campanhas e locais (venues)
- RF-20: Criar e editar campanhas.
  - CA-13: Campanha salva aparece na listagem.
- RF-21: Gerenciar locais/venues vinculados a campanhas.
  - CA-14: Vinculo campanha-venue e persistido e exibido no detalhe.
- RF-22: Exibir detalhes de campanha e venue.
  - CA-15: Detalhes mostram informacoes basicas e status atualizado.

### Inventario e telas
- RF-30: Gerenciar inventario e telas.
  - CA-16: Cadastro/edicao reflete em listagens e detalhes.
- RF-31: Upload e armazenamento de imagens de telas.
  - CA-17: Upload valida tipo/tamanho e retorna URL publica.

### Mapas e geodados
- RF-40: Exibir mapa interativo com pontos.
  - CA-18: Mapa carrega e renderiza pontos sem erros.
- RF-41: Exibir heatmap com dados agregados.
  - CA-19: Heatmap responde a filtros e atualiza densidade.
- RF-42: Geocodificar enderecos/CEP quando necessario.
  - CA-20: Endereco incompleto e resolvido em coordenadas validas.

### Agencias e projetos
- RF-50: Cadastrar agencias e associar projetos.
  - CA-21: Agencia criada pode ser vinculada a projeto existente.
- RF-51: Gerenciar pessoas por projeto.
  - CA-22: Pessoas associadas aparecem no contexto do projeto.

### Usuarios e administracao
- RF-60: Gerenciar usuarios (admin/super_admin).
  - CA-23: Admin cria/edita usuario e role com persistencia.
- RF-61: Configurar modelos de impacto.
  - CA-24: Modelos salvos ficam disponiveis em propostas/relatorios.

### Relatorios e comunicacao
- RF-70: Gerar relatorios e exportacoes.
  - CA-25: Relatorio exporta em formato definido sem erro.
- RF-71: Enviar comunicacoes por email.
  - CA-26: Email e enviado e logado no sistema.

## Requisitos nao funcionais
- RNF-01: UX responsiva para uso em desktop e tablet.
- RNF-02: Performance de listagens com paginacao e filtros.
- RNF-03: Logs de erros e eventos de autenticacao.
- RNF-04: Seguranca com RLS no Supabase e validacoes no cliente.
- RNF-05: Disponibilidade para uso comercial (SLA interno).

## Fluxos principais
- **Login**: usuario entra -> sessao ativa -> redireciona para dashboard.
- **Nova proposta**: usuario cria proposta -> valida dados -> salva -> gera PDF.
- **Campanha**: cria campanha -> associa venues -> acompanha indicadores.
- **Mapa**: consulta pontos -> filtra -> visualiza heatmap.

## Modelo de dados (alto nivel)
- Usuarios/Profiles e Roles.
- Propostas e itens relacionados.
- Campanhas, venues e telas.
- Inventario e farmacias.
- Agencias, projetos e pessoas.
- Modelos de impacto e relatorios.

## Integracoes
- Supabase (Auth, Database, Storage).
- Mapbox/Leaflet (mapas e visualizacoes).
- Resend/SendGrid (email).
- Google Maps/Geocoding e ViaCEP (enderecos).
- html2pdf/Puppeteer (PDF).

## Metricas de sucesso
- Tempo medio de criacao de proposta.
- Taxa de conversao de propostas.
- Uso de mapas/heatmap por usuario.
- Tempo de resposta em listagens criticas.

## Riscos e mitigacoes
- **Risco**: dados inconsistentes entre telas e propostas.  
  **Mitigacao**: normalizacao e validacoes centralizadas.
- **Risco**: performance em mapas com muitos pontos.  
  **Mitigacao**: agregacao e clusterizacao.
- **Risco**: falhas de email.  
  **Mitigacao**: retries e logs.

## Testes (alvo)
- Unitarios para calculos de precificacao e CEP.
- Fluxo e2e para geracao de PDF.
