# Plano de Testes - TVDoutor ADS

## Objetivo
Validar o funcionamento do sistema web, cobrindo fluxos criticos de negocio, seguranca de acesso, integracoes externas e geracao de artefatos (PDF/exports).

## Escopo
### Incluido
- Autenticacao, reset de senha e autorizacao por role.
- Dashboard e indicadores.
- Propostas (wizard, listagem, detalhes, PDF).
- Campanhas e venues.
- Inventario e telas (upload de imagens).
- Mapas e heatmap.
- Agencias, projetos e pessoas por projeto.
- Usuarios e modelos de impacto.
- Relatorios e exportacoes.
- Perfil e configuracoes.

### Fora de escopo
- Modulo financeiro completo.
- Aplicativo mobile nativo.
- BI avancado.

## Estrategia
- **Smoke**: garantir login e navegacao basica.
- **Funcional**: validacoes de negocio por modulo.
- **Permissoes**: testes de acesso por role.
- **Integracoes**: Supabase, mapas, geocoding, email.
- **Nao funcional**: performance de listagens e mapas em cenarios com alto volume.

## Ambientes
- **Desenvolvimento**: local (Vite).
- **Staging/Preview**: deploy preview se disponivel.
- **Producao**: apenas smoke controlado.

## Dados de teste
- Usuarios por role: user, client, manager, admin, super_admin.
- Campanhas, proposals, venues e telas com dados minimamente validos.
- CEPs validos/invalidos para geocoding.
- Imagens dentro e acima do limite de tamanho.

## Casos de teste por modulo
### Autenticacao e acesso
- [ ] Login com credenciais validas.
- [ ] Login com senha invalida.
- [ ] Reset de senha com email valido/invalido.
- [ ] Acesso a rota protegida sem login.
- [ ] Acesso a rota protegida com role insuficiente.

### Dashboard
- [ ] Renderizacao dos cards sem erro.
- [ ] Atualizacao de dados via chamadas backend.

### Propostas
- [ ] Wizard bloqueia avancar sem campos obrigatorios.
- [ ] Salvar proposta e aparecer na listagem.
- [ ] Abrir detalhes e visualizar dados completos.
- [ ] Gerar PDF sem erro e com layout valido.

### Campanhas e venues
- [ ] Criar campanha e editar dados basicos.
- [ ] Vincular venue a campanha.
- [ ] Visualizar detalhes completos.

### Inventario e telas
- [ ] Criar/editar item de inventario.
- [ ] Upload de imagem valida (tipo/tamanho).
- [ ] Upload invalido (tipo/tamanho) retorna erro.

### Mapas e geodados
- [ ] Carregar mapa interativo com pontos.
- [ ] Filtrar pontos e atualizar mapa.
- [ ] Heatmap com dados agregados.
- [ ] Geocoding resolve endereco/CEP valido.

### Agencias e projetos
- [ ] Criar agencia.
- [ ] Associar agencia a projeto.
- [ ] Gerenciar pessoas por projeto.

### Usuarios e modelos de impacto
- [ ] Admin cria/edita usuario e role.
- [ ] Super_admin acessa telas restritas.
- [ ] Criar/editar modelo de impacto.

### Relatorios e exportacoes
- [ ] Gerar relatorio com filtros.
- [ ] Exportar relatorio para formato definido.

### Perfil e configuracoes
- [ ] Atualizar dados do perfil.
- [ ] Alterar senha com validacao.

## Casos por role (checklist executavel)
### User
- [ ] Acessa `/dashboard` e visualiza cards.
- [ ] Cria proposta basica no wizard e salva.
- [ ] Visualiza listagem de propostas e aplica filtro.
- [ ] Acessa `/profile` e atualiza dados pessoais.
- [ ] Nao acessa rotas admin/manager (bloqueio confirmado).

### Client
- [ ] Visualiza propostas atribuídas e detalhes.
- [ ] Baixa PDF de proposta atribuida.
- [ ] Visualiza dados de campanha atribuida (read-only).
- [ ] Nao acessa rotas admin/manager (bloqueio confirmado).

### Manager
- [ ] Cria/edita campanhas.
- [ ] Cria/edita venues vinculados.
- [ ] Acessa `/reports` e gera relatorio.
- [ ] Usa mapa interativo e heatmap com filtros.

### Admin
- [ ] Acessa `/users` e cria usuario com role.
- [ ] Acessa `/impact-models` e cria modelo.
- [ ] Acessa `/pessoas-projeto` e gerencia pessoas.

### Super_admin
- [ ] Acessa todas as rotas sem bloqueio.
- [ ] Altera roles e valida permissao resultante.
- [ ] Valida configuracoes sensiveis em `/settings`.

## Matriz de rastreabilidade (requisito → caso)
- RF-01 → Autenticacao: Login valido/invalido
- RF-02 → Autenticacao: Reset de senha
- RF-03 → Autenticacao: Acesso por role (User/Client/Manager/Admin/Super_admin)
- RF-04 → Dashboard: Renderizacao e atualizacao de dados
- RF-10 → Propostas: Wizard bloqueios e salvar proposta
- RF-11 → Propostas: Listagem e filtros
- RF-12 → Propostas: Detalhes e PDF
- RF-20 → Campanhas: Criar/editar campanhas
- RF-21 → Campanhas: Vincular venues
- RF-22 → Campanhas: Detalhes completos
- RF-30 → Inventario: CRUD basico
- RF-31 → Inventario: Upload de imagens
- RF-40 → Mapas: Mapa interativo com pontos
- RF-41 → Mapas: Heatmap com filtros
- RF-42 → Mapas: Geocoding endereco/CEP
- RF-50 → Agencias: Criar/associar projetos
- RF-51 → Projetos: Pessoas por projeto
- RF-60 → Usuarios: Criar/editar usuario e role
- RF-61 → Impact models: Criar/editar modelos
- RF-70 → Relatorios: Gerar e exportar
- RF-71 → Email: Envio e registro de comunicacoes

## Criticidade e priorizacao
- **P0**: login, autorizacao, propostas, PDF, campanhas.
- **P1**: mapas, inventario, relatorios.
- **P2**: configuracoes, perfil, itens administrativos.

## Criterios de aceite
- Sem erros bloqueantes em fluxos P0.
- Pelo menos 95% dos casos P0/P1 executados com sucesso.
- Sem regressao de permissao por role.

## Ferramentas
- Testes unitarios existentes (pricing, CEP).
- Scripts e2e de PDF.
- Execucao manual guiada para fluxos criticos.

## Evidencias
- Logs de execucao.
- Capturas de tela dos fluxos P0.
- Relatorio de erros com passos de reproducao.
