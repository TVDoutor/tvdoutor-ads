# Implementação: Sistema de Pessoas do Projeto

## Resumo da Implementação

Esta implementação desacopla o campo "Responsável pelo Projeto" da tabela de usuários do sistema, criando uma tabela dedicada para contatos que podem ser responsáveis por projetos.

## Arquivos Criados/Modificados

### 1. Banco de Dados
- **`supabase/migrations/20250120000001_create_pessoas_projeto_table.sql`** - Migração para criar a nova tabela e alterar a estrutura existente

### 2. Tipos TypeScript
- **`src/types/agencia.ts`** - Adicionados tipos para `PessoaProjeto`, `PessoaProjetoInsert`, `PessoaProjetoUpdate`

### 3. Serviços
- **`src/lib/pessoas-projeto-service.ts`** - Serviço completo para CRUD de pessoas do projeto

### 4. Componentes
- **`src/components/PessoaProjetoSelector.tsx`** - Componente selector para escolher pessoas do projeto
- **`src/pages/PessoasProjeto.tsx`** - Página de gerenciamento (apenas para administradores)

### 5. Páginas Modificadas
- **`src/pages/AgenciasProjetos.tsx`** - Atualizado para usar o novo selector de pessoas
- **`src/App.tsx`** - Adicionada rota para `/pessoas-projeto`
- **`src/components/Sidebar.tsx`** - Adicionado item de menu para "Pessoas do Projeto"

## Como Aplicar a Migração

### Opção 1: Via Supabase CLI (Recomendado)
```bash
# No diretório do projeto
supabase db push
```

### Opção 2: Via Editor SQL do Supabase
1. Acesse o painel do Supabase
2. Vá para "SQL Editor"
3. Execute o conteúdo do arquivo `supabase/migrations/20250120000001_create_pessoas_projeto_table.sql`

## Funcionalidades Implementadas

### ✅ 1. Tabela `pessoas_projeto`
- Campos: `id`, `nome`, `email`, `telefone`, `cargo`, `agencia_id`, `created_at`, `updated_at`
- Chave estrangeira opcional para `agencias`
- Índices para performance
- Trigger para atualizar `updated_at`

### ✅ 2. Segurança (RLS)
- **Leitura**: Qualquer usuário autenticado pode ver a lista de pessoas
- **Escrita/Modificação**: Apenas administradores podem gerenciar pessoas
- Políticas baseadas na função `is_admin()`

### ✅ 3. Alteração na Tabela `agencia_projetos`
- Removida chave estrangeira para `auth.users`
- Adicionada chave estrangeira para `pessoas_projeto`
- `ON DELETE SET NULL` para não quebrar projetos existentes

### ✅ 4. Interface de Gerenciamento
- Página `/pessoas-projeto` (apenas para administradores)
- CRUD completo: Criar, Listar, Editar, Remover
- Formulário com validação
- Interface responsiva e intuitiva

### ✅ 5. Integração com Formulários de Projeto
- Novo componente `PessoaProjetoSelector`
- Substitui o `UserSelector` nos formulários de projeto
- Exibe nome, cargo e email das pessoas
- Filtro opcional por agência

## Critérios de Aceite - Status

### ✅ Um administrador consegue acessar a nova tela de "Pessoas"
- Rota `/pessoas-projeto` protegida por `requiredRole="Admin"`
- Verificação adicional de permissão na página

### ✅ Criar, editar e excluir um contato com sucesso
- Formulário completo com validação
- Operações CRUD implementadas
- Feedback visual com toasts

### ✅ Um usuário não-administrador não consegue acessar a tela
- Proteção por rota e verificação de permissão
- Mensagem de "Acesso Restrito" para não-admins

### ✅ Campo "Responsável do Projeto" lista contatos da nova tabela
- `PessoaProjetoSelector` substitui `UserSelector`
- Carrega dados de `pessoas_projeto`

### ✅ Projeto pode ser salvo com responsável da nova lista
- Formulário atualizado para usar nova fonte de dados
- ID correto é gravado na tabela `agencia_projetos`

### ✅ Se responsável é excluído, campo fica null (não quebra)
- Chave estrangeira com `ON DELETE SET NULL`
- Projetos existentes não são afetados

## Como Testar

### 1. Aplicar a Migração
```bash
supabase db push
```

### 2. Testar como Administrador
1. Faça login como administrador
2. Acesse `/pessoas-projeto`
3. Crie uma nova pessoa
4. Edite uma pessoa existente
5. Remova uma pessoa

### 3. Testar como Usuário Normal
1. Faça login como usuário normal
2. Tente acessar `/pessoas-projeto`
3. Deve ver mensagem de "Acesso Restrito"

### 4. Testar Formulário de Projeto
1. Acesse `/agencias/projetos`
2. Clique em "Novo Projeto"
3. No campo "Responsável do Projeto", deve aparecer a lista de pessoas cadastradas
4. Selecione uma pessoa e salve o projeto

### 5. Testar Integridade dos Dados
1. Crie um projeto com um responsável
2. Remova o responsável da lista de pessoas
3. Verifique que o projeto ainda existe, mas com responsável null

## Benefícios da Implementação

### 🔒 Segurança
- Não expõe lista completa de usuários do sistema
- Controle granular de permissões
- Dados sensíveis protegidos

### 🎯 Flexibilidade
- Permite cadastrar responsáveis que não são usuários do sistema
- Vinculação opcional a agências
- Campos adicionais (telefone, cargo) para melhor identificação

### 🚀 Performance
- Índices otimizados para consultas
- Queries mais eficientes
- Menos dados transferidos para o front-end

### 🛠️ Manutenibilidade
- Código bem estruturado e documentado
- Separação clara de responsabilidades
- Tipos TypeScript para segurança de tipos

## Próximos Passos (Opcionais)

1. **Migração de Dados Existentes**: Criar script para migrar responsáveis existentes da tabela `profiles` para `pessoas_projeto`

2. **Validação de Email**: Implementar validação de email único

3. **Histórico de Alterações**: Adicionar auditoria de mudanças

4. **Importação em Lote**: Permitir importação de pessoas via CSV

5. **Notificações**: Enviar emails quando uma pessoa é designada como responsável

## Troubleshooting

### Erro de Permissão
- Verifique se o usuário tem role `admin` ou `super_admin`
- Confirme que as políticas RLS estão ativas

### Erro de Chave Estrangeira
- Verifique se a migração foi aplicada corretamente
- Confirme que a tabela `pessoas_projeto` existe

### Selector Não Carrega Pessoas
- Verifique se há pessoas cadastradas na tabela
- Confirme que o usuário tem permissão de leitura

### Projeto Não Salva
- Verifique se o ID da pessoa é válido
- Confirme que a chave estrangeira está configurada corretamente
