# Correção Imediata - Roles Duplicadas Confirmadas

## ✅ Problema Confirmado
Os diagnósticos executados confirmaram exatamente o problema reportado:

### Usuários com Roles Duplicadas:
1. **Danielle Weber** (`publicidade5@tvdoutor.com.br`)
   - Roles atuais: `manager, user`
   - Profile: `manager`
   - Status: Inconsistente

2. **Thais Araujo** (`publicidade6@tvdoutor.com.br`)
   - Roles atuais: `manager, user`
   - Profile: `manager`
   - Status: Inconsistente

3. **Hildebrando Cardoso** (`hildebrando.cardoso@tvdoutor.com.br`)
   - Roles atuais: `admin, super_admin`
   - Profile: `super_admin`
   - Status: Inconsistente

## 🚀 Solução Recomendada

### Opção 1: Correção Rápida (Recomendada)
Execute o script `fix_quick.sql` que corrige especificamente esses 3 usuários:

```sql
-- Remove roles duplicadas
-- Insere apenas a role correta
-- Atualiza profiles para consistência
```

### Opção 2: Correção Completa
Execute o script `fix_specific_users.sql` para uma abordagem mais robusta com verificações.

## 📋 Passos para Execução

1. **Execute o script de correção**:
   ```sql
   -- Use fix_quick.sql para correção imediata
   ```

2. **Verifique o resultado**:
   - Não deve haver mais usuários com `total_roles > 1`
   - Todos devem ter status "Consistente"

3. **Teste no frontend**:
   - Faça logout e login novamente
   - Verifique se o menu lateral mostra todas as opções para Manager
   - Verifique os logs no console (F12)

## 🎯 Resultado Esperado

Após a correção:
- **Danielle Weber**: Apenas role `manager`
- **Thais Araujo**: Apenas role `manager`  
- **Hildebrando Cardoso**: Apenas role `super_admin`

## 🔍 Verificação Pós-Correção

Execute esta query para confirmar:
```sql
SELECT 
    ur.user_id,
    COUNT(*) as total_roles,
    STRING_AGG(ur.role::text, ', ') as roles,
    p.email,
    p.full_name
FROM public.user_roles ur
LEFT JOIN public.profiles p ON ur.user_id = p.id
GROUP BY ur.user_id, p.email, p.full_name
HAVING COUNT(*) > 1;
```

**Resultado esperado**: Nenhuma linha retornada (sem duplicatas)

## 📁 Arquivos Criados
- `fix_quick.sql` - Correção rápida e direta
- `fix_specific_users.sql` - Correção com verificações
- `fix_duplicate_roles_safe.sql` - Correção completa e segura

