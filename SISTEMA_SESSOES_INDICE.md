# 📚 Sistema de Monitoramento de Sessões - Índice Completo

## 🎯 Visão Geral

Sistema completo de rastreamento de sessões de usuários em tempo real com:
- ✅ Monitoramento de usuários online
- ✅ Histórico completo de todas as sessões
- ✅ Limpeza automática a cada 5 minutos
- ✅ Rastreamento de IP, User Agent e tempo de atividade
- ✅ Segurança com RLS (Row Level Security)
- ✅ API completa para integração frontend

---

## 🗂️ Arquivos do Sistema

### 📄 SQL e Migração

#### `apply-user-sessions-migration.sql` ⭐ **PRINCIPAL**
**O que é:** Script SQL completo para criar todo o sistema no Supabase

**Contém:**
- Tabelas: `user_sessions` e `user_session_history`
- Índices para performance
- Políticas RLS para segurança
- Funções: `cleanup_expired_sessions()`, `update_user_last_seen()`, etc.
- Cron job automático a cada 5 minutos

**Como usar:**
1. Abrir Supabase Dashboard → SQL Editor
2. Copiar e colar o conteúdo completo
3. Executar (Run)

---

#### `USER_SESSIONS_QUERIES.sql`
**O que é:** Coleção de 50+ queries úteis para monitoramento e diagnóstico

**Categorias:**
1. ✅ Verificação da instalação
2. 👥 Monitoramento em tempo real
3. 📊 Histórico e estatísticas
4. 🔧 Diagnóstico e troubleshooting
5. ⚙️ Operações administrativas
6. 🧹 Manutenção e limpeza
7. 📈 Relatórios executivos
8. ⚠️ Alertas e monitoramento

**Exemplos de queries:**
```sql
-- Ver usuários online agora
SELECT COUNT(*) FROM user_sessions WHERE is_active = TRUE;

-- Últimas sessões encerradas
SELECT * FROM user_session_history ORDER BY ended_at DESC LIMIT 20;

-- Executar limpeza manual
SELECT cleanup_expired_sessions();
```

---

### 🎨 Frontend - Código TypeScript

#### `src/lib/userSessionManager.ts` ⭐ **PRINCIPAL**
**O que é:** API completa para gerenciar sessões no frontend

**Funções principais:**
```typescript
// Criar sessão ao login
createUserSession(userId: string, expiresInHours?: number)

// Atualizar última atividade
updateLastSeen()

// Encerrar sessão ao logout
endUserSession(reason: 'logout' | 'timeout' | 'forced' | 'system')

// Verificar se sessão é válida
isSessionValid()

// Ver usuários online (super admin)
getOnlineUsersStats()

// Ver histórico (super admin)
getUserSessionHistory(userId?: string)

// Forçar logout de usuário (super admin)
clearUserSessions(userId: string)
```

**Como usar:**
```typescript
import { createUserSession, endUserSession } from '@/lib/userSessionManager';

// No login
await createUserSession(user.id);

// No logout
await endUserSession('logout');
```

---

#### `src/hooks/useSessionMonitor.ts`
**O que é:** Hooks React para monitoramento automático de sessões

**Hooks disponíveis:**

##### `useSessionMonitor()`
Atualiza automaticamente o `last_seen_at` enquanto o usuário navega

```typescript
import { useSessionMonitor } from '@/hooks/useSessionMonitor';

function App() {
  useSessionMonitor({
    updateInterval: 60000, // 1 minuto
    checkValidity: true,
    onSessionExpired: () => {
      navigate('/login');
    }
  });
  
  return <div>...</div>;
}
```

##### `useInactivityTimeout()`
Desloga usuário após X minutos sem atividade

```typescript
import { useInactivityTimeout } from '@/hooks/useSessionMonitor';

function App() {
  useInactivityTimeout(30); // 30 minutos
  return <div>...</div>;
}
```

---

#### `src/examples/SessionIntegrationExamples.tsx`
**O que é:** Exemplos completos e prontos para uso

**Contém:**
1. App com monitoramento de sessão
2. Página de login com criação de sessão
3. Botão de logout com encerramento de sessão
4. Dashboard de usuários online (super admin)
5. Botão para forçar logout de usuário
6. Guard de rota com verificação de sessão
7. Hook customizado para status online
8. Componente de indicador de status
9. Integração completa no App.tsx

**Como usar:** Copie e adapte os exemplos para sua aplicação

---

### 📖 Documentação

#### `SESSOES_QUICKSTART.md` ⭐ **COMECE AQUI**
**O que é:** Guia de início rápido com o essencial

