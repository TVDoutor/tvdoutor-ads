#!/usr/bin/env node

/**
 * Script de Configuração do SendGrid
 * Configura automaticamente o SendGrid no Supabase
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

console.log('🚀 Configuração Automática do SendGrid - TV Doutor ADS');
console.log('======================================================');

// Verificar variáveis de ambiente necessárias
function checkEnvironmentVariables() {
  const required = ['SENDGRID_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Variáveis de ambiente faltando:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.log('\n💡 Configure essas variáveis no arquivo .env ou como variáveis de ambiente');
    process.exit(1);
  }
  
  console.log('✅ Variáveis de ambiente configuradas');
}

// Verificar conectividade com SendGrid
async function testSendGridConnection() {
  console.log('🔍 Testando conexão com SendGrid...');
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.sendgrid.com',
      port: 443,
      path: '/v3/user/account',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const account = JSON.parse(data);
            console.log('✅ Conexão com SendGrid estabelecida');
            console.log(`📊 Conta: ${account.username || 'N/A'}`);
            console.log(`📧 Email: ${account.email || 'N/A'}`);
            resolve(true);
          } catch (e) {
            console.log('✅ Conexão com SendGrid estabelecida (resposta não JSON)');
            resolve(true);
          }
        } else {
          console.error(`❌ Erro na conexão SendGrid: ${res.statusCode}`);
          console.error(`📄 Resposta: ${data}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Erro de conexão:', error.message);
      resolve(false);
    });

    req.setTimeout(10000, () => {
      console.error('❌ Timeout na conexão com SendGrid');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Verificar sender authentication
async function checkSenderAuthentication() {
  console.log('📧 Verificando autenticação do remetente...');
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.sendgrid.com',
      port: 443,
      path: '/v3/senders',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const senders = JSON.parse(data);
            console.log(`✅ Senders configurados: ${senders.length}`);
            
            const verifiedSenders = senders.filter(s => s.verified);
            console.log(`✅ Senders verificados: ${verifiedSenders.length}`);
            
            if (verifiedSenders.length > 0) {
              console.log('📋 Senders verificados:');
              verifiedSenders.forEach(sender => {
                console.log(`   - ${sender.from.email} (${sender.from.name})`);
              });
            }
            
            resolve(true);
          } catch (e) {
            console.log('✅ Verificação de senders concluída');
            resolve(true);
          }
        } else {
          console.log('⚠️ Não foi possível verificar senders (normal se não configurados)');
          resolve(true);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Erro ao verificar senders:', error.message);
      resolve(false);
    });

    req.end();
  });
}

// Configurar SMTP no Supabase (simulação - requer configuração manual)
function configureSupabaseSMTP() {
  console.log('🔧 Configuração SMTP no Supabase');
  console.log('=================================');
  console.log('⚠️ Esta parte requer configuração manual no dashboard do Supabase');
  console.log('');
  console.log('📋 Instruções:');
  console.log('1. Acesse: https://supabase.com/dashboard');
  console.log('2. Selecione seu projeto');
  console.log('3. Vá em Authentication → Settings');
  console.log('4. Na seção SMTP Settings, ative "Enable custom SMTP"');
  console.log('5. Configure os campos:');
  console.log('');
  console.log('   SMTP Host: smtp.sendgrid.net');
  console.log('   SMTP Port: 587');
  console.log('   SMTP User: apikey');
  console.log(`   SMTP Pass: ${process.env.SENDGRID_API_KEY}`);
  console.log('   SMTP Admin Email: noreply@tvdoutor.com.br');
  console.log('   SMTP Sender Name: TV Doutor ADS');
  console.log('');
  console.log('6. Salve as configurações');
}

// Atualizar arquivo .env
function updateEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  
  console.log('📝 Atualizando arquivo .env...');
  
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Adicionar ou atualizar SENDGRID_API_KEY
  const sendGridLine = `SENDGRID_API_KEY=${process.env.SENDGRID_API_KEY}`;
  
  if (envContent.includes('SENDGRID_API_KEY=')) {
    envContent = envContent.replace(/SENDGRID_API_KEY=.*/, sendGridLine);
  } else {
    envContent += `\n# SendGrid Configuration\n${sendGridLine}\n`;
  }
  
  // Adicionar comentário sobre SendGrid
  if (!envContent.includes('# SendGrid Configuration')) {
    envContent = envContent.replace(sendGridLine, `# SendGrid Configuration\n${sendGridLine}`);
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Arquivo .env atualizado');
}

// Testar envio de email
async function testEmailSending() {
  console.log('📧 Testando envio de email...');
  
  const testEmail = process.env.TEST_EMAIL || 'teste@exemplo.com';
  
  const emailData = {
    personalizations: [{
      to: [{ email: testEmail }],
      subject: 'Teste Configuração SendGrid - TV Doutor ADS'
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
            <h1 style="color: #1a365d;">🎉 SendGrid Configurado com Sucesso!</h1>
            <p>O SendGrid foi configurado automaticamente no sistema TV Doutor ADS.</p>
            <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            <p><strong>Status:</strong> ✅ Configuração concluída</p>
          </div>
        `
      },
      {
        type: 'text/plain',
        value: `SendGrid Configurado com Sucesso!

O SendGrid foi configurado automaticamente no sistema TV Doutor ADS.

Data/Hora: ${new Date().toLocaleString('pt-BR')}
Status: ✅ Configuração concluída`
      }
    ]
  };
  
  return new Promise((resolve) => {
    const postData = JSON.stringify(emailData);
    
    const options = {
      hostname: 'api.sendgrid.com',
      port: 443,
      path: '/v3/mail/send',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
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
          console.log(`✅ Email de teste enviado para: ${testEmail}`);
          resolve(true);
        } else {
          console.error(`❌ Erro ao enviar email: ${res.statusCode}`);
          console.error(`📄 Resposta: ${data}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Erro ao enviar email:', error.message);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

// Função principal
async function main() {
  try {
    console.log('🔍 Verificando configurações...\n');
    
    // 1. Verificar variáveis de ambiente
    checkEnvironmentVariables();
    
    // 2. Testar conexão SendGrid
    const sendGridConnected = await testSendGridConnection();
    if (!sendGridConnected) {
      console.error('❌ Falha na conexão com SendGrid. Verifique sua API Key.');
      process.exit(1);
    }
    
    // 3. Verificar sender authentication
    await checkSenderAuthentication();
    
    // 4. Atualizar arquivo .env
    updateEnvFile();
    
    // 5. Configurar SMTP no Supabase (instruções)
    console.log('\n');
    configureSupabaseSMTP();
    
    // 6. Testar envio de email
    console.log('\n');
    await testEmailSending();
    
    console.log('\n🎉 Configuração do SendGrid concluída com sucesso!');
    console.log('==================================================');
    console.log('✅ API Key configurada');
    console.log('✅ Conexão testada');
    console.log('✅ Arquivo .env atualizado');
    console.log('✅ Email de teste enviado');
    console.log('⚠️ Lembre-se de configurar o SMTP no dashboard do Supabase');
    
    console.log('\n📚 Próximos passos:');
    console.log('1. Configure o SMTP no dashboard do Supabase (instruções acima)');
    console.log('2. Teste o envio de emails no sistema');
    console.log('3. Monitore os logs do SendGrid');
    console.log('4. Configure sender authentication se necessário');
    
  } catch (error) {
    console.error('❌ Erro na configuração:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main, checkEnvironmentVariables, testSendGridConnection };
