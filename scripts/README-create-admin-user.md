# Scripts para Criação de Usuário Admin

Este diretório contém scripts para criar usuários administradores no sistema TV Doutor ADS.

## Opções Disponíveis

### 1. Supabase Edge Function (Recomendado)

**Arquivo**: `supabase/functions/create-admin-user/index.ts`

Esta é a abordagem mais segura e recomendada, pois executa no servidor Supabase com acesso completo ao banco de dados.

#### Como usar:

1. **Deploy da Edge Function**:
   ```bash
   supabase functions deploy create-admin-user
   ```

2. **Chamar via HTTP**:
   ```bash
   curl -X POST 'https://seu-projeto.supabase.co/functions/v1/create-admin-user' \
     -H 'Authorization: Bearer SEU_ANON_KEY' \
     -H 'Content-Type: application/json' \
     -d '{
       "email": "publicidade3@tvdoutor.com.br",
       "password": "Publi@2025!",
       "full_name": "Maria Laura",
       "role": "admin"
     }'
   ```

### 2. Script Node.js (ES Modules)

**Arquivo**: `scripts/create-admin-user.js`

#### Pré-requisitos:
- Node.js 18+
- Pacote `@supabase/supabase-js` instalado
- Variáveis de ambiente configuradas

#### Como usar:

1. **Instalar dependências**:
   ```bash
   npm install @supabase/supabase-js dotenv
   ```

2. **Configurar variáveis de ambiente**:
   ```bash
   export VITE_SUPABASE_URL="sua-url-supabase"
   export SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"
   ```

3. **Executar**:
   ```bash
   node scripts/create-admin-user.js
   ```

4. **Ou com parâmetros personalizados**:
   ```bash
   EMAIL=novo@email.com PASSWORD=MinhaSenh@123 FULL_NAME="João Silva" ROLE=super_admin node scripts/create-admin-user.js
   ```

### 3. Script Node.js (CommonJS)

**Arquivo**: `scripts/create-admin-user-simple.js`

Versão simplificada que funciona com CommonJS.

#### Como usar:

1. **Executar diretamente**:
   ```bash
   node scripts/create-admin-user-simple.js
   ```

2. **Editar o arquivo** para personalizar os dados do usuário.

### 4. Script PowerShell (Windows)

**Arquivo**: `scripts/create-admin-user.ps1`

#### Como usar:

1. **Executar com parâmetros padrão**:
   ```powershell
   .\scripts\create-admin-user.ps1
   ```

2. **Executar com parâmetros personalizados**:
   ```powershell
   .\scripts\create-admin-user.ps1 -Email "novo@email.com" -Password "MinhaSenh@123" -FullName "João Silva" -Role "super_admin"
   ```

## Variáveis de Ambiente Necessárias

Certifique-se de ter estas variáveis configuradas:

```bash
# URL do projeto Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co

# Service Role Key (com acesso admin)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Estrutura de Roles

O sistema suporta as seguintes roles:

- **`user`**: Usuário comum (padrão)
- **`admin`**: Administrador (mapeado para 'Manager' no frontend)
- **`super_admin`**: Super Administrador (mapeado para 'Admin' no frontend)

## O que o Script Faz

1. **Cria usuário no auth.users**: Cria o usuário no sistema de autenticação do Supabase
2. **Cria perfil em profiles**: Adiciona entrada na tabela `public.profiles`
3. **Define role em user_roles**: Adiciona entrada na tabela `public.user_roles` (se existir)
4. **Configura super_admin**: Define o campo `super_admin` como `true` se a role for `super_admin`

## Validações

Os scripts incluem as seguintes validações:

- ✅ Formato de email válido
- ✅ Senha com pelo menos 8 caracteres
- ✅ Role válida (`admin` ou `super_admin`)
- ✅ Variáveis de ambiente configuradas
- ✅ Verificação de usuário já existente

## Tratamento de Erros

- Se a criação do perfil falhar, o usuário de auth é removido automaticamente
- Mensagens de erro claras e dicas para resolução
- Logs detalhados para debugging

## Segurança

⚠️ **IMPORTANTE**: 
- Use apenas em ambiente de desenvolvimento ou com supervisão
- A Service Role Key tem acesso total ao banco - mantenha-a segura
- Considere usar a Edge Function em produção para maior segurança

## Exemplo de Uso Completo

```bash
# 1. Configurar variáveis
export VITE_SUPABASE_URL="https://xyz.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIs..."

# 2. Executar script
node scripts/create-admin-user.js

# 3. Verificar no Supabase Dashboard
# - Vá para Authentication > Users
# - Vá para Table Editor > profiles
# - Vá para Table Editor > user_roles
```

## Troubleshooting

### Erro: "User already registered"
- O email já está em uso
- Use um email diferente ou delete o usuário existente

### Erro: "Invalid email format"
- Verifique se o email está no formato correto
- Exemplo válido: `usuario@dominio.com`

### Erro: "Password should be at least 8 characters"
- A senha deve ter pelo menos 8 caracteres
- Use uma senha mais forte

### Erro: "SUPABASE_SERVICE_ROLE_KEY not found"
- Configure a variável de ambiente
- Certifique-se de usar a Service Role Key (não a Anon Key)

## Suporte

Para problemas ou dúvidas, verifique:
1. Logs do script
2. Supabase Dashboard > Logs
3. Configuração das variáveis de ambiente
4. Permissões da Service Role Key
