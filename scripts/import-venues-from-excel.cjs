#!/usr/bin/env node

/**
 * Script para importar venues e telas (screens) a partir do Excel oficial.
 * Faz UPSERT: atualiza os que já existem (por code) e insere os novos.
 *
 * Uso:
 *   node scripts/import-venues-from-excel.cjs [caminho-do-arquivo.xlsx]
 *
 * Variáveis de ambiente necessárias:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Colunas esperadas no Excel:
 *   CÓDIGO DE PONTO, Nome de Exibição, Endereço, Cidade, Estado, CEP,
 *   Especialidade, Ativo, Ambiente, Audiência Pacientes, Audiência Local,
 *   Audiência HCP, Audiência Médica, Aceita convênio,
 *   Latitude, Longitude, Taxa Padrão (Mês), Taxa Venda (Mês),
 *   Spots por Hora, Duração Spot (seg), Google Place ID, Google Maps URL
 */

const path = require('path');
try { require('dotenv').config(); } catch (_) {}

const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');

// Caminho do arquivo (argumento ou padrão)
const EXCEL_PATH = process.argv[2] || path.join(
  process.env.USERPROFILE || process.env.HOME,
  'OneDrive',
  'Área de Trabalho',
  'Nova pasta (2)',
  'inventario_tvdoutor_oficial_preenchido_campos.xlsx'
);

const BATCH_SIZE = 100;
const CODE_REGEX = /^P\d{4,5}(\.[A-Za-z0-9]+)*$/i;

