// Script para fazer deploy da Edge Function para o Supabase via API
// Necessário ter o código da função e as credenciais

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configurações (ajustar conforme necessário)
const SUPABASE_PROJECT_REF = 'vaoqzhwzucijjyyvgils'; // Extraído da URL
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN; // Token de acesso pessoal

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ SUPABASE_ACCESS_TOKEN não encontrado');
  console.log('Obtenha em: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

// Ler o código da função
const functionPath = path.join(__dirname, '../supabase/functions/pdf-proposal-pro/index.ts');
const functionCode = fs.readFileSync(functionPath, 'utf8');

// Payload para o deploy
const payload = {
  slug: 'pdf-proposal-pro',
  body: functionCode,
  verify_jwt: false
};

// Configurar requisição
const options = {
  hostname: 'api.supabase.com',
  port: 443,
  path: `/v1/projects/${SUPABASE_PROJECT_REF}/functions`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(JSON.stringify(payload))
  }
};

console.log('🚀 Fazendo deploy da Edge Function...');

// Fazer requisição
const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ Deploy realizado com sucesso!');
      console.log('📄 Resposta:', JSON.parse(data));
    } else {
      console.error('❌ Erro no deploy:', res.statusCode);
      console.error('📄 Resposta:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro na requisição:', error);
});

// Enviar payload
req.write(JSON.stringify(payload));
req.end();

console.log('⏳ Aguardando resposta do Supabase...');
