# ⚡ Quick Start - Sistema de Sessões

## 🎯 O que é?

Sistema completo de monitoramento de usuários online em tempo real, com rastreamento de atividade, histórico de sessões e limpeza automática.

---

## 🚀 Instalação Rápida (3 passos)

### 1️⃣ Aplicar SQL no Supabase

1. Abra o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Copie e execute: `apply-user-sessions-migration.sql`

### 2️⃣ Verificar Instalação

Execute no SQL Editor:
```sql
-- Ver job agendado
SELECT * FROM cron.job WHERE jobname = 'cleanup-expired-user-sessions';
```

✅ **Esperado:** 1 linha com `active = true`

### 3️⃣ Integrar no Frontend

No seu `App.tsx` ou componente principal:

```typescript
import { useSessionMonitor } from '@/hooks/useSessionMonitor';

function App() {
  // Adicione esta linha
  useSessionMonitor();
  
  return <div>...</div>;
}
```

---

## 📝 Uso Básico

### No Login

```typescript
import { createUserSession } from '@/lib/userSessionManager';

// Depois do login bem-sucedido
await createUserSession(user.id);
```

### No Logout

```typescript
import { endUserSession } from '@/lib/userSessionManager';

// Ao fazer logout
await endUserSession('logout');
```

### Monitoramento Automático

```typescript
import { useSessionMonitor } from '@/hooks/useSessionMonitor';

function App() {
  useSessionMonitor({
    updateInterval: 60000, // Atualiza a cada 1 minuto
    onSessionExpired: () => {
      // Redirecionar para login
      window.location.href = '/login';
    }
  });
  
  return <div>...</div>;
}
```

---

## 🔍 Ver Usuários Online (Super Admin)

### No Frontend

```typescript
import { getOnlineUsersStats } from '@/lib/userSessionManager';

const stats = await getOnlineUsersStats();
console.log('Usuários online:', stats[0]?.total_online);
console.log('Detalhes:', stats[0]?.sessions_data);
```

### No SQL Editor

```sql
SELECT * FROM get_online_users_stats();
```

---

## 📊 Queries Úteis

```sql
-- Ver usuários online AGORA
SELECT COUNT(*) FROM user_sessions WHERE is_active = TRUE AND expires_at > NOW();

-- Ver últimas sessões
SELECT * FROM user_session_history ORDER BY ended_at DESC LIMIT 10;

-- Executar limpeza manual
SELECT cleanup_expired_sessions();

-- Ver histórico do cron job
SELECT * FROM cron.job_run_details 
WHERE jobname = 'cleanup-expired-user-sessions' 
ORDER BY start_time DESC LIMIT 10;
```

---

## ⚙️ Configurações Opcionais

### Timeout de Inatividade

```typescript
import { useInactivityTimeout } from '@/hooks/useSessionMonitor';

function App() {
  // Desloga após 30 minutos sem atividade
  useInactivityTimeout(30);
  
  return <div>...</div>;
}
```

### Forçar Logout de Usuário

```typescript
import { clearUserSessions } from '@/lib/userSessionManager';

// Remove todas as sessões de um usuário
await clearUserSessions(userId);
```

---

## 🎨 Componentes Prontos

Veja exemplos completos em: `src/examples/SessionIntegrationExamples.tsx`

- ✅ Dashboard de usuários online
- ✅ Indicador de status da sessão
- ✅ Botão de logout com limpeza
- ✅ Proteção de rotas
- ✅ E mais...

---

## 🔧 Troubleshooting

### Cron job não está rodando?

```sql
-- Reativar
UPDATE cron.job SET active = TRUE 
WHERE jobname = 'cleanup-expired-user-sessions';
```

### pg_cron não disponível?

Use Edge Function alternativa (veja `DEPLOY_USER_SESSIONS_GUIDE.md` seção 5)

### Sessão não está sendo criada?

Verifique console do navegador e RLS policies:

```sql
-- Ver políticas
SELECT * FROM pg_policies WHERE tablename = 'user_sessions';
```

---

## 📚 Documentação Completa

- `DEPLOY_USER_SESSIONS_GUIDE.md` - Guia completo passo a passo
- `USER_SESSIONS_QUERIES.sql` - 50+ queries úteis
- `src/lib/userSessionManager.ts` - API de funções
- `src/hooks/useSessionMonitor.ts` - Hooks React
- `src/examples/SessionIntegrationExamples.tsx` - Exemplos práticos

---

## ✨ Benefícios

✅ **Automático** - Limpeza a cada 5 minutos  
✅ **Seguro** - RLS protege dados sensíveis  
✅ **Rápido** - Índices otimizados  
✅ **Completo** - Histórico de todas as sessões  
✅ **Fácil** - API simples e hooks prontos  

---

## 🎯 Checklist de Implementação

- [ ] Aplicar SQL no Supabase
- [ ] Verificar cron job ativo
- [ ] Adicionar `useSessionMonitor()` no App
- [ ] Criar sessão no login
- [ ] Encerrar sessão no logout
- [ ] Testar com usuário real
- [ ] (Opcional) Criar dashboard de usuários online
- [ ] (Opcional) Adicionar timeout de inatividade

---

**Pronto! Seu sistema de sessões está funcionando! 🎉**

