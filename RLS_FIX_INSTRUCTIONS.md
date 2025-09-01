# 🔧 Instruções para Corrigir Permissões RLS no Supabase

## Problema Identificado
O usuário "hildebrando.cardoso" com role "Admin" está recebendo erro `403 Forbidden` com mensagem "permission denied for table screens".

## Diagnóstico
Execute o botão "Debug" no Mapa Interativo para verificar:
1. Status da autenticação
2. Permissões do usuário
3. Acesso às tabelas

## Soluções Possíveis

### 1. Verificar Políticas RLS na Tabela `screens`

Execute no SQL Editor do Supabase:

```sql
-- Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'screens';

-- Verificar políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'screens';
```

### 2. Criar Política para Administradores

Se não existir política adequada, execute:

```sql
-- Política para administradores acessarem todas as telas
CREATE POLICY "admin_access_all_screens" ON screens
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Política para usuários autenticados verem telas ativas
CREATE POLICY "authenticated_users_view_active_screens" ON screens
FOR SELECT USING (
  auth.role() = 'authenticated' 
  AND active = true
);
```

### 3. Verificar Metadata do Usuário

Execute para verificar se o role está correto:

```sql
-- Verificar metadata do usuário
SELECT 
  id,
  email,
  raw_user_meta_data,
  created_at
FROM auth.users 
WHERE email = 'hildebrando.cardoso@tvdoutor.com.br';
```

### 4. Atualizar Role do Usuário (se necessário)

```sql
-- Atualizar role do usuário
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'hildebrando.cardoso@tvdoutor.com.br';
```

### 5. Verificar Função de Permissões

Criar função para verificar permissões:

```sql
-- Função para verificar permissões do usuário
CREATE OR REPLACE FUNCTION get_user_permissions()
RETURNS TABLE (
  user_id uuid,
  user_email text,
  user_role text,
  can_read_screens boolean,
  can_write_screens boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'role', 'user') as role,
    EXISTS (
      SELECT 1 FROM pg_policies p 
      WHERE p.tablename = 'screens' 
      AND p.cmd = 'SELECT'
      AND p.roles @> ARRAY[u.role]::name[]
    ) as can_read,
    EXISTS (
      SELECT 1 FROM pg_policies p 
      WHERE p.tablename = 'screens' 
      AND p.cmd IN ('INSERT', 'UPDATE', 'DELETE')
      AND p.roles @> ARRAY[u.role]::name[]
    ) as can_write
  FROM auth.users u
  WHERE u.id = auth.uid();
END;
$$;
```

## Passos para Resolver

1. **Acesse o Dashboard do Supabase**
2. **Vá para SQL Editor**
3. **Execute os comandos de verificação**
4. **Crie as políticas necessárias**
5. **Teste o acesso novamente**

## Verificação Final

Após aplicar as correções:

1. Execute o botão "Debug" no Mapa Interativo
2. Verifique se não há mais erros de permissão
3. Teste o acesso ao Inventário

## Logs Úteis

Monitore os logs no console do navegador para ver:
- Status da autenticação
- Dados do usuário
- Erros específicos de permissão
- Tabelas acessíveis

## Contato

Se o problema persistir, verifique:
- Configurações de RLS no Supabase
- Políticas de segurança
- Metadata do usuário
- Tokens de autenticação