**Perfeito para:**
- Instalação em 3 passos
- Uso básico (login/logout)
- Queries essenciais
- Checklist de implementação

**Tempo estimado:** 10 minutos

---

#### `DEPLOY_USER_SESSIONS_GUIDE.md` ⭐ **GUIA COMPLETO**
**O que é:** Documentação completa e detalhada

**Seções:**
1. Aplicar a Migração (passo a passo)
2. Verificar Instalação (múltiplas validações)
3. Monitorar o Sistema (queries e dashboards)
4. Integração com Frontend (código completo)
5. Troubleshooting (soluções para problemas comuns)

**Perfeito para:**
- Entender o sistema em profundidade
- Resolver problemas
- Configurações avançadas

**Tempo estimado:** 30-45 minutos (leitura completa)

---

#### `VERIFICAR_DASHBOARD_SUPABASE.md`
**O que é:** Guia visual para verificar no Dashboard do Supabase

**Contém:**
- Screenshots e diagramas visuais
- Caminho exato: Database → Cron Jobs
- O que procurar em cada tela
- Checklist de verificação
- Soluções para problemas comuns

**Perfeito para:**
- Validar que tudo está funcionando
- Verificação visual passo a passo
- Primeira vez usando Cron Jobs

---

## 🚀 Fluxo de Implementação Recomendado

### Para Iniciantes
```
1. SESSOES_QUICKSTART.md
   └─ Leia apenas seções 1, 2 e 3
   
2. apply-user-sessions-migration.sql
   └─ Execute no Supabase
   
3. VERIFICAR_DASHBOARD_SUPABASE.md
   └─ Valide a instalação
   
4. SESSOES_QUICKSTART.md
   └─ Complete seções 4 e 5
   
5. src/examples/SessionIntegrationExamples.tsx
   └─ Copie exemplo 9 para seu App.tsx
```

### Para Desenvolvedores Experientes
```
1. apply-user-sessions-migration.sql
   └─ Execute no Supabase
   
2. src/lib/userSessionManager.ts
   └─ Importe funções necessárias
   
3. src/hooks/useSessionMonitor.ts
   └─ Adicione no App
   
4. USER_SESSIONS_QUERIES.sql
   └─ Use queries conforme necessário
   
5. DEPLOY_USER_SESSIONS_GUIDE.md
   └─ Consulte se precisar
```

### Para Administradores/DevOps
```
1. apply-user-sessions-migration.sql
   └─ Execute no Supabase
   
2. VERIFICAR_DASHBOARD_SUPABASE.md
   └─ Valide instalação completa
   
3. USER_SESSIONS_QUERIES.sql
   └─ Seções 4, 6, 7 e 8 (diagnóstico e relatórios)
   
4. DEPLOY_USER_SESSIONS_GUIDE.md
   └─ Seção 5 (Troubleshooting)
```

---

## 📊 Estrutura do Sistema

```
Sistema de Sessões
│
├─ 🗄️ Banco de Dados (Supabase)
│   ├─ Tabelas
│   │   ├─ user_sessions (sessões ativas)
│   │   └─ user_session_history (histórico)
│   │
│   ├─ Funções
│   │   ├─ cleanup_expired_sessions() - Limpa expiradas
│   │   ├─ update_user_last_seen() - Atualiza atividade
│   │   ├─ get_online_users_stats() - Estatísticas (admin)
│   │   └─ get_user_session_history() - Histórico (admin)
│   │
│   ├─ Cron Job
│   │   └─ cleanup-expired-user-sessions (a cada 5 min)
│   │
│   └─ RLS Policies (segurança)
│       ├─ Super admins veem tudo
│       └─ Usuários gerenciam próprias sessões
│
├─ 💻 Frontend (React/TypeScript)
│   ├─ Biblioteca
│   │   └─ userSessionManager.ts - API de funções
│   │
│   ├─ Hooks
│   │   ├─ useSessionMonitor() - Monitoramento automático
│   │   └─ useInactivityTimeout() - Timeout de inatividade
│   │
│   └─ Exemplos
│       └─ SessionIntegrationExamples.tsx - Componentes prontos
│
└─ 📚 Documentação
    ├─ SESSOES_QUICKSTART.md - Início rápido
    ├─ DEPLOY_USER_SESSIONS_GUIDE.md - Guia completo
    ├─ VERIFICAR_DASHBOARD_SUPABASE.md - Verificação visual
    ├─ USER_SESSIONS_QUERIES.sql - Queries úteis
    └─ SISTEMA_SESSOES_INDICE.md - Este arquivo
```

