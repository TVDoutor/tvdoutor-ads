# 🔐 Guia Completo - Sistema de Monitoramento de Sessões

## 📋 Índice
1. [Aplicar a Migração](#1-aplicar-a-migração)
2. [Verificar Instalação](#2-verificar-instalação)
3. [Monitorar o Sistema](#3-monitorar-o-sistema)
4. [Integração com Frontend](#4-integração-com-frontend)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Aplicar a Migração

### Passo 1: Acessar o Supabase Dashboard
1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto **TVDoutor**
3. Vá em **SQL Editor** (menu lateral esquerdo)

### Passo 2: Executar o SQL
1. Clique em **+ New Query**
2. Copie TODO o conteúdo do arquivo `apply-user-sessions-migration.sql`
3. Cole no editor
4. Clique em **Run** (ou pressione Ctrl+Enter)

### Passo 3: Aguardar Confirmação
Você deverá ver mensagens como:
```
Success. No rows returned
```

---

## 2. Verificar Instalação

### ✅ Verificar Tabelas Criadas
```sql
-- Verificar se as tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_sessions', 'user_session_history');
```

**Resultado Esperado:**
```
user_sessions
user_session_history
```

### ✅ Verificar Extensão pg_cron
```sql
-- Verificar se pg_cron está habilitado
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'pg_cron';
```

**Resultado Esperado:**
```
pg_cron | 1.4
```

### ✅ Verificar Job Agendado
```sql
-- Ver o job agendado
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active
FROM cron.job 
WHERE jobname = 'cleanup-expired-user-sessions';
```

**Resultado Esperado:**
```
jobid | jobname                        | schedule      | command                                    | active
------|--------------------------------|---------------|--------------------------------------------|---------
1     | cleanup-expired-user-sessions  | */5 * * * *   | SELECT public.cleanup_expired_sessions()   | true
```

### ✅ Verificar Funções Criadas
```sql
-- Listar funções criadas
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%session%';
```

**Resultado Esperado:**
```
cleanup_expired_sessions
update_user_last_seen
get_online_users_stats
get_user_session_history
```

---

## 3. Monitorar o Sistema

### 📊 Ver Histórico de Execuções do Cron Job
```sql
-- Ver últimas 10 execuções do job
SELECT 
    runid,
    jobid,
    start_time,
    end_time,
    status,
    return_message
FROM cron.job_run_details 
WHERE jobname = 'cleanup-expired-user-sessions' 
ORDER BY start_time DESC 
LIMIT 10;
```

### 👥 Ver Usuários Online Agora
```sql
-- Esta função requer ser super admin
SELECT * FROM get_online_users_stats();
```

### 📈 Ver Estatísticas de Sessões Ativas
```sql
-- Contagem de sessões ativas
SELECT 
    COUNT(*) as total_sessoes_ativas,
    COUNT(DISTINCT user_id) as usuarios_unicos_online
FROM public.user_sessions 
WHERE is_active = TRUE 
AND expires_at > NOW();
```

### 📜 Ver Histórico de Sessões
```sql
-- Últimas 20 sessões encerradas
SELECT 
    p.email,
    p.full_name,
    ush.started_at,
    ush.ended_at,
    ush.duration_minutes,
    ush.ended_by,
    ush.ip_address
FROM public.user_session_history ush
LEFT JOIN public.profiles p ON p.id = ush.user_id
ORDER BY ush.ended_at DESC
LIMIT 20;
```

### 🧹 Executar Limpeza Manual
```sql
-- Executar limpeza de sessões expiradas manualmente
SELECT cleanup_expired_sessions() as sessoes_limpas;
```

---

## 4. Integração com Frontend

### 📝 Criar/Atualizar Sessão ao Login

```typescript
// src/lib/userSessionManager.ts
import { supabase } from '@/lib/supabase';

export async function createUserSession(userId: string) {
  try {
    const sessionToken = crypto.randomUUID();
    
    // Detectar informações do cliente
    const ipAddress = await fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => data.ip)
      .catch(() => null);
    
    const userAgent = navigator.userAgent;
    
    // Criar sessão no banco
    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_token: sessionToken,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Salvar token na sessão local
    sessionStorage.setItem('session_token', sessionToken);
    
    return sessionToken;
  } catch (error) {
    console.error('Erro ao criar sessão:', error);
    return null;
  }
}

export async function updateLastSeen() {
  const sessionToken = sessionStorage.getItem('session_token');
  
  if (!sessionToken) return;
  
  try {
    await supabase.rpc('update_user_last_seen', {
      p_session_token: sessionToken
    });
  } catch (error) {
    console.error('Erro ao atualizar last_seen:', error);
  }
}

export async function endUserSession(reason: 'logout' | 'timeout' | 'forced' | 'system') {
  const sessionToken = sessionStorage.getItem('session_token');
  
  if (!sessionToken) return;
  
  try {
    // Buscar sessão atual
    const { data: session } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .single();
    
    if (!session) return;
    
    // Adicionar ao histórico
    await supabase
      .from('user_session_history')
      .insert({
        user_id: session.user_id,
        session_token: session.session_token,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        started_at: session.started_at,
        ended_at: new Date().toISOString(),
        duration_minutes: Math.floor((Date.now() - new Date(session.started_at).getTime()) / 60000),
        ended_by: reason
      });
    
    // Remover sessão ativa
    await supabase
      .from('user_sessions')
      .delete()
      .eq('session_token', sessionToken);
    
    // Limpar storage
    sessionStorage.removeItem('session_token');
  } catch (error) {
    console.error('Erro ao encerrar sessão:', error);
  }
}
```

### 🔄 Atualizar Last Seen Periodicamente

```typescript
// src/hooks/useSessionMonitor.ts
import { useEffect } from 'react';
import { updateLastSeen } from '@/lib/userSessionManager';

export function useSessionMonitor() {
  useEffect(() => {
    // Atualizar a cada 1 minuto
    const interval = setInterval(() => {
      updateLastSeen();
    }, 60000); // 60 segundos
    
    return () => clearInterval(interval);
  }, []);
}
```

### 🎯 Usar no App Principal

```typescript
// src/App.tsx
import { useSessionMonitor } from '@/hooks/useSessionMonitor';
import { createUserSession, endUserSession } from '@/lib/userSessionManager';

function App() {
  // Monitorar sessão automaticamente
  useSessionMonitor();
  
  // No login:
  const handleLogin = async (user) => {
    await createUserSession(user.id);
  };
  
  // No logout:
  const handleLogout = async () => {
    await endUserSession('logout');
  };
  
  // ... resto do código
}
```

---

## 5. Troubleshooting

### ❌ Erro: "extension pg_cron does not exist"

**Solução:**
A extensão `pg_cron` pode não estar disponível em todos os planos do Supabase.

**Alternativa - Usar Edge Function:**

1. Criar função Edge no Supabase:
```typescript
// supabase/functions/cleanup-sessions/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  const { data, error } = await supabase.rpc('cleanup_expired_sessions');
  
  return new Response(
    JSON.stringify({ cleaned: data, error }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

2. Configurar no cron-job.org ou similar para chamar a cada 5 minutos:
   - URL: `https://[seu-projeto].supabase.co/functions/v1/cleanup-sessions`
   - Header: `Authorization: Bearer [anon-key]`

### ❌ Job não está executando

```sql
-- Verificar se está ativo
UPDATE cron.job 
SET active = TRUE 
WHERE jobname = 'cleanup-expired-user-sessions';

-- Re-agendar
SELECT cron.unschedule('cleanup-expired-user-sessions');
SELECT cron.schedule(
    'cleanup-expired-user-sessions',
    '*/5 * * * *',
    $$SELECT public.cleanup_expired_sessions()$$
);
```

### ❌ Verificar Logs de Erro do Job

```sql
-- Ver erros nas execuções
SELECT 
    start_time,
    status,
    return_message
FROM cron.job_run_details 
WHERE jobname = 'cleanup-expired-user-sessions' 
AND status = 'failed'
ORDER BY start_time DESC;
```

---

## 🎯 Dashboard no Supabase

Para ver o Cron Job visualmente:

1. Acesse seu Dashboard do Supabase
2. Vá em **Database** → **Extensions**
3. Procure por `pg_cron` e verifique se está habilitada
4. Vá em **Database** → **Cron Jobs** (se disponível)
5. Você verá o job `cleanup-expired-user-sessions` listado

---

## 📊 Benefícios do Sistema

✅ **Segurança**: Rastreamento completo de quem está logado  
✅ **Performance**: Limpeza automática mantém o banco otimizado  
✅ **Auditoria**: Histórico completo de todas as sessões  
✅ **Controle**: Super admins podem ver usuários online em tempo real  
✅ **Automação**: Zero manutenção manual necessária  

---

## 🚀 Próximos Passos

1. ✅ Aplicar a migração SQL
2. ✅ Verificar se o cron job está rodando
3. 🔨 Integrar com o frontend (código fornecido acima)
4. 📊 Criar dashboard de usuários online (opcional)
5. 🔔 Adicionar alertas de múltiplos logins (opcional)

---

**Última atualização:** Outubro 2025  
**Versão do Sistema:** 1.1.0
