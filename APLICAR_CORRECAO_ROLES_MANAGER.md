# Guia Rápido: Corrigir Roles Manager

## Problema
Usuários `publicidade5@tvdoutor.com.br`, `publicidade6@tvdoutor.com.br` e `suporte@tvdoutor.com.br` não estão aparecendo como 'manager' no sistema.

## Solução Rápida (3 passos)

### 1️⃣ Diagnóstico (Opcional, mas recomendado)

Execute via **Supabase Dashboard** > **SQL Editor**:

```sql
-- Ver roles atuais
SELECT 
    p.email,
    p.role as profile_role,
    array_agg(ur.role::TEXT ORDER BY ur.role) as user_roles
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE p.email IN (
    'publicidade5@tvdoutor.com.br',
    'publicidade6@tvdoutor.com.br',
    'suporte@tvdoutor.com.br'
)
GROUP BY p.email, p.role
ORDER BY p.email;
```

### 2️⃣ Aplicar Correção

**Opção A - Via Dashboard (Mais Simples):**

Cole e execute no **SQL Editor**:

```sql
-- ATUALIZAR ROLES PARA MANAGER
DO $$
DECLARE
    user_email TEXT;
    user_id_var UUID;
BEGIN
    FOR user_email IN 
        SELECT unnest(ARRAY[
            'publicidade5@tvdoutor.com.br',
            'publicidade6@tvdoutor.com.br',
            'suporte@tvdoutor.com.br'
        ])
    LOOP
        -- Buscar ID
        SELECT id INTO user_id_var
        FROM public.profiles
        WHERE email = user_email;
        
        IF user_id_var IS NOT NULL THEN
            -- Atualizar profiles
            UPDATE public.profiles
            SET role = 'manager'
            WHERE id = user_id_var;
            
            -- Adicionar em user_roles
            INSERT INTO public.user_roles (user_id, role)
            VALUES (user_id_var, 'manager'::app_role)
            ON CONFLICT (user_id, role) DO NOTHING;
            
            RAISE NOTICE '✅ %', user_email;
        END IF;
    END LOOP;
END $$;
```

**Opção B - Via CLI:**

```bash
# Executar script completo
supabase db execute --file fix_manager_users_roles.sql
```

### 3️⃣ Verificar

Execute no **SQL Editor**:

```sql
-- Verificar resultado
SELECT 
    p.email,
    p.role as profile_role,
    array_agg(ur.role::TEXT) as user_roles
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE p.email IN (
    'publicidade5@tvdoutor.com.br',
    'publicidade6@tvdoutor.com.br',
    'suporte@tvdoutor.com.br'
)
GROUP BY p.email, p.role;
```

**Resultado Esperado:**
```
email                          | profile_role | user_roles
-------------------------------|--------------|------------
publicidade5@tvdoutor.com.br   | manager      | {manager}
publicidade6@tvdoutor.com.br   | manager      | {manager}
suporte@tvdoutor.com.br        | manager      | {manager}
```

## ⚠️ Importante

**Os usuários precisam:**
1. ✅ Fazer **LOGOUT**
2. ✅ Fazer **LOGIN** novamente
3. ✅ Limpar cache do navegador (Ctrl+Shift+Delete) se necessário

## Teste Final

Após login, os usuários devem ter acesso a:
- ✅ `/reports` - Relatórios
- ✅ `/venues` - Locais
- ✅ `/users` - Usuários  
- ✅ `/pessoas-projeto` - Pessoas
- ✅ `/gerenciamento-projetos` - Projetos

Badge no perfil deve mostrar: **Manager** 🛡️

## Troubleshooting

### Problema: Ainda aparece como 'user'

**Solução:**
1. Verificar se a role foi realmente atualizada (query de verificação acima)
2. Fazer logout completo
3. Limpar cookies e cache do navegador
4. Fazer login novamente

### Problema: Erro "permission denied"

**Solução:**
Execute como super_admin ou use o Supabase Service Role:

```sql
-- No Dashboard, use o Service Role Key
-- Settings > API > service_role key
```

### Problema: Usuário não encontrado

**Verificar se o email está correto:**
```sql
SELECT id, email FROM public.profiles 
WHERE email LIKE '%publicidade%' OR email LIKE '%suporte%';
```

## Scripts Disponíveis

- `check_manager_users_roles.sql` - Diagnóstico completo
- `fix_manager_users_roles.sql` - Correção automática
- `CORRECAO_ROLES_MANAGER.md` - Documentação completa

## Suporte

Para mais detalhes, consulte: `CORRECAO_ROLES_MANAGER.md`

---

**⏱️ Tempo estimado:** 2-3 minutos  
**🔧 Complexidade:** Baixa  
**✅ Status:** Pronto para aplicar

