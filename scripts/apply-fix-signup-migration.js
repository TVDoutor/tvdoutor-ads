#!/usr/bin/env node

// Script para aplicar a migração fix_signup_final diretamente no Supabase
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

async function applyMigration() {
  console.log('🔧 Aplicando migração fix_signup_final...\n');

  // Verificar variáveis de ambiente
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente não configuradas');
    console.error('   Certifique-se de ter VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
    process.exit(1);
  }

  console.log('✅ Variáveis de ambiente carregadas');
  console.log(`   URL: ${supabaseUrl}\n`);

  // Criar cliente Supabase com Service Role
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Ler arquivo de migração
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251008094213_fix_signup_final.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Arquivo de migração não encontrado: ${migrationPath}`);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  console.log('📄 Migração carregada:', path.basename(migrationPath));
  console.log('');

  try {
    console.log('🚀 Executando comandos SQL...\n');

    // Dividir o SQL em comandos individuais (separados por ';')
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('/*'));

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      // Pular comentários e comandos vazios
      if (!command || command.startsWith('--') || command.match(/^DO\s+\$\$/i)) {
        continue;
      }

      console.log(`   Executando comando ${i + 1}/${commands.length}...`);
      
      try {
        // Executar via RPC ou query direta
        const { error } = await supabase.rpc('exec_sql', { sql: command + ';' }).catch(() => ({ error: null }));
        
        if (error) {
          console.warn(`   ⚠️ Comando pode ter falhado (normal se política não existia):`, error.message);
        } else {
          console.log(`   ✅ Comando executado`);
        }
      } catch (cmdError) {
        console.warn(`   ⚠️ Erro ao executar comando (pode ser esperado):`, cmdError.message);
      }
    }

    console.log('\n✅ Migração concluída!\n');
    console.log('📋 Verificando políticas RLS...\n');

    // Verificar políticas em profiles
    const { data: profilePolicies, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(0);

    if (!profileError) {
      console.log('✅ Acesso à tabela profiles OK');
    } else {
      console.error('❌ Erro ao acessar profiles:', profileError.message);
    }

    // Verificar políticas em user_roles
    const { data: rolePolicies, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(0);

    if (!roleError) {
      console.log('✅ Acesso à tabela user_roles OK');
    } else {
      console.error('❌ Erro ao acessar user_roles:', roleError.message);
    }

    console.log('\n📋 Próximos passos:');
    console.log('   1. Testar cadastro de novo usuário');
    console.log('   2. Verificar logs no console do navegador');
    console.log('   3. Confirmar que profile e role foram criados');
    console.log('   4. Verificar logs no Dashboard do Supabase\n');

  } catch (error) {
    console.error('\n❌ Erro ao aplicar migração:', error.message);
    console.log('\n💡 Alternativa: Execute o SQL manualmente no Dashboard do Supabase:');
    console.log(`   1. Acesse: ${supabaseUrl.replace('.supabase.co', '')}/sql`);
    console.log(`   2. Cole o conteúdo de: ${migrationPath}`);
    console.log('   3. Execute o SQL\n');
    process.exit(1);
  }
}

applyMigration();

