# 📧 Guia de Configuração de Email - TV Doutor ADS

## 🔍 Problema Identificado

O sistema atualmente está usando **simulação de email** em desenvolvimento. Os emails são marcados como "enviados" no sistema, mas não chegam ao destinatário porque não há um serviço de email real configurado.

## ⚠️ Status Atual

- ✅ Sistema de logs de email funcionando
- ✅ Notificações sendo criadas no banco de dados
- ❌ Emails não são enviados de fato (apenas simulados)

## 🛠️ Soluções Recomendadas

### Opção 1: Resend (Recomendado)
**Vantagens:** Simples, confiável, boa para desenvolvimento e produção

```typescript
// Instalar: npm install resend
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmailWithResend(emailData: any): Promise<boolean> {
  try {
    const { data, error } = await resend.emails.send({
      from: 'noreply@tvdoutor.com.br',
      to: [emailData.recipientEmail],
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    });

    return !error;
  } catch (error) {
    console.error('Erro ao enviar email via Resend:', error);
    return false;
  }
}
```

### Opção 2: SendGrid
**Vantagens:** Muito confiável, bom para alto volume

```typescript
// Instalar: npm install @sendgrid/mail
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmailWithSendGrid(emailData: any): Promise<boolean> {
  try {
    await sgMail.send({
      from: 'noreply@tvdoutor.com.br',
      to: emailData.recipientEmail,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    });
    return true;
  } catch (error) {
    console.error('Erro ao enviar email via SendGrid:', error);
    return false;
  }
}
```

### Opção 3: Amazon SES
**Vantagens:** Muito barato, integra bem com AWS

```typescript
// Instalar: npm install @aws-sdk/client-ses
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({ region: 'us-east-1' });

async function sendEmailWithSES(emailData: any): Promise<boolean> {
  try {
    const command = new SendEmailCommand({
      Source: 'noreply@tvdoutor.com.br',
      Destination: {
        ToAddresses: [emailData.recipientEmail],
      },
      Message: {
        Subject: {
          Data: emailData.subject,
        },
        Body: {
          Html: {
            Data: emailData.html,
          },
          Text: {
            Data: emailData.text,
          },
        },
      },
    });

    await sesClient.send(command);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email via SES:', error);
    return false;
  }
}
```

## 🔧 Como Implementar

### 1. Escolher um Serviço de Email
Recomendamos **Resend** para começar (mais simples).

### 2. Obter Credenciais
- **Resend:** Criar conta em https://resend.com e obter API Key
- **SendGrid:** Criar conta em https://sendgrid.com e obter API Key
- **SES:** Configurar na AWS Console

### 3. Configurar Variáveis de Ambiente
Adicionar no arquivo `.env`:

```env
# Para Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx

# Para SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxx

# Para SES
AWS_ACCESS_KEY_ID=xxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxx
AWS_REGION=us-east-1
```

### 4. Modificar o Código
Substituir a função `simulateEmailSend` em:
- `src/lib/email-service.ts` (linha 96)
- `supabase/functions/send-proposal-email/index.ts` (linha 224)

### 5. Configurar Domínio (Produção)
Para produção, configurar SPF, DKIM e DMARC records no DNS:

```dns
TXT @ "v=spf1 include:_spf.resend.com ~all"
CNAME resend._domainkey.tvdoutor.com.br resend._domainkey.resend.com
```

## 🧪 Como Testar

1. **Desenvolvimento:** Usar email pessoal como destinatário
2. **Staging:** Configurar domínio de teste
3. **Produção:** Usar domínio oficial

## 📋 Checklist de Implementação

- [ ] Escolher serviço de email
- [ ] Criar conta no serviço escolhido
- [ ] Obter API Key/credenciais
- [ ] Configurar variáveis de ambiente
- [ ] Modificar código para usar serviço real
- [ ] Testar envio de email
- [ ] Configurar domínio (produção)
- [ ] Testar em produção

## 🚨 Importante

- **Nunca** commitar API Keys no código
- Usar variáveis de ambiente
- Testar com emails reais antes de produção
- Configurar rate limiting para evitar spam
- Implementar logs de erro adequados

## 📞 Próximos Passos

1. **Escolher serviço** (recomendo Resend)
2. **Implementar integração** seguindo um dos exemplos acima
3. **Testar funcionamento** com emails reais
4. **Configurar domínio** para produção

---

**Status:** 🔄 Aguardando implementação
**Prioridade:** 🔴 Alta (funcionalidade crítica)
**Tempo estimado:** 2-4 horas de desenvolvimento
