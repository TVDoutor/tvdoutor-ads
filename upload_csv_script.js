// Script para upload de CSV via API do Supabase
// Execute com: node upload_csv_script.js

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const supabaseUrl = 'https://vaogzhwzucijiyvyglls.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2d6aHd6dWNpaml5dnlnbGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2OTA0MDAsImV4cCI6MjA3MDI2NjQwMH0.gD0doH4jPy-8tN9YoPGBFPZNpDUQsHginYSYgsdYb6w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadCSV(filePath) {
  try {
    console.log('📁 Lendo arquivo CSV...');
    const csvContent = fs.readFileSync(filePath, 'utf8');
    
    console.log('📊 Processando dados...');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    const screens = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',');
      const screen = {};
      
      headers.forEach((header, index) => {
        let value = values[index]?.trim();
        
        // Tratamento especial para arrays (specialty)
        if (header === 'specialty' && value) {
          value = value.replace(/"/g, '').split(',').map(s => s.trim());
        }
        
        // Tratamento para números
        if (['lat', 'lng', 'base_daily_traffic'].includes(header)) {
          value = value ? parseFloat(value) : null;
        }
        
        // Tratamento para boolean
        if (header === 'active') {
          value = value === 'true';
        }
        
        screen[header] = value;
      });
      
      screens.push(screen);
    }
    
    console.log(`📤 Enviando ${screens.length} telas...`);
    
    // Upload em lotes de 100
    const batchSize = 100;
    for (let i = 0; i < screens.length; i += batchSize) {
      const batch = screens.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('screens')
        .upsert(batch, { 
          onConflict: 'code',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error('❌ Erro no lote:', error);
      } else {
        console.log(`✅ Lote ${Math.floor(i/batchSize) + 1} enviado com sucesso`);
      }
    }
    
    console.log('🎉 Upload concluído!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Uso: node upload_csv_script.js caminho/para/arquivo.csv
const filePath = process.argv[2];
if (!filePath) {
  console.log('❌ Por favor, forneça o caminho do arquivo CSV');
  console.log('Uso: node upload_csv_script.js caminho/para/arquivo.csv');
  process.exit(1);
}

uploadCSV(filePath);
