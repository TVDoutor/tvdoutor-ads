#!/usr/bin/env node

/**
 * Script de Teste para SendGrid
 * Testa a integração do SendGrid com o sistema TV Doutor ADS
 */

const https = require('https');

// Configuração
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || 'SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const TEST_EMAIL = process.env.TEST_EMAIL || 'teste@exemplo.com';

console.log('🧪 Teste do SendGrid - TV Doutor ADS');
console.log('=====================================');

if (!SENDGRID_API_KEY || SENDGRID_API_KEY === 'SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
  console.error('❌ SENDGRID_API_KEY não configurada!');
  console.log('Configure a variável de ambiente SENDGRID_API_KEY com sua chave do SendGrid');
  process.exit(1);
}

// Dados do email de teste
const emailData = {
  personalizations: [{
    to: [{ email: TEST_EMAIL }],
    subject: 'Teste SendGrid - TV Doutor ADS'
  }],
  from: {
    email: 'noreply@tvdoutor.com.br',
    name: 'TV Doutor ADS'
  },
  content: [
    {
      type: 'text/html',
      value: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <h1 style="color: #1a365d; margin: 0;">TV Doutor</h1>
            <p style="color: #718096; margin: 5px 0 0 0;">Sistema de Propostas Comerciais</p>
          </div>
          
          <div style="background-color: white; padding: 30px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #2d3748; margin-bottom: 20px;">✅ Teste SendGrid Configurado</h2>
            <p>Parabéns! O SendGrid foi configurado com sucesso no sistema TV Doutor ADS.</p>
            
            <div style="background-color: #e6fffa; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3 style="color: #234e52; margin: 0 0 10px 0;">Configurações:</h3>
              <p style="margin: 5px 0;"><strong>Provedor:</strong> SendGrid</p>
              <p style="margin: 5px 0;"><strong>Limite:</strong> 100 emails/dia (gratuito)</p>
              <p style="margin: 5px 0;"><strong>Entrega:</strong> Excelente capacidade de entrega</p>
              <p style="margin: 5px 0;"><strong>Fallback:</strong> Resend (se SendGrid falhar)</p>
            </div>
            
            <p>O sistema agora pode enviar emails de propostas, notificações e outros comunicados com maior confiabilidade.</p>
            
            <p style="margin-top: 30px;">
              Atenciosamente,<br>
              <strong>Equipe TV Doutor ADS</strong>
            </p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #f7fafc; border-radius: 8px; text-align: center;">
            <p style="color: #718096; font-size: 12px; margin: 0;">
              Este é um email automático do sistema TV Doutor.<br>
              Para dúvidas, entre em contato: suporte@tvdoutor.com.br
            </p>
          </div>
        </div>
      `
    },
    {
      type: 'text/plain',
      value: `Teste SendGrid - TV Doutor ADS

Parabéns! O SendGrid foi configurado com sucesso no sistema TV Doutor ADS.

Configurações:
- Provedor: SendGrid
- Limite: 100 emails/dia (gratuito)
- Entrega: Excelente capacidade de entrega
- Fallback: Resend (se SendGrid falhar)

O sistema agora pode enviar emails de propostas, notificações e outros comunicados com maior confiabilidade.

Atenciosamente,
Equipe TV Doutor ADS

---
Este é um email automático do sistema TV Doutor.
Para dúvidas, entre em contato: suporte@tvdoutor.com.br`
    }
  ]
};

// Função para enviar email via SendGrid API
function sendEmail() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(emailData);
    
    const options = {
      hostname: 'api.sendgrid.com',
      port: 443,
      path: '/v3/mail/send',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            success: true,
            statusCode: res.statusCode,
            data: data || 'Email sent successfully'
          });
        } else {
          reject({
            success: false,
            statusCode: res.statusCode,
            error: data || 'Unknown error'
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        success: false,
        error: error.message
      });
    });

    req.write(postData);
    req.end();
  });
}

// Executar teste
async function runTest() {
  try {
    console.log(`📧 Enviando email de teste para: ${TEST_EMAIL}`);
    console.log(`🔑 Usando API Key: ${SENDGRID_API_KEY.substring(0, 10)}...`);
    
    const result = await sendEmail();
    
    if (result.success) {
      console.log('✅ Email enviado com sucesso!');
      console.log(`📊 Status Code: ${result.statusCode}`);
      console.log('📨 Verifique sua caixa de entrada (e spam)');
      
      console.log('\n🎉 SendGrid configurado com sucesso!');
      console.log('=====================================');
      console.log('✅ API Key válida');
      console.log('✅ Permissões configuradas');
      console.log('✅ Email de teste enviado');
      console.log('✅ Sistema pronto para produção');
      
    } else {
      console.error('❌ Erro ao enviar email:', result);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    
    if (error.statusCode) {
      console.log(`📊 Status Code: ${error.statusCode}`);
      
      switch (error.statusCode) {
        case 401:
          console.log('🔑 Problema: API Key inválida ou expirada');
          console.log('💡 Solução: Verifique sua chave API no dashboard do SendGrid');
          break;
        case 403:
          console.log('🚫 Problema: Permissões insuficientes');
          console.log('💡 Solução: Verifique se a API Key tem permissão para "Mail Send"');
          break;
        case 400:
          console.log('📝 Problema: Dados do email inválidos');
          console.log('💡 Solução: Verifique o formato do email e remetente');
          break;
        default:
          console.log('❓ Problema desconhecido');
      }
    }
  }
}

// Verificar se é execução direta
if (require.main === module) {
  runTest();
}

module.exports = { sendEmail, runTest };
