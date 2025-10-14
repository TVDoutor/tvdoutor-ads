# 🔍 Como Verificar no Dashboard do Supabase

## 📍 Localização: Database → Cron Jobs

Siga este caminho visual:

```
Supabase Dashboard
    │
    ├─ 🗄️ Database (menu lateral esquerdo)
    │   │
    │   ├─ Tables
    │   ├─ Extensions  ← Verificar se pg_cron está ativo
    │   ├─ Replication
    │   ├─ Webhooks
    │   ├─ Functions
    │   └─ 🕐 Cron Jobs  ← AQUI!
    │
    └─ SQL Editor (para executar queries)
```

---

## ✅ Passo a Passo Visual

### 1️⃣ Acessar Extensions

**Caminho:** `Database → Extensions`

**O que procurar:**
```
┌─────────────────────────────────────────────┐
│ Extensions                                   │
├─────────────────────────────────────────────┤
│ Name        │ Installed │ Version           │
├─────────────────────────────────────────────┤
│ pg_cron     │    ✅     │ 1.4              │
│ uuid-ossp   │    ✅     │ 1.1              │
│ ...         │    ...    │ ...              │
└─────────────────────────────────────────────┘
```

**Status Esperado:** ✅ pg_cron DEVE estar marcado como instalado

---

### 2️⃣ Verificar Cron Jobs

**Caminho:** `Database → Cron Jobs`

**O que você verá:**
```
┌────────────────────────────────────────────────────────────────┐
│ Scheduled Jobs                                                 │
├────────────────────────────────────────────────────────────────┤
│ Job Name                      │ Schedule    │ Status │ Last   │
│                               │             │        │ Run     │
├────────────────────────────────────────────────────────────────┤
│ cleanup-expired-user-sessions │ */5 * * * * │ Active │ 2 min  │
│                               │ (Every 5    │   ✅   │ ago     │
│                               │  minutes)   │        │         │
└────────────────────────────────────────────────────────────────┘
```

**Detalhes do Job:**
- **Nome:** `cleanup-expired-user-sessions`
- **Agendamento:** `*/5 * * * *` (a cada 5 minutos)
- **Status:** Active ✅
- **Comando:** `SELECT public.cleanup_expired_sessions()`

---

### 3️⃣ Ver Histórico de Execuções

Clique no job `cleanup-expired-user-sessions` para ver:

```
┌─────────────────────────────────────────────────────────────┐
│ Job Run History                                             │
├─────────────────────────────────────────────────────────────┤
│ Start Time          │ Status    │ Duration │ Return Message │
├─────────────────────────────────────────────────────────────┤
│ 2025-10-14 10:35:00 │ succeeded │ 0.12s    │ 3              │
│ 2025-10-14 10:30:00 │ succeeded │ 0.10s    │ 1              │
│ 2025-10-14 10:25:00 │ succeeded │ 0.09s    │ 0              │
│ 2025-10-14 10:20:00 │ succeeded │ 0.11s    │ 2              │
└─────────────────────────────────────────────────────────────┘
```

**Return Message:** Número de sessões limpas em cada execução

---

### 4️⃣ Verificar Tabelas Criadas

**Caminho:** `Database → Tables`

**Procure por:**
```
┌──────────────────────────────────────────────┐
│ Tables                             │ Rows    │
├──────────────────────────────────────────────┤
│ user_sessions             ✅       │ 5       │
│ user_session_history      ✅       │ 147     │
│ profiles                           │ 23      │
│ ...                                │ ...     │
└──────────────────────────────────────────────┘
```

**Clique em `user_sessions`** para ver a estrutura:

```
┌────────────────────────────────────────────────────┐
│ Columns                                            │
├────────────────────────────────────────────────────┤
│ id              │ uuid                │ PRIMARY KEY │
│ user_id         │ uuid                │ FOREIGN KEY │
│ session_token   │ text                │ UNIQUE      │
│ ip_address      │ inet                │             │
│ user_agent      │ text                │             │
│ started_at      │ timestamptz         │             │
│ last_seen_at    │ timestamptz         │             │
│ expires_at      │ timestamptz         │             │
│ is_active       │ boolean             │             │
│ created_at      │ timestamptz         │             │
│ updated_at      │ timestamptz         │             │
└────────────────────────────────────────────────────┘
```

---

### 5️⃣ Testar no SQL Editor

**Caminho:** `SQL Editor → New Query`

**Cole e execute:**

