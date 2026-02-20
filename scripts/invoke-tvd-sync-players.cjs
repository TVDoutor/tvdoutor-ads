#!/usr/bin/env node
/**
 * Invoca a Edge Function tvd-sync-players com header x-cron-secret.
 *
 * Requer no .env:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *   TVD_SYNC_CRON_SECRET (o mesmo valor configurado nos secrets do Supabase)
 *
 * Uso: node scripts/invoke-tvd-sync-players.cjs [TVD_SYNC_CRON_SECRET]
 *   ou: npm run sync:players  (com TVD_SYNC_CRON_SECRET no .env)
 */

require('dotenv').config();

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const cronSecret = process.env.TVD_SYNC_CRON_SECRET || process.argv[2];

if (!url || !anonKey) {
  console.error('❌ Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env');
  process.exit(1);
}

if (!cronSecret) {
  console.error('❌ Configure TVD_SYNC_CRON_SECRET no .env ou passe como argumento:');
  console.error('   node scripts/invoke-tvd-sync-players.cjs SEU_SECRET');
  console.error('   npm run sync:players -- SEU_SECRET');
  process.exit(1);
}

const functionUrl = `${url.replace(/\/$/, '')}/functions/v1/tvd-sync-players`;

console.log('🔄 Invocando tvd-sync-players...');

fetch(functionUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${anonKey}`,
    'x-cron-secret': cronSecret,
  },
  body: JSON.stringify({}),
})
  .then(async (res) => {
    const text = await res.text();
    if (!res.ok) {
      console.error('❌ Erro:', res.status, res.statusText);
      console.error(text);
      process.exit(1);
    }
    console.log('✅ tvd-sync-players executada com sucesso');
    if (text) console.log(text);
  })
  .catch((err) => {
    console.error('❌ Falha na requisição:', err.message);
    process.exit(1);
  });
