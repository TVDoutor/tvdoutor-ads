# 📧 Guia Completo do Resend

## ✅ Configuração Concluída

O Resend foi configurado com sucesso no sistema:

- **Chave API:** `re_HcsregrU_LD4JiZpuWpLv7mvRdMtbQqkR`
- **Arquivo .env:** Atualizado
- **Edge Functions:** Configuradas para usar o Resend

## 🚀 Como Usar o Resend

### **1. Uso Básico (Node.js)**

```javascript
import { Resend } from 'resend';

const resend = new Resend('re_HcsregrU_LD4JiZpuWpLv7mvRdMtbQqkR');

// Email simples
await resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'suporte@tvdoutor.com.br',
  subject: 'Você tem uma nova proposta gerada',
  html: '<p>Parabéns, uma nova proposta <strong>foi gerada!</strong></p>'
});
```

### **2. Email com Template HTML**

```javascript
await resend.emails.send({
  from: 'noreply@tvdoutor.com.br',
  to: 'cliente@exemplo.com',
  subject: 'Nova Proposta - TV Doutor ADS',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Nova Proposta Gerada</h2>
      <p>Olá,</p>
      <p>Uma nova proposta foi gerada para você:</p>
      <ul>
        <li><strong>Cliente:</strong> Nome do Cliente</li>
        <li><strong>Valor:</strong> R$ 10.000,00</li>
        <li><strong>Período:</strong> 4 semanas</li>
      </ul>
      <p>Acesse o sistema para visualizar os detalhes.</p>
      <p>Att,<br>Equipe TV Doutor ADS</p>
    </div>
  `
});
```

### **3. Email com Anexo**

```javascript
await resend.emails.send({
  from: 'propostas@tvdoutor.com.br',
  to: 'cliente@exemplo.com',
  subject: 'Proposta em PDF',
  html: '<p>Segue em anexo a proposta em PDF.</p>',
  attachments: [
    {
      filename: 'proposta.pdf',
      content: pdfBuffer, // Buffer do PDF
    }
  ]
});
```

## 🔧 Uso nas Edge Functions

### **Edge Function: send-proposal-email**

A Edge Function já está configurada para usar o Resend:

```typescript
// Em supabase/functions/send-proposal-email/index.ts
const resendApiKey = Deno.env.get('RESEND_API_KEY');
const resend = new Resend(resendApiKey);
```

### **Como chamar a Edge Function:**

```javascript
// Do frontend
const { data, error } = await supabase.functions.invoke('send-proposal-email', {
  body: {
    logId: 123,
    proposalId: 456,
    emailType: 'proposal_created',
    recipientEmail: 'cliente@exemplo.com',
    recipientType: 'customer',
    subject: 'Nova Proposta - TV Doutor ADS',
    customerName: 'João Silva',
    proposalType: 'Digital Out-of-Home'
  }
});
```

## 📋 Configuração de Domínio

### **Domínios Disponíveis:**

1. **onboarding@resend.dev** - Para testes
2. **noreply@tvdoutor.com.br** - Para emails automáticos
3. **propostas@tvdoutor.com.br** - Para propostas
4. **suporte@tvdoutor.com.br** - Para suporte

### **Para configurar domínio personalizado:**

1. Acesse o dashboard do Resend
2. Vá em Domains
3. Adicione seu domínio
4. Configure os registros DNS
5. Verifique o domínio

## 🧪 Testando o Resend

### **Script de Teste:**

```bash
node test-resend.js
```

### **Teste Manual:**

```javascript
// Teste rápido
const { Resend } = require('resend');
const resend = new Resend('re_HcsregrU_LD4JiZpuWpLv7mvRdMtbQqkR');

resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'seu-email@exemplo.com',
  subject: 'Teste Resend',
  html: '<p>Este é um teste do Resend!</p>'
}).then(console.log).catch(console.error);
```

## 📊 Monitoramento

### **Dashboard do Resend:**

- Acesse: [resend.com](https://resend.com)
- Vá em Emails para ver o histórico
- Monitore entregas e bounces
- Configure webhooks se necessário

### **Logs no Sistema:**

- Edge Functions logam tentativas de envio
- Verifique o console do Supabase
- Use o secureLogger para debug

## ⚠️ Limitações e Boas Práticas

### **Limites do Plano Gratuito:**

- 3.000 emails/mês
- 100 emails/dia
- Domínios limitados

### **Boas Práticas:**

1. **Sempre use try/catch:**
   ```javascript
   try {
     await resend.emails.send({...});
   } catch (error) {
     console.error('Erro ao enviar email:', error);
   }
   ```

2. **Valide emails antes de enviar:**
   ```javascript
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   if (!emailRegex.test(email)) {
     throw new Error('Email inválido');
   }
   ```

3. **Use templates consistentes:**
   - Mantenha o branding da TV Doutor
   - Use cores e fontes consistentes
   - Inclua informações de contato

## 🆘 Solução de Problemas

### **Erro: "Invalid API key"**
- Verifique se a chave está correta no .env
- Confirme se a chave está ativa no dashboard

### **Erro: "Domain not verified"**
- Use onboarding@resend.dev para testes
- Configure seu domínio no dashboard

### **Emails não chegam:**
- Verifique a pasta de spam
- Confirme se o domínio está verificado
- Verifique os logs do Resend

## 📞 Suporte

- **Documentação:** [resend.com/docs](https://resend.com/docs)
- **Dashboard:** [resend.com/emails](https://resend.com/emails)
- **Status:** [status.resend.com](https://status.resend.com)

---

**Status:** ✅ Configurado e funcionando
**Próximo passo:** Testar envio de emails no sistema
