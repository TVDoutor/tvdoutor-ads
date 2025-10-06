# 📧 Guia Completo: SendGrid como Provedor SMTP Customizado

## 🎯 Objetivo
Resolver problemas de envio de emails no Supabase configurando o SendGrid como provedor SMTP customizado, oferecendo limites muito maiores e melhor capacidade de entrega.

## 🚀 Configuração Implementada

### ✅ O que foi configurado:

1. **Edge Function atualizada** (`send-proposal-email/index.ts`)
   - Suporte ao SendGrid como provedor primário
   - Resend como fallback
   - Simulação como último recurso

2. **Scripts de configuração e teste**
   - `test-sendgrid.js` - Teste da integração
   - `scripts/setup-sendgrid.js` - Configuração automática

3. **Arquivos de configuração atualizados**
   - `env.example` - Variáveis do SendGrid
   - `CONFIGURACAO_SENDGRID_SMTP.md` - Guia detalhado

## 📋 Passo a Passo para Implementar

### 1. **Criar Conta SendGrid**

```bash
# 1. Acesse https://sendgrid.com
# 2. Crie uma conta gratuita (100 emails/dia)
# 3. Complete a verificação de email e telefone
```

### 2. **Obter API Key**

```bash
# No dashboard do SendGrid:
# 1. Settings → API Keys
# 2. Create API Key → Restricted Access
# 3. Mail Send: Full Access
# 4. Copie a chave (SG.xxxxxxxx...)
```

### 3. **Configurar Variáveis de Ambiente**

```bash
# Adicione ao arquivo .env:
SENDGRID_API_KEY=SG.sua_chave_api_aqui
TEST_EMAIL=seu_email@exemplo.com
```

### 4. **Testar a Configuração**

```bash
# Teste básico
node test-sendgrid.js

# Configuração automática
node scripts/setup-sendgrid.js
```

### 5. **Configurar SMTP no Supabase Dashboard**

```yaml
# Acesse: https://supabase.com/dashboard
# Authentication → Settings → SMTP Settings

SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Pass: SG.sua_chave_api_aqui
SMTP Admin Email: noreply@tvdoutor.com.br
SMTP Sender Name: TV Doutor ADS
Enable SSL/TLS: ✅
```

### 6. **Configurar Edge Function Environment**

```bash
# No Supabase Dashboard:
# Settings → Edge Functions → Environment Variables

SENDGRID_API_KEY=SG.sua_chave_api_aqui
RESEND_API_KEY=re_sua_chave_resend_aqui
```

## 🔧 Hierarquia de Provedores

O sistema agora funciona com a seguinte hierarquia:

```
1. SendGrid (Primário)
   ↓ (se falhar)
2. Resend (Fallback)
   ↓ (se falhar)
3. Simulação (Desenvolvimento)
```

### Código da Hierarquia:

```typescript
// Em send-proposal-email/index.ts
const success = await sendEmailWithSendGrid(emailData.recipientEmail, emailContent)
```

## 📊 Comparação de Limites

| Provedor | Limite Gratuito | Limite Pago | Entrega |
|----------|----------------|-------------|---------|
| **Supabase SMTP** | 3 emails/dia | Limitado | Básica |
| **Resend** | 3.000/mês | 100.000+/mês | Excelente |
| **SendGrid** | 100/dia | 40.000+/mês | Excelente |

## 🧪 Scripts de Teste

### Teste Básico:
```bash
# Configurar variável de ambiente
export SENDGRID_API_KEY=SG.sua_chave_aqui

# Executar teste
node test-sendgrid.js
```

### Teste Completo:
```bash
# Configurar todas as variáveis
export SENDGRID_API_KEY=SG.sua_chave_aqui
export SUPABASE_URL=https://seu-projeto.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=sua_service_key_aqui
export TEST_EMAIL=seu_email@exemplo.com

# Executar configuração automática
node scripts/setup-sendgrid.js
```

## 🔍 Monitoramento

### 1. **SendGrid Dashboard**
- Acesse: https://sendgrid.com
- Monitore entregas, bounces, spam
- Configure webhooks se necessário

### 2. **Supabase Logs**
- Vá em Logs → Edge Functions
- Monitore logs da função `send-proposal-email`
- Verifique erros e fallbacks

### 3. **Email Logs no Sistema**
- Tabela `email_logs` no Supabase
- Status: pending → sent/failed
- Timestamps e mensagens de erro

## 🚨 Solução de Problemas

### Erro: "Authentication failed"
```bash
# Verificar API Key
echo $SENDGRID_API_KEY

# Testar conectividade
node test-sendgrid.js
```

### Erro: "Domain not verified"
```bash
# Configurar sender authentication no SendGrid
# Settings → Sender Authentication → Verify Single Sender
```

### Emails não chegam
```bash
# 1. Verificar pasta de spam
# 2. Confirmar configurações DNS
# 3. Verificar logs do SendGrid
# 4. Testar com email diferente
```

### Limite excedido
```bash
# 1. Monitorar uso no dashboard SendGrid
# 2. Implementar queue system
# 3. Considerar upgrade do plano
```

## 📈 Próximos Passos

### 1. **Configuração de Produção**
- [ ] Configurar sender authentication
- [ ] Configurar domínio personalizado
- [ ] Configurar webhooks para eventos
- [ ] Implementar retry logic

### 2. **Monitoramento Avançado**
- [ ] Dashboard de métricas
- [ ] Alertas de falha
- [ ] Relatórios de entrega
- [ ] Análise de bounce/spam

### 3. **Otimizações**
- [ ] Templates de email
- [ ] Personalização por tipo
- [ ] A/B testing
- [ ] Analytics de engajamento

## 🔐 Segurança

### Boas Práticas:
1. **Nunca commitar API Keys**
2. **Usar variáveis de ambiente**
3. **Rotacionar chaves regularmente**
4. **Monitorar uso das chaves**
5. **Configurar alertas de segurança**

### Configuração Segura:
```bash
# .env (não commitar)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# .gitignore
.env
.env.local
.env.production
```

## 📞 Suporte

### Documentação:
- **SendGrid**: https://sendgrid.com/docs
- **Supabase Auth**: https://supabase.com/docs/auth
- **Edge Functions**: https://supabase.com/docs/functions

### Status:
- **SendGrid**: https://status.sendgrid.com
- **Supabase**: https://status.supabase.com

### Comunidade:
- **SendGrid Community**: https://community.sendgrid.com
- **Supabase Discord**: https://discord.supabase.com

---

## ✅ Status da Implementação

- [x] Edge Function atualizada com SendGrid
- [x] Scripts de teste criados
- [x] Documentação completa
- [x] Configuração de ambiente
- [ ] Configuração SMTP no Supabase (manual)
- [ ] Testes de produção
- [ ] Monitoramento ativo

**Próximo passo**: Configurar SMTP no dashboard do Supabase e testar em produção.
