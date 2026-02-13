// Script para testar a Edge Function de PDF Profissional
// Execute: node scripts/test-pdf-pro-function.js

const https = require('https');
const fs = require('fs');

// Configurações
const PROPOSAL_ID = 40; // ID da proposta para testar
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vaogzhwzucijiyvyglls.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ Erro: SUPABASE_ANON_KEY não definida');
  console.log('Configure com: export SUPABASE_ANON_KEY="sua-anon-key"');
  process.exit(1);
}

const functionUrl = `${SUPABASE_URL}/functions/v1/pdf-proposal-pro`;

console.log('🧪 Testando Edge Function PDF Profissional');
console.log('==========================================');
console.log(`📡 URL: ${functionUrl}`);
console.log(`📋 Proposta ID: ${PROPOSAL_ID}`);
console.log('');

// Dados para enviar
const requestData = JSON.stringify({
  proposalId: PROPOSAL_ID,
  summary: {
    netValue: 81000,
    grossValue: 90000,
    days: 30,
    impacts: 1620000,
    screens: 9
  }
});

// Configuração da requisição
const options = {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestData)
  }
};

console.log('🚀 Enviando requisição...');

const req = https.request(functionUrl, options, (res) => {
  console.log(`📊 Status: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  console.log('');

  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(responseData);
      
      if (res.statusCode === 200) {
        console.log('✅ Sucesso!');
        console.log(`📄 PDF Base64 recebido: ${response.pdfBase64 ? 'Sim' : 'Não'}`);
        console.log(`🏷️  Tipo: ${response.kind || 'Não especificado'}`);
        
        if (response.pdfBase64) {
          // Salvar PDF para teste
          const pdfBuffer = Buffer.from(response.pdfBase64, 'base64');
          const filename = `test-proposal-${PROPOSAL_ID}.pdf`;
          
          fs.writeFileSync(filename, pdfBuffer);
          console.log(`💾 PDF salvo como: ${filename}`);
          console.log(`📏 Tamanho: ${pdfBuffer.length} bytes`);
          
          // Verificar se é um PDF válido
          if (pdfBuffer.toString('ascii', 0, 4) === '%PDF') {
            console.log('✅ PDF válido detectado!');
          } else {
            console.log('⚠️  Arquivo pode não ser um PDF válido');
          }
        }
      } else {
        console.log('❌ Erro na resposta:');
        console.log(JSON.stringify(response, null, 2));
      }
    } catch (error) {
      console.log('❌ Erro ao processar resposta:');
      console.log('Resposta raw:', responseData);
      console.log('Erro:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro na requisição:', error.message);
});

req.on('timeout', () => {
  console.error('⏰ Timeout na requisição');
  req.destroy();
});

// Timeout de 30 segundos (Playwright pode demorar)
req.setTimeout(30000);

// Enviar dados
req.write(requestData);
req.end();

console.log('⏳ Aguardando resposta... (pode demorar 10-15s)');