---

## 🎯 Casos de Uso

### 1. Ver Quantos Usuários Estão Online Agora
**Arquivo:** `USER_SESSIONS_QUERIES.sql` (seção 2)
```sql
SELECT COUNT(*) FROM user_sessions WHERE is_active = TRUE;
```

### 2. Criar Dashboard de Usuários Online
**Arquivo:** `src/examples/SessionIntegrationExamples.tsx` (exemplo 4)
```typescript
const stats = await getOnlineUsersStats();
// Renderizar lista de usuários
```

### 3. Forçar Logout de um Usuário
**Arquivo:** `src/lib/userSessionManager.ts`
```typescript
await clearUserSessions(userId);
```

### 4. Ver Histórico de Sessões
**Arquivo:** `USER_SESSIONS_QUERIES.sql` (seção 3)
```sql
SELECT * FROM user_session_history ORDER BY ended_at DESC;
```

### 5. Gerar Relatório de Atividade
**Arquivo:** `USER_SESSIONS_QUERIES.sql` (seção 7)
```sql
-- Resumo geral, picos de uso, taxa de retenção
```

### 6. Configurar Timeout de Inatividade
**Arquivo:** `src/hooks/useSessionMonitor.ts`
```typescript
useInactivityTimeout(30); // 30 minutos
```

### 7. Receber Alerta de Múltiplos Logins
**Arquivo:** `USER_SESSIONS_QUERIES.sql` (seção 8)
```sql
-- Ver usuários logados em múltiplos IPs
```

---

## 🔧 Manutenção

### Diária
- Verificar usuários online: `USER_SESSIONS_QUERIES.sql` seção 2

### Semanal
- Ver estatísticas: `USER_SESSIONS_QUERIES.sql` seção 3
- Verificar execuções do cron: `USER_SESSIONS_QUERIES.sql` seção 4

### Mensal
- Limpar histórico antigo: `USER_SESSIONS_QUERIES.sql` seção 6
- Gerar relatórios: `USER_SESSIONS_QUERIES.sql` seção 7

### Quando Houver Problema
- Seguir: `DEPLOY_USER_SESSIONS_GUIDE.md` seção 5 (Troubleshooting)

---

## 📞 Referência Rápida

| Preciso de... | Arquivo |
|---------------|---------|
| Instalar o sistema | `SESSOES_QUICKSTART.md` |
| Executar SQL | `apply-user-sessions-migration.sql` |
| Verificar instalação | `VERIFICAR_DASHBOARD_SUPABASE.md` |
| Integrar no frontend | `src/lib/userSessionManager.ts` + `src/hooks/useSessionMonitor.ts` |
| Ver exemplos de código | `src/examples/SessionIntegrationExamples.tsx` |
| Executar queries | `USER_SESSIONS_QUERIES.sql` |
| Resolver problemas | `DEPLOY_USER_SESSIONS_GUIDE.md` seção 5 |
| Documentação completa | `DEPLOY_USER_SESSIONS_GUIDE.md` |

---

## ✅ Checklist Final

### Instalação
- [ ] Executei `apply-user-sessions-migration.sql` no Supabase
- [ ] Verifiquei que pg_cron está ativo
- [ ] Cron job `cleanup-expired-user-sessions` está rodando
- [ ] Tabelas `user_sessions` e `user_session_history` existem

### Integração Frontend
- [ ] Copiei `userSessionManager.ts` para meu projeto
- [ ] Copiei `useSessionMonitor.ts` para meu projeto
- [ ] Adicionei `useSessionMonitor()` no App principal
- [ ] Integrei criação de sessão no login
- [ ] Integrei encerramento de sessão no logout

### Testes
- [ ] Login cria sessão no banco
- [ ] Logout encerra sessão
- [ ] Sessão aparece como "ativa" no banco
- [ ] Cron job limpa sessões expiradas
- [ ] Super admin consegue ver usuários online

### Opcional
- [ ] Dashboard de usuários online
- [ ] Timeout de inatividade
- [ ] Alertas de múltiplos logins
- [ ] Relatórios de atividade

---

## 🎉 Pronto!

Com este índice você tem acesso rápido a tudo o que precisa para:
- ✅ Instalar o sistema
- ✅ Integrar com frontend
- ✅ Monitorar usuários online
- ✅ Gerar relatórios
- ✅ Resolver problemas
- ✅ Manter o sistema

**Comece por:** `SESSOES_QUICKSTART.md` 🚀

---

**Versão:** 1.0.0  
**Data:** Outubro 2025  
**Projeto:** TVDoutor ADS

