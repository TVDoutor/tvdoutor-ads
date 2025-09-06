# Como Aplicar a Migração - Pessoas do Projeto

## 🚨 IMPORTANTE: A migração precisa ser aplicada no banco de dados

O erro que você está vendo (`Could not find the table 'public.pessoas_projeto'`) acontece porque a tabela ainda não foi criada no banco de dados.

## 📋 Passos para Aplicar a Migração

### 1. Acesse o Supabase Dashboard
- Vá para: https://supabase.com/dashboard/project/vaogzhwzucijiyvyglls/sql
- Faça login na sua conta

### 2. Execute o Script SQL
- Copie todo o conteúdo do arquivo `APLICAR_MIGRACAO_PESSOAS_PROJETO.sql`
- Cole no Editor SQL do Supabase
- Clique em "Run" para executar

### 3. Verifique se Funcionou
- Você deve ver a mensagem: "Migração aplicada com sucesso! Tabela pessoas_projeto criada."
- A tabela `pessoas_projeto` deve aparecer na lista de tabelas

## 🔧 Alternativa: Via Supabase CLI (se tiver senha)

Se você souber a senha do banco de dados:

```bash
# No terminal, no diretório do projeto
.\supabase db push
```

## ✅ Após Aplicar a Migração

1. **Recarregue a página** `/pessoas-projeto`
2. **Teste criar uma pessoa**:
   - Clique em "Nova Pessoa"
   - Preencha o nome (obrigatório)
   - Preencha email, telefone, cargo (opcionais)
   - Selecione uma agência (opcional)
   - Clique em "Criar"

3. **Teste o formulário de projetos**:
   - Vá para `/agencias/projetos`
   - Clique em "Novo Projeto"
   - No campo "Responsável do Projeto", deve aparecer a pessoa criada

## 🐛 Se Ainda Houver Problemas

1. **Verifique se a tabela existe**:
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name = 'pessoas_projeto';
   ```

2. **Verifique as políticas RLS**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'pessoas_projeto';
   ```

3. **Teste uma inserção manual**:
   ```sql
   INSERT INTO public.pessoas_projeto (nome, email) VALUES ('Teste', 'teste@exemplo.com');
   ```

## 📞 Suporte

Se precisar de ajuda, me informe:
- Qual erro específico está aparecendo
- Se a migração foi executada com sucesso
- Se consegue ver a tabela no dashboard do Supabase
