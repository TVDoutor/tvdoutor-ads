# Instruções para Aplicar a Migração das Roles

## ✅ Supabase CLI Instalado
O Supabase CLI foi instalado com sucesso via Scoop.

## ⚠️ Problema de Conectividade
Há um problema de timeout ao conectar com o banco remoto. Vamos aplicar a migração manualmente.

## 🚀 Como Aplicar a Migração

### Opção 1: Via Supabase Dashboard (Recomendado)

1. **Acesse o Supabase Dashboard**
   - Vá para: https://supabase.com/dashboard
   - Faça login na sua conta
   - Selecione o projeto "TVDoutor ADS"

2. **Abra o SQL Editor**
   - No menu lateral, clique em "SQL Editor"
   - Clique em "New query"

3. **Execute a Migração**
   - Copie todo o conteúdo do arquivo `APLICAR_MIGRACAO_ROLES.sql`
   - Cole no editor SQL
   - Clique em "Run" para executar

4. **Verifique o Resultado**
   - Você deve ver mensagens de sucesso
   - O enum deve mostrar: super_admin, admin, manager, user
   - As funções devem retornar valores booleanos

### Opção 2: Tentar CLI Novamente (Se a conectividade melhorar)

```bash
# Tentar novamente o push
supabase db push

# Ou aplicar diretamente via query
supabase db query --file APLICAR_MIGRACAO_ROLES.sql
```

## 📋 Verificação Pós-Migração

### 1. Verificar Enum
Execute esta query no SQL Editor:
```sql
SELECT unnest(enum_range(NULL::app_role)) as roles;
```

**Resultado esperado:**
```
super_admin
admin
manager
user
```

### 2. Testar Funções
Execute esta query:
```sql
SELECT 
    is_manager() as can_manage,
    can_delete_other_users() as can_delete,
    can_edit_other_users() as can_edit;
```

### 3. Testar Interface
1. Inicie o servidor: `npm run dev`
2. Acesse a página de usuários
3. Verifique se:
   - Opção "Manager" aparece nos selects
   - Estatísticas incluem managers
   - Filtros funcionam corretamente

## 🔧 Status Atual

- ✅ **Supabase CLI**: Instalado (v2.48.3)
- ✅ **Frontend**: Atualizado com sucesso
- ✅ **Scripts**: Criados e prontos
- ⏳ **Banco de Dados**: Aguardando aplicação manual
- ✅ **Backup**: Criado antes das alterações

## 🆘 Se Algo Der Errado

### Rollback Rápido
Execute este SQL no Supabase Dashboard:
```sql
-- Converter managers para users
UPDATE public.user_roles SET role = 'user' WHERE role = 'manager';
UPDATE public.profiles SET role = 'user' WHERE role = 'manager';

-- Remover funções adicionadas
DROP FUNCTION IF EXISTS public.is_manager();
DROP FUNCTION IF EXISTS public.can_delete_other_users();
DROP FUNCTION IF EXISTS public.can_edit_other_users();

-- Restaurar função is_admin original
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
$$;
```

## 📞 Próximos Passos

1. **Aplicar migração** via Supabase Dashboard
2. **Testar interface** de usuários
3. **Criar usuário Manager** para testar
4. **Verificar permissões** funcionando
5. **Confirmar** que tudo está OK

## 📁 Arquivos Importantes

- `APLICAR_MIGRACAO_ROLES.sql` - Script principal da migração
- `BACKUP_ROLES_BEFORE_UPDATE.sql` - Backup do estado anterior
- `ROLLBACK_ROLES_UPDATE.md` - Guia completo de rollback
- `RESUMO_ATUALIZACAO_ROLES.md` - Documentação completa
