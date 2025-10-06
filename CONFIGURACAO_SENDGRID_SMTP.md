# 📧 Configuração do SendGrid como Provedor SMTP Customizado

## 🎯 Objetivo
Configurar o SendGrid como provedor SMTP customizado no Supabase para resolver problemas de envio de emails e ter limites muito maiores e melhor capacidade de entrega.

## 🚀 Passo a Passo Completo

### 1. **Configurar Conta SendGrid**

#### 1.1 Criar Conta SendGrid
1. Acesse [sendgrid.com](https://sendgrid.com)
2. Crie uma conta gratuita (até 100 emails/dia)
3. Complete a verificação de email e telefone

#### 1.2 Gerar API Key
1. No dashboard do SendGrid, vá em **Settings** → **API Keys**
2. Clique em **Create API Key**
3. Escolha **Restricted Access** e configure:
   - **Mail Send**: Full Access
   - **Sender Authentication**: Read Access (opcional)
4. Copie a API Key gerada (exemplo: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

#### 1.3 Configurar Sender Authentication
1. Vá em **Settings** → **Sender Authentication**
2. Clique em **Verify a Single Sender**
3. Configure:
   - **From Name**: TV Doutor ADS
   - **From Email Address**: noreply@tvdoutor.com.br
   - **Reply To**: suporte@tvdoutor.com.br
   - **Company Address**: Endereço da empresa
4. Clique em **Create**

### 2. **Configurar SMTP Customizado no Supabase**

#### 2.1 Acessar Configurações do Supabase
1. Acesse o [dashboard do Supabase](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Authentication** → **Settings**

#### 2.2 Configurar SMTP Personalizado
1. Na seção **SMTP Settings**, ative **Enable custom SMTP**
2. Configure os campos:

```yaml
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Pass: SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMTP Admin Email: noreply@tvdoutor.com.br
SMTP Sender Name: TV Doutor ADS
```

#### 2.3 Configurações Avançadas (Opcional)
```yaml
Enable SSL/TLS: ✅
Enable StartTLS: ✅
Connection Timeout: 30
Command Timeout: 30
```

### 3. **Atualizar Edge Functions**

#### 3.1 Modificar send-proposal-email
```typescript
// supabase/functions/send-proposal-email/index.ts
// Adicionar suporte ao SendGrid além do Resend

async function sendEmailWithSendGrid(recipientEmail: string, emailContent: any): Promise<boolean> {
  const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
  
  if (!sendGridApiKey) {
    console.warn('⚠️ SENDGRID_API_KEY not configured, falling back to Resend');
    return await sendEmailWithResend(recipientEmail, emailContent);
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: recipientEmail }],
          subject: emailContent.subject
        }],
        from: {
          email: 'noreply@tvdoutor.com.br',
          name: 'TV Doutor ADS'
        },
        content: [
          {
            type: 'text/html',
            value: emailContent.html
          },
          {
            type: 'text/plain',
            value: emailContent.text
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ SendGrid error:', response.status, errorText);
      return false;
    }

    console.log('✅ Email sent via SendGrid successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Error sending email via SendGrid:', error);
    // Fallback to Resend
    return await sendEmailWithResend(recipientEmail, emailContent);
  }
}
```

### 4. **Configurar Variáveis de Ambiente**

#### 4.1 Adicionar ao .env
```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Manter configurações existentes
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
```

#### 4.2 Configurar no Supabase Dashboard
1. Vá em **Settings** → **Edge Functions**
2. Adicione as variáveis de ambiente:
   - `SENDGRID_API_KEY`: sua chave API do SendGrid

### 5. **Testar Configuração**

#### 5.1 Script de Teste SendGrid
```javascript
// test-sendgrid.js
const sgMail = require('@sendgrid/mail');

// Configure com sua API Key
sgMail.setApiKey('SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');

const msg = {
  to: 'teste@exemplo.com',
  from: {
    email: 'noreply@tvdoutor.com.br',
    name: 'TV Doutor ADS'
  },
  subject: 'Teste SendGrid - TV Doutor ADS',
  text: 'Este é um teste do SendGrid integrado ao Supabase.',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Teste SendGrid</h2>
      <p>Este é um teste do SendGrid integrado ao Supabase.</p>
      <p>Sistema: TV Doutor ADS</p>
    </div>
  `
};

sgMail.send(msg)
  .then(() => {
    console.log('✅ Email enviado com sucesso via SendGrid!');
  })
  .catch((error) => {
    console.error('❌ Erro ao enviar email:', error);
  });
```

#### 5.2 Testar Edge Function
```bash
# Testar a edge function
curl -X POST 'https://seu-projeto.supabase.co/functions/v1/send-proposal-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "logId": 1,
    "proposalId": 123,
    "emailType": "proposal_created",
    "recipientEmail": "teste@exemplo.com",
    "recipientType": "client",
    "subject": "Teste SendGrid - Nova Proposta",
    "customerName": "Cliente Teste",
    "proposalType": "Digital Out-of-Home"
  }'
```

### 6. **Configurar Templates de Email**

#### 6.1 Templates no Supabase
1. Vá em **Authentication** → **Email Templates**
2. Configure os templates:
   - **Confirm signup**
   - **Reset password**
   - **Change email address**
   - **Magic Link**

#### 6.2 Personalizar Templates
```html
<!-- Template base para TV Doutor ADS -->
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
    <h1 style="color: #1a365d; margin: 0;">TV Doutor</h1>
    <p style="color: #718096; margin: 5px 0 0 0;">Sistema de Propostas Comerciais</p>
  </div>
  
  <div style="background-color: white; padding: 30px; border-radius: 8px; border: 1px solid #e2e8f0;">
    {{CONTENT}}
  </div>
  
  <div style="margin-top: 20px; padding: 15px; background-color: #f7fafc; border-radius: 8px; text-align: center;">
    <p style="color: #718096; font-size: 12px; margin: 0;">
      Este é um email automático do sistema TV Doutor.<br>
      Para dúvidas, entre em contato: suporte@tvdoutor.com.br
    </p>
  </div>
</div>
```

## 📊 Comparação de Provedores

| Provedor | Limite Gratuito | Limite Pago | Entrega | Preço |
|----------|----------------|-------------|---------|-------|
| **Supabase** | 3 emails/dia | Limitado | Básica | Incluído |
| **Resend** | 3.000/mês | 100.000+/mês | Excelente | $20+/mês |
| **SendGrid** | 100/dia | 40.000+/mês | Excelente | $14.95+/mês |

## 🔧 Configurações de Produção

### Configurações Recomendadas
```yaml
# SendGrid
Rate Limiting: 600 emails/minuto
Retry Policy: 3 tentativas
Timeout: 30 segundos

# Supabase SMTP
Connection Pool: 10 conexões
Keep Alive: 30 segundos
SSL/TLS: Obrigatório
```

### Monitoramento
1. **SendGrid Dashboard**: Monitorar entregas, bounces, spam
2. **Supabase Logs**: Verificar logs das Edge Functions
3. **Email Logs**: Acompanhar status na tabela `email_logs`

## 🚨 Solução de Problemas

### Erro: "Authentication failed"
- Verificar se a API Key está correta
- Confirmar se o sender está verificado

### Erro: "Domain not verified"
- Configurar DNS records no SendGrid
- Verificar domínio no dashboard

### Emails não chegam
- Verificar pasta de spam
- Confirmar configurações DNS
- Verificar logs do SendGrid

### Limite excedido
- Monitorar uso no dashboard
- Implementar queue system
- Considerar upgrade do plano

## 📞 Suporte

- **SendGrid Docs**: [sendgrid.com/docs](https://sendgrid.com/docs)
- **Supabase Auth**: [supabase.com/docs/auth](https://supabase.com/docs/auth)
- **Status SendGrid**: [status.sendgrid.com](https://status.sendgrid.com)

---

**Status**: ✅ Configuração implementada
**Próximo passo**: Testar envio de emails e monitorar performance