function normalizeHeaderKey(value) {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^"+|"+$/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseNumberBR(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  let s = String(value).trim();
  if (!s) return null;
  s = s.replace(/[^\d,.\-]/g, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toInt(value) {
  const n = parseNumberBR(value);
  return n != null ? Math.round(n) : null;
}

function parseBoolean(value) {
  if (value === null || value === undefined || value === '') return true;
  if (typeof value === 'boolean') return value;
  const s = String(value).toLowerCase().trim();
  if (s === 'sim' || s === 'ativo' || s === 'true' || s === '1' || s === 'yes' || s === 's') return true;
  if (s === 'não' || s === 'nao' || s === 'n' || s === 'inativo' || s === 'false' || s === '0' || s === 'no') return false;
  return true;
}

function sanitizeCode(value) {
  if (value == null) return '';
  let s = String(value).trim().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, '');
  if (/^P\d{4,5},/i.test(s)) s = s.replace(/,/g, '.');
  return s;
}

function splitSpecialties(value) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  const text = String(value).trim();
  if (!text) return [];
  try {
    if (text.startsWith('[')) return JSON.parse(text);
  } catch (_) {}
  return text.split(/[,;|]/g).map(s => s.trim()).filter(Boolean);
}

function parseRow(row, headers) {
  const r = {};
  headers.forEach((h, i) => {
    r[normalizeHeaderKey(h)] = row[i];
  });

  const codeRaw = r['codigo de ponto'] ?? r['codigo'] ?? r['code'];
  const code = sanitizeCode(codeRaw);
  if (!code || !CODE_REGEX.test(code)) return null;

  const displayName = String(r['nome de exibicao'] ?? r['nome de exibição'] ?? '').trim();
  const lat = parseNumberBR(r['latitude']);
  const lng = parseNumberBR(r['longitude']);
  const active = parseBoolean(r['ativo'] ?? r['active']);
  const address = (r['endereco'] ?? r['endereço'] ?? '').toString().trim() || null;
  const city = (r['cidade'] ?? '').toString().trim() || null;
  const state = (r['estado'] ?? r['uf'] ?? '').toString().trim() || null;
  let cep = (r['cep'] ?? '').toString().trim();
  if (cep) cep = cep.replace(/\D/g, '');
  cep = (cep && cep.length === 8) ? cep : null;

  const specialty = splitSpecialties(r['especialidade'] ?? r['especialidades']);
  const googlePlaceId = (r['google place id'] ?? '').toString().trim() || null;
  const googleFormattedAddress = address || (r['google formatted address'] ?? '').toString().trim() || null;

  return {
    code,
    display_name: displayName || code,
    address,
    city,
    state,
    cep,
    lat: lat != null && lat >= -90 && lat <= 90 ? lat : null,
    lng: lng != null && lng >= -180 && lng <= 180 ? lng : null,
    active,
    specialty,
    google_place_id: googlePlaceId,
    google_formatted_address: googleFormattedAddress,
    ambiente: (r['ambiente'] ?? '').toString().trim() || null,
    audiencia_pacientes: toInt(r['audiencia pacientes'] ?? r['audiencia_pacientes']),
    audiencia_local: toInt(r['audiencia local'] ?? r['audiencia_local']),
    audiencia_hcp: toInt(r['audiencia hcp'] ?? r['audiencia_hcp']),
    audiencia_medica: toInt(r['audiencia medica'] ?? r['audiencia_medica']),
    aceita_convenio: (() => {
      const v = r['aceita convenio'] ?? r['aceita_convenio'];
      if (v == null || v === '') return null;
      const s = String(v).toLowerCase().trim();
      return s === 'sim' || s === 's' || s === 'true' || s === '1' || s === 'yes';
    })(),
    standard_rate_month: parseNumberBR(r['taxa padrao (mes)'] ?? r['taxa padrao (mês)'] ?? r['standard_rate_month']),
    selling_rate_month: parseNumberBR(r['taxa venda (mes)'] ?? r['taxa venda (mês)'] ?? r['selling_rate_month']),
    spots_per_hour: toInt(r['spots por hora'] ?? r['spots_per_hour']),
    spot_duration_secs: toInt(r['duracao spot (seg)'] ?? r['spot_duration_secs']),
  };
}

async function run() {
  console.log('📂 Lendo planilha:', EXCEL_PATH);

  const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error('❌ Configure VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
    console.error('   Crie um arquivo .env na raiz do projeto tvdoutor-ads com essas variáveis.');
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
  const row1 = ws.getRow(1);
  row1.eachCell((c, i) => { headers[i - 1] = c.value; });

  const rows = [];
  let skipped = 0;
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const values = [];
    row.eachCell((c, i) => { values[i - 1] = c.value; });
    const parsed = parseRow(values, headers);
    if (parsed) rows.push(parsed);
    else skipped++;
  });

  console.log(`✅ ${rows.length} linhas válidas, ${skipped} ignoradas`);

  const byCode = new Map();
  rows.forEach(r => byCode.set(r.code, r));
  const deduped = Array.from(byCode.values());
  if (deduped.length < rows.length) {
    console.log(`   (${rows.length - deduped.length} duplicatas removidas por código)`);
  }

  const codeToVenueId = new Map();
  const codeToScreenId = new Map();

  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const batch = deduped.slice(i, i + BATCH_SIZE);

    // 1. Upsert venues em batch
    const venuesBatch = batch.map(r => ({
      code: r.code,
      name: r.display_name,
      country: 'Brasil',
      state: r.state || null,
      district: r.city || null,
      lat: r.lat,
      lng: r.lng,
      google_place_id: r.google_place_id,
      google_formatted_address: r.google_formatted_address,
      updated_at: new Date().toISOString(),
    }));

    const { data: vData, error: vErr } = await supabase
      .from('venues')
      .upsert(venuesBatch, { onConflict: 'code' })
      .select('id, code');

    if (vErr) {
      console.error('❌ Erro ao upsert venues:', vErr.message);
      continue;
    }
    (vData ?? []).forEach(v => {
      if (v?.code && v?.id) codeToVenueId.set(v.code, v.id);
    });

    // 2. Upsert screens em batch (com venue_id)
    const screensBatch = batch.map(r => {
      const venueId = codeToVenueId.get(r.code);
      return {
        code: r.code,
        name: r.code,
        display_name: r.display_name,
        address_raw: r.address,
        city: r.city,
        state: r.state,
        cep: r.cep && r.cep.length === 8 ? r.cep : null,
        lat: r.lat,
        lng: r.lng,
        venue_id: venueId || null,
        active: r.active,
        specialty: r.specialty?.length ? r.specialty : [],
        google_place_id: r.google_place_id,
        google_formatted_address: r.google_formatted_address,
        audience_monthly: r.audiencia_pacientes ?? r.audiencia_local ?? null,
        ambiente: r.ambiente,
        audiencia_pacientes: r.audiencia_pacientes,
        audiencia_local: r.audiencia_local,
        audiencia_hcp: r.audiencia_hcp,
        audiencia_medica: r.audiencia_medica,
        aceita_convenio: r.aceita_convenio,
        class: 'ND',
        updated_at: new Date().toISOString(),
      };
    });

    const { data: sData, error: sErr } = await supabase
      .from('screens')
      .upsert(screensBatch, { onConflict: 'code' })
      .select('id, code');

    if (sErr) {
      console.error('❌ Erro ao upsert screens:', sErr.message);
      continue;
    }
    (sData ?? []).forEach(s => {
      if (s?.code && s?.id) codeToScreenId.set(s.code, s.id);
    });

    const rateRows = [];
    batch.forEach(r => {
      const sid = codeToScreenId.get(r.code);
      if (!sid) return;
      const hasRates = r.standard_rate_month != null || r.selling_rate_month != null ||
        r.spots_per_hour != null || r.spot_duration_secs != null;
      if (!hasRates) return;
      rateRows.push({
        screen_id: sid,
        standard_rate_month: r.standard_rate_month,
        selling_rate_month: r.selling_rate_month,
        spots_per_hour: r.spots_per_hour,
        spot_duration_secs: r.spot_duration_secs,
      });
    });

    if (rateRows.length > 0) {
      const screenIds = rateRows.map(x => x.screen_id);
      await supabase.from('screen_rates').delete().in('screen_id', screenIds);
      await supabase.from('screen_rates').insert(rateRows);
    }

    const pct = Math.round(((i + batch.length) / deduped.length) * 100);
    process.stdout.write(`\r   Progresso: ${pct}% (${i + batch.length}/${deduped.length})`);
  }

  const totalVenues = codeToVenueId.size;
  const totalScreens = codeToScreenId.size;
  console.log('\n');
  console.log('✅ Importação concluída:');
  console.log(`   Venues: ${totalVenues} criados/atualizados`);
  console.log(`   Screens: ${totalScreens} criados/atualizados`);
}

run().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
