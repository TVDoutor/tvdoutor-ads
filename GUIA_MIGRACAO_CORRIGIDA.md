# 🔧 Guia de Migração Corrigida - Pessoas do Projeto

## 🚨 Problema Identificado

O erro que você está vendo acontece porque:
1. A tabela `agencia_projetos` tem referências para IDs que não existem na tabela `pessoas_projeto`
2. A chave estrangeira está tentando validar essas referências inválidas

## ✅ Solução

Criei um script corrigido que:
1. **Limpa as referências inválidas** primeiro
2. **Cria a tabela** `pessoas_projeto`
3. **Recria a chave estrangeira** corretamente
4. **Insere dados de exemplo** para testar

## 📋 Passos para Aplicar a Migração Corrigida

### 1. Acesse o Supabase Dashboard
- Vá para: https://supabase.com/dashboard/project/vaogzhwzucijiyvyglls/sql
- Faça login na sua conta

### 2. Execute o Script Corrigido
- **NÃO** use o arquivo `APLICAR_MIGRACAO_PESSOAS_PROJETO.sql`
- **USE** o arquivo `CORRIGIR_MIGRACAO_PESSOAS_PROJETO.sql`
- Copie todo o conteúdo e cole no Editor SQL
- Clique em "Run" para executar

### 3. Verifique os Resultados
Você deve ver:
- ✅ "Migração aplicada com sucesso! Tabela pessoas_projeto criada e dados de exemplo inseridos."
- ✅ Lista das colunas da tabela `pessoas_projeto`
- ✅ `total_pessoas: 3` (João Silva, Maria Santos, Pedro Oliveira)
- ✅ `projetos_sem_responsavel: X` (projetos que tiveram responsável limpo)

## 🧪 Teste a Funcionalidade

### 1. Teste a Página de Pessoas
- Acesse `/pessoas-projeto`
- Deve mostrar 3 pessoas de exemplo
- Teste criar uma nova pessoa

### 2. Teste o Formulário de Projetos
- Acesse `/agencias/projetos`
- Clique em "Novo Projeto"
- No campo "Responsável do Projeto", deve aparecer as 3 pessoas

### 3. Teste Editar/Remover
- Tente editar uma pessoa existente
- Tente remover uma pessoa
- Tudo deve funcionar normalmente

## 🔍 O que o Script Faz

1. **Remove constraint antiga** da tabela `agencia_projetos`
2. **Limpa referências inválidas** (define como NULL)
3. **Cria tabela** `pessoas_projeto` com estrutura correta
4. **Recria constraint** com `ON DELETE SET NULL`
5. **Configura segurança** (RLS e políticas)
6. **Cria índices** para performance
7. **Cria trigger** para `updated_at`
8. **Insere dados de exemplo** para testar

## ⚠️ Importante

- **Projetos existentes** que tinham responsáveis inválidos agora terão `responsavel_projeto = NULL`
- Isso é **normal e esperado** - não quebra nada
- Você pode **reatribuir responsáveis** usando a nova lista de pessoas

## 🆘 Se Ainda Houver Problemas

1. **Verifique se executou o script correto**:
   ```sql
   SELECT COUNT(*) FROM public.pessoas_projeto;
   ```
   Deve retornar 3 ou mais.

2. **Verifique as políticas RLS**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'pessoas_projeto';
   ```

3. **Teste uma inserção manual**:
   ```sql
   INSERT INTO public.pessoas_projeto (nome, email) VALUES ('Teste Manual', 'teste@exemplo.com');
   ```

## 📞 Próximos Passos

Após aplicar a migração:
1. ✅ A funcionalidade de adicionar pessoas deve funcionar
2. ✅ O formulário de projetos deve mostrar a lista de pessoas
3. ✅ Você pode começar a usar o sistema normalmente

Me informe se funcionou ou se ainda há algum problema!
