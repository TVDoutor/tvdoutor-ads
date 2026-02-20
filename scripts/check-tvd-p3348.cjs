#!/usr/bin/env node
/**
 * Verifica venue_codes P3348.F04* em tvd_player_status (diagnóstico).
 * Uso: node scripts/check-tvd-p3348.cjs
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  console.log('\n🔍 Buscando venue_codes que contêm P3348.F04...\n');

  const { data, error } = await supabase
    .from('tvd_player_status')
    .select('player_id, player_name, venue_code, is_connected, last_seen')
    .ilike('venue_code', 'P3348.F04%')
    .order('venue_code');

  if (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }

  if (!data?.length) {
    console.log('⚠️  Nenhum registro encontrado com venue_code P3348.F04*');
    console.log('\n   Possíveis causas:');
    console.log('   - O app.tvdoutor não tem players com esses códigos');
    console.log('   - O nome do player no TVD usa formato diferente (ex: P3348 F04 3)');
    console.log('\n   Verificando formato alternativo (player_name)...\n');

    const { data: byName } = await supabase
      .from('tvd_player_status')
      .select('player_id, player_name, venue_code')
      .or('player_name.ilike.%P3348%F04%3%');
    console.log('   Por player_name contendo P3348/F04/3:', byName?.length || 0, 'linhas');
    if (byName?.length) {
      byName.slice(0, 5).forEach((r) => console.log('     ', r.player_name, '→', r.venue_code));
    }
    return;
  }

  console.log(`✅ Encontrados ${data.length} registro(s):\n`);
  data.forEach((r) => {
    console.log(`   ${r.venue_code}  |  ${r.is_connected ? 'Online' : 'Offline'}  |  ${r.last_seen || '-'}  |  ${r.player_name || '-'}`);
  });

  const has3 = data.some((r) => r.venue_code === 'P3348.F04.3' || r.venue_code === 'P3348.F04.03');
  if (!has3) {
    console.log('\n⚠️  P3348.F04.3 e P3348.F04.03 NÃO encontrados na tabela.');
  }
}

main();
