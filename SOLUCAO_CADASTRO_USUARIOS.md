# 🔧 Solução para Problema de Cadastro de Usuários

## 🚨 Problema Identificado
- **Erro**: "Database error saving new user"
- **Causa**: O trigger `handle_new_user` está falhando ao criar o perfil do usuário
- **Status**: Sistema funcionando para usuários existentes, problema apenas no cadastro

## 🔍 Diagnóstico Realizado
✅ Conexão com Supabase funcionando  
✅ Tabela `profiles` acessível  
✅ Service Role Key configurada  
❌ Trigger `handle_new_user` falhando  

## 🛠️ Soluções Seguras (Sem Quebrar o Sistema)

### Opção 1: Verificar Dashboard do Supabase
1. **Acesse**: https://supabase.com/dashboard
2. **Vá em**: Seu projeto → Table Editor
3. **Verifique**: Se a tabela `profiles` existe e tem a estrutura correta
4. **Vá em**: Authentication → Policies
5. **Verifique**: As políticas da tabela `profiles`

### Opção 2: Verificar Logs do Supabase
1. **Dashboard** → Logs → Database
2. **Procure por**: Erros relacionados ao trigger `handle_new_user`
3. **Dashboard** → Logs → Auth
4. **Procure por**: Erros de signup

### Opção 3: Testar Login Existente
1. **Tente fazer login** com um usuário que já existe
2. **Se funcionar**: Problema é só no cadastro
3. **Se não funcionar**: Problema mais amplo

## 🔧 Solução Técnica (Aplicar com Cuidado)

### Passo 1: Verificar Políticas RLS
```sql
-- No SQL Editor do Supabase, execute:
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### Passo 2: Verificar Trigger
```sql
-- Verificar se o trigger existe:
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Verificar a função:
SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
```

### Passo 3: Solução Mais Segura
Se as políticas estão muito restritivas, você pode:

1. **Temporariamente desabilitar RLS** na tabela profiles:
```sql
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
```

2. **Testar o cadastro** de um usuário

3. **Reabilitar RLS** com políticas mais permissivas:
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política mais permissiva para INSERT
CREATE POLICY "Allow profile creation" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (true);
```

## ⚠️ IMPORTANTE - Não Quebrar o Sistema

### ❌ NÃO FAÇA:
- Não execute comandos sem entender o que fazem
- Não altere políticas sem backup
- Não desabilite RLS permanentemente
- Não delete dados existentes

### ✅ FAÇA:
- Teste em ambiente de desenvolvimento primeiro
- Faça backup antes de alterações
- Verifique logs antes de mudanças
- Teste com usuário de teste

## 🧪 Teste Seguro

### Criar Usuário de Teste
1. **Use um email de teste**: `teste@exemplo.com`
2. **Senha simples**: `123456`
3. **Teste apenas o cadastro**
4. **Delete o usuário após o teste**

### Verificar se Funcionou
1. **Login com o usuário criado**
2. **Verificar se o perfil foi criado**
3. **Verificar se as permissões estão corretas**

## 📞 Próximos Passos Recomendados

1. **Primeiro**: Verifique o Dashboard do Supabase
2. **Segundo**: Identifique exatamente qual política está bloqueando
3. **Terceiro**: Teste uma solução em ambiente de desenvolvimento
4. **Quarto**: Só aplique em produção após validação

## 🆘 Se Algo Der Errado

### Rollback Rápido
```sql
-- Reverter para políticas mais permissivas
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;

-- Política original (se existir)
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);
```

### Contato de Emergência
- **Supabase Support**: https://supabase.com/support
- **Documentação**: https://supabase.com/docs/guides/auth

## 📋 Checklist de Segurança

- [ ] Backup do banco de dados
- [ ] Teste em ambiente de desenvolvimento
- [ ] Verificação de logs
- [ ] Plano de rollback
- [ ] Teste com usuário de teste
- [ ] Validação de funcionamento
- [ ] Aplicação em produção

---

**⚠️ LEMBRE-SE**: O sistema está funcionando para usuários existentes. O problema é específico do cadastro. Seja cuidadoso com as alterações para não quebrar o que já está funcionando.
