#!/usr/bin/env node

/**
 * Script para atualizar a coluna "class" (Classe) das telas no banco
 * a partir do Excel com coluna "Classe" (coluna Q).
 *
 * Uso:
 *   node scripts/update-class-from-excel.cjs [caminho-do-arquivo.xlsx]
 *
 * Variáveis de ambiente:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const path = require('path');
try { require('dotenv').config(); } catch (_) {}

const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');

const EXCEL_PATH = process.argv[2] || path.join(
  process.env.USERPROFILE || process.env.HOME,
  'OneDrive',
  'Área de Trabalho',
  'inventario_tvdoutor_oficial_preenchido_campos__classe_coluna_Q.xlsx'
);

const VALID_CLASSES = new Set(['A', 'AB', 'ABC', 'B', 'BC', 'C', 'CD', 'D', 'E', 'ND']);
const BATCH_SIZE = 200;
const CODE_REGEX = /^P\d{4,5}(\.\d+)?$/i;

function sanitizeCode(value) {
  if (value == null) return '';
  let s = String(value).trim().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, '');
  if (/^P\d{4,5},\d+$/i.test(s)) s = s.replace(',', '.');
  return s;
}

function normalizeClass(value) {
  if (value == null || value === '') return 'ND';
  const c = String(value).trim().toUpperCase();
  if (!c) return 'ND';
  return VALID_CLASSES.has(c) ? c : 'ND';
}

async function run() {
  console.log('📂 Lendo planilha:', EXCEL_PATH);

  const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error('❌ Configure VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  const ws = wb.worksheets[0];
  if (!ws) {
    console.error('❌ Planilha vazia');
    process.exit(1);
  }

  const headers = [];
  ws.getRow(1).eachCell((c, i) => { headers[i - 1] = c.value; });

  const codeToClass = new Map();
  let skipped = 0;
  let invalidClass = 0;

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const values = [];
    row.eachCell((c, i) => { values[i - 1] = c.value; });

    const codeRaw = values[0];
    const code = sanitizeCode(codeRaw);
    if (!code || !CODE_REGEX.test(code)) {
      skipped++;
      return;
    }

    const classeRaw = values[16];
    const classe = normalizeClass(classeRaw);
    if (classeRaw != null && String(classeRaw).trim() !== '' && !VALID_CLASSES.has(String(classeRaw).trim().toUpperCase())) {
      invalidClass++;
    }
    codeToClass.set(code, classe);
  });

  console.log(`✅ ${codeToClass.size} códigos com classe válida, ${skipped} ignorados`);
  if (invalidClass > 0) {
    console.log(`   (${invalidClass} classe(s) inválida(s) mapeadas para ND)`);
  }

  const entries = Array.from(codeToClass.entries());
  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    for (const [code, classe] of batch) {
      const { data, error } = await supabase
        .from('screens')
        .update({ class: classe, updated_at: new Date().toISOString() })
        .eq('code', code)
        .select('id');

      if (error) {
        console.error(`❌ Erro ao atualizar ${code}:`, error.message);
        errors++;
        continue;
      }
      if (data && data.length > 0) {
        updated++;
      } else {
        notFound++;
      }
    }

    const pct = Math.round(((i + batch.length) / entries.length) * 100);
    process.stdout.write(`\r   Progresso: ${pct}% (${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length})`);
  }

  console.log('\n');
  console.log('✅ Atualização concluída:');
  console.log(`   Telas atualizadas: ${updated}`);
  if (notFound > 0) console.log(`   Códigos não encontrados no banco: ${notFound}`);
  if (errors > 0) console.log(`   Erros: ${errors}`);
}

run().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
