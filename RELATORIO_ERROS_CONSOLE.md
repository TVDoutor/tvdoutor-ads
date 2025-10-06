# 🔍 Relatório de Diagnóstico dos Erros do Console

## 🚨 Erros Identificados

### 1. **ERRO SUPABASE (P0001) - "Users cannot change their own role"**

**📍 Localização**: `src/contexts/AuthContext.tsx` - linhas 293-302

**🔍 Causa Raiz**:
```typescript
// Linha 293-302 do AuthContext.tsx
const { error } = await supabase
  .from('profiles')
  .upsert({
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
    display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
    role: 'user',  // ← AQUI ESTÁ O PROBLEMA
    super_admin: false
  });
```

**🚨 Problema**:
- O código está tentando definir `role: 'user'` no upsert
- O trigger `prevent_role_escalation` está bloqueando essa operação
- O trigger verifica se o usuário tem permissão para alterar roles
- Como o usuário não é super_admin, o trigger lança a exceção P0001

**🛠️ Solução**:
Remover o campo `role` do upsert, pois:
1. O trigger `handle_new_user` já define o role como 'user' por padrão
2. Não é necessário redefinir o role no upsert
3. O campo `super_admin` já é suficiente para controle de permissões

### 2. **ERRO GOOGLE MAPS (REQUEST_DENIED)**

**📍 Localização**: API de Geocodificação do Google Maps

**🔍 Causa Provável**:
- Chave da API do Google Maps com restrições incorretas
- Domínio localhost não permitido nas restrições
- APIs não habilitadas no Google Cloud Console
- Limite de uso excedido

**🛠️ Solução**:
1. Verificar restrições no Google Cloud Console
2. Adicionar localhost às restrições de referrer
3. Verificar se as APIs estão habilitadas

## 🔧 Correções Necessárias

### Correção 1: AuthContext.tsx (CRÍTICA)

**Arquivo**: `src/contexts/AuthContext.tsx`
**Linhas**: 293-302

**Código Atual (PROBLEMÁTICO)**:
```typescript
const { error } = await supabase
  .from('profiles')
  .upsert({
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
    display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
    role: 'user',  // ← REMOVER ESTA LINHA
    super_admin: false
  });
```

**Código Corrigido**:
```typescript
const { error } = await supabase
  .from('profiles')
  .upsert({
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
    display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
    // role: 'user',  // ← REMOVIDO - o trigger handle_new_user já define
    super_admin: false
  });
```

### Correção 2: signUp function (linhas 397-405)

**Código Atual (PROBLEMÁTICO)**:
```typescript
const { error: profileError } = await supabase
  .from('profiles')
  .insert({
    id: data.user.id,
    email: data.user.email,
    full_name: name,
    display_name: name,
    role: 'user'  // ← REMOVER ESTA LINHA
  });
```

**Código Corrigido**:
```typescript
const { error: profileError } = await supabase
  .from('profiles')
  .insert({
    id: data.user.id,
    email: data.user.email,
    full_name: name,
    display_name: name
    // role: 'user'  // ← REMOVIDO - o trigger handle_new_user já define
  });
```

## ⚠️ IMPORTANTE - Aplicação Segura

### ❌ NÃO FAÇA:
- Não altere o trigger `prevent_role_escalation` - ele está funcionando corretamente
- Não desabilite RLS - isso quebraria a segurança
- Não altere políticas sem backup

### ✅ FAÇA:
- Apenas remova o campo `role` dos upserts/inserts
- O trigger `handle_new_user` já define o role corretamente
- Teste em ambiente de desenvolvimento primeiro

## 🧪 Teste de Validação

Após aplicar as correções:

1. **Teste de Login**:
   - Faça login com um usuário existente
   - Verifique se não há mais erro P0001 no console

2. **Teste de Cadastro**:
   - Tente cadastrar um novo usuário
   - Verifique se o perfil é criado corretamente

3. **Teste de Google Maps**:
   - Verifique se a geocodificação funciona
   - Teste a busca por endereços

## 📊 Impacto das Correções

### ✅ Benefícios:
- Elimina o erro P0001 do console
- Cadastro de usuários funcionará corretamente
- Sistema de autenticação mais estável
- Logs mais limpos

### ⚠️ Riscos:
- Mínimos - apenas remoção de campo desnecessário
- Trigger `handle_new_user` continua funcionando
- Segurança mantida

## 🚀 Próximos Passos

1. **Aplicar correção no AuthContext.tsx**
2. **Testar login e cadastro**
3. **Verificar Google Maps API**
4. **Monitorar logs do console**

---

**⚠️ LEMBRE-SE**: Estas correções são seguras e não quebram a lógica do sistema. Elas apenas removem campos desnecessários que estão causando conflito com os triggers de segurança.