```sql
-- Ver status completo do sistema
SELECT 
    (SELECT COUNT(*) FROM user_sessions WHERE is_active = TRUE) as usuarios_online,
    (SELECT COUNT(*) FROM user_session_history) as total_historico,
    (SELECT active FROM cron.job WHERE jobname = 'cleanup-expired-user-sessions') as cron_ativo;
```

**Resultado Esperado:**
```
┌─────────────────┬─────────────────┬────────────┐
│ usuarios_online │ total_historico │ cron_ativo │
├─────────────────┼─────────────────┼────────────┤
│              5  │            147  │    true    │
└─────────────────┴─────────────────┴────────────┘
```

---

## 🎯 Checklist de Verificação

Marque cada item conforme verifica:

### Instalação
- [ ] pg_cron aparece em `Database → Extensions` com status ✅
- [ ] Tabela `user_sessions` existe em `Database → Tables`
- [ ] Tabela `user_session_history` existe em `Database → Tables`

### Cron Job
- [ ] Job `cleanup-expired-user-sessions` aparece em `Database → Cron Jobs`
- [ ] Status do job está **Active** ✅
- [ ] Schedule é `*/5 * * * *`
- [ ] Há execuções no histórico (se passou tempo suficiente)

### Funcionalidade
- [ ] Query de teste retorna dados corretos
- [ ] Consegue ver estatísticas com `SELECT * FROM get_online_users_stats();`
- [ ] Limpeza manual funciona: `SELECT cleanup_expired_sessions();`

---

## ❌ Se Algo Não Estiver Certo

### Problema: pg_cron não aparece nas Extensions

**Causa:** Seu plano do Supabase pode não incluir pg_cron

**Solução:** Use a alternativa com Edge Function (veja `DEPLOY_USER_SESSIONS_GUIDE.md` seção 5)

---

### Problema: Cron Job não está listado

**Solução:** Execute novamente a parte do cron no SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'cleanup-expired-user-sessions',
    '*/5 * * * *',
    $$SELECT public.cleanup_expired_sessions()$$
);
```

---

### Problema: Job está "Inactive" (inativo)

**Solução:** Ative manualmente:

```sql
UPDATE cron.job 
SET active = TRUE 
WHERE jobname = 'cleanup-expired-user-sessions';
```

---

### Problema: Tabelas não aparecem

**Solução:** Execute novamente o arquivo completo `apply-user-sessions-migration.sql`

---

### Problema: Erro de permissão ao executar queries

**Solução:** Verifique se você está autenticado como super admin:

```sql
-- Verificar se é super admin
SELECT is_super_admin();
```

Se retornar `false`, faça login com usuário super admin.

---

## 📊 Monitoramento Contínuo

### Dashboard Recomendado

Crie uma query salva no SQL Editor com:

```sql
-- Monitoramento Completo
SELECT 
    '👥 Usuários Online' as metrica,
    COUNT(*)::text as valor
FROM user_sessions 
WHERE is_active = TRUE AND expires_at > NOW()

UNION ALL

SELECT 
    '📊 Sessões Hoje',
    COUNT(*)::text
FROM user_session_history
WHERE DATE(ended_at) = CURRENT_DATE

UNION ALL

SELECT 
    '⏱️ Duração Média (min)',
    ROUND(AVG(duration_minutes))::text
FROM user_session_history
WHERE ended_at > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    '🕐 Última Limpeza',
    TO_CHAR(MAX(start_time), 'HH24:MI:SS')
FROM cron.job_run_details
WHERE jobname = 'cleanup-expired-user-sessions'

UNION ALL

SELECT 
    '✅ Cron Status',
    CASE WHEN active THEN 'ATIVO' ELSE 'INATIVO' END
FROM cron.job
WHERE jobname = 'cleanup-expired-user-sessions';
```

**Salve como:** `Dashboard - Monitoramento de Sessões`

---

## 🎯 Tudo Funcionando?

Se você conseguiu marcar todos os itens do checklist acima, **parabéns!** 🎉

Seu sistema de monitoramento de sessões está:
- ✅ Instalado
- ✅ Configurado
- ✅ Funcionando automaticamente
- ✅ Pronto para uso

**Próximo passo:** Integrar com o frontend seguindo o guia `SESSOES_QUICKSTART.md`

---

## 📞 Precisa de Ajuda?

Veja os guias completos:
- `SESSOES_QUICKSTART.md` - Início rápido
- `DEPLOY_USER_SESSIONS_GUIDE.md` - Guia completo
- `USER_SESSIONS_QUERIES.sql` - 50+ queries úteis

