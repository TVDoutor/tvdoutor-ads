# 🚀 Deploy Vercel - Correção Admin Access

## 📋 Resumo das Correções

### ✅ Problemas Corrigidos:
1. **Erro 400 Bad Request** nas Edge Functions
2. **Problema de acesso negado** para usuários admin
3. **Inconsistências de case sensitivity** entre roles
4. **Chamadas sem body JSON** para Edge Functions

### 📁 Arquivos Modificados:
- `src/lib/email-service.ts` - Corrigidas chamadas Edge Functions
- `src/components/ProtectedRoute.tsx` - Melhorada verificação de admin
- `src/contexts/AuthContext.tsx` - Corrigida função isAdmin()
- `src/pages/Users.tsx` - Adicionado componente de debug
- `src/components/AdminDebug.tsx` - Novo componente para diagnóstico

## 🔧 Passos para Deploy na Vercel

### 1. **Commit e Push das Alterações**
```bash
# Adicionar todos os arquivos modificados
git add .

# Commit com mensagem descritiva
git commit -m "fix: Corrigir acesso admin e erros 400 nas Edge Functions

- Corrigir chamadas Edge Functions sem body JSON
- Melhorar verificação de permissões admin
- Adicionar suporte a super_admin
- Corrigir case sensitivity em roles
- Adicionar componente de debug temporário"

# Push para o repositório
git push origin main
```

### 2. **Verificar Configurações da Vercel**

#### Variáveis de Ambiente (Vercel Dashboard):
```
VITE_SUPABASE_URL=https://vaogzhwzucijiyyyglls.supabase.co
VITE_SUPABASE_ANON_KEY=[sua-anon-key]
```

#### Configurações de Build:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3. **Deploy Automático**
A Vercel fará deploy automático após o push. Você pode acompanhar:
- Dashboard da Vercel → Deployments
- Logs em tempo real do build

### 4. **Aplicar Correções no Banco de Dados**

#### No Supabase Dashboard (SQL Editor):
```sql
-- CORREÇÃO URGENTE: Definir usuário como admin
-- Substitua 'SEU_EMAIL' pelo seu email real

-- 1. Verificar usuário atual
SELECT 
    'VERIFICAÇÃO ATUAL' as status,
    p.id,
    p.email,
    p.full_name,
    p.super_admin,
    ur.role,
    CASE 
        WHEN p.super_admin = true THEN 'SUPER ADMIN'
        WHEN ur.role = 'admin' THEN 'ADMIN'
        ELSE 'NÃO É ADMIN'
    END as status_atual
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'admin'
WHERE p.email = 'SEU_EMAIL_AQUI';

-- 2. CORREÇÃO: Definir como super_admin
UPDATE profiles 
SET 
    super_admin = true,
    updated_at = now()
WHERE email = 'SEU_EMAIL_AQUI';

-- 3. CORREÇÃO: Garantir role admin
INSERT INTO user_roles (user_id, role, created_at, updated_at)
SELECT 
    p.id,
    'admin',
    now(),
    now()
FROM profiles p
WHERE p.email = 'SEU_EMAIL_AQUI'
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'admin'
);

-- 4. Verificação final
SELECT 
    'VERIFICAÇÃO FINAL' as status,
    p.id,
    p.email,
    p.full_name,
    p.super_admin,
    ur.role,
    CASE 
        WHEN p.super_admin = true THEN 'SUPER ADMIN ✅'
        WHEN ur.role = 'admin' THEN 'ADMIN ✅'
        ELSE 'NÃO É ADMIN ❌'
    END as status_final
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'admin'
WHERE p.email = 'SEU_EMAIL_AQUI';
```

## 🧪 Testes Pós-Deploy

### 1. **Verificar Aplicação Online**
- Acesse sua URL da Vercel
- Faça login com sua conta
- Verifique se não há mais erros 400 no console

### 2. **Testar Acesso Admin**
- Tente acessar `/users`
- Verifique o componente de debug na página
- Confirme se tem acesso às funcionalidades admin

### 3. **Verificar Edge Functions**
- Console do navegador deve estar limpo
- Sem erros 400 Bad Request
- Edge Functions funcionando corretamente

## 🚨 Troubleshooting

### Se ainda houver problemas:

1. **Verificar Logs da Vercel**:
   - Dashboard → Functions → Logs
   - Procurar por erros específicos

2. **Verificar Banco de Dados**:
   - Executar script SQL de correção
   - Confirmar se super_admin = true

3. **Limpar Cache**:
   - Fazer logout/login
   - Limpar cache do navegador
   - Testar em aba anônima

4. **Verificar Variáveis de Ambiente**:
   - Confirmar se estão corretas na Vercel
   - Fazer redeploy se necessário

## 📊 Status Esperado

Após o deploy bem-sucedido:
- ✅ Erros 400 Bad Request resolvidos
- ✅ Usuário admin tem acesso total
- ✅ Edge Functions funcionando
- ✅ Sistema de permissões correto
- ✅ Console limpo sem erros

## 🎯 Próximos Passos

1. **Fazer commit e push** das alterações
2. **Aguardar deploy automático** da Vercel
3. **Executar script SQL** no Supabase
4. **Testar aplicação** em produção
5. **Remover componente de debug** após confirmação

---

**Data**: $(date)
**Versão**: 1.2.0 - Admin Access Fix
**Status**: Pronto para Deploy
