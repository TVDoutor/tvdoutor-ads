#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import deployConfig from '../deploy.config.js';

// Cores para output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
  try {
    log(`🔄 ${description}...`, 'yellow');
    const output = execSync(command, { 
      stdio: 'inherit',
      encoding: 'utf8',
      cwd: process.cwd()
    });
    log(`✅ ${description} concluído`, 'green');
    return output;
  } catch (error) {
    log(`❌ Erro em: ${description}`, 'red');
    log(`Comando: ${command}`, 'gray');
    log(`Erro: ${error.message}`, 'red');
    throw error;
  }
}

function checkPrerequisites() {
  log('🔍 Verificando pré-requisitos...', 'yellow');
  
  // Verificar se estamos no diretório correto
  if (!existsSync('package.json')) {
    throw new Error('Execute este script no diretório raiz do projeto');
  }
  
  // Verificar se o Vercel CLI está instalado
  try {
    execSync('vercel --version', { stdio: 'pipe' });
    log('✅ Vercel CLI encontrado', 'green');
  } catch {
    log('⚠️ Vercel CLI não encontrado. Instale com: npm i -g vercel', 'yellow');
  }
  
  // Verificar se o Supabase CLI está instalado
  try {
    execSync('npx supabase --version', { stdio: 'pipe' });
    log('✅ Supabase CLI encontrado', 'green');
  } catch {
    log('⚠️ Supabase CLI não encontrado', 'yellow');
  }
}

function getGitStatus() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    return status.trim();
  } catch {
    return '';
  }
}

function commitAndPush(message) {
  const gitStatus = getGitStatus();
  
  if (gitStatus) {
    log('📝 Alterações detectadas:', 'yellow');
    log(gitStatus, 'gray');
    
    execCommand('git add .', 'Adicionando alterações ao Git');
    execCommand(`git commit -m "${message}"`, 'Fazendo commit');
    execCommand('git push origin main', 'Enviando para o repositório');
    
    log('✅ Alterações enviadas para o repositório', 'green');
  } else {
    log('✅ Nenhuma alteração detectada', 'green');
  }
}

function buildProject() {
  log('🔨 Executando build de produção...', 'yellow');
  execCommand('npm run build:prod', 'Build de produção');
  log('✅ Build concluído com sucesso', 'green');
}

function deploySupabase() {
  try {
    log('🗄️ Aplicando migrações do Supabase...', 'yellow');
    execCommand('npx supabase db push --yes', 'Migrações do Supabase');
    log('✅ Migrações do Supabase aplicadas', 'green');
  } catch (error) {
    log('⚠️ Aviso: Erro nas migrações do Supabase, mas continuando...', 'yellow');
  }
}

function deployVercel(isPreview = false) {
  const deployType = isPreview ? 'preview' : 'produção';
  log(`🌐 Fazendo deploy para Vercel (${deployType})...`, 'yellow');
  
  const command = isPreview ? 'vercel' : 'vercel --prod';
  execCommand(command, `Deploy para Vercel (${deployType})`);
  
  log('✅ Deploy para Vercel concluído', 'green');
}

function showSummary(isPreview = false) {
  const config = isPreview ? deployConfig.preview : deployConfig.production;
  
  log('===============================================', 'green');
  log('🎉 Deploy Automático Concluído!', 'green');
  log('===============================================', 'green');
  log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`, 'gray');
  log(`🌐 Aplicação disponível em: ${config.appUrl}`, 'cyan');
  log(`📊 Dashboard Supabase: https://supabase.com/dashboard`, 'cyan');
  log('===============================================', 'green');
}

// Função principal
async function main() {
  const args = process.argv.slice(2);
  const isPreview = args.includes('--preview');
  const skipCommit = args.includes('--skip-commit');
  const skipSupabase = args.includes('--skip-supabase');
  const message = args.find(arg => arg.startsWith('--message='))?.split('=')[1] || 
                 `Deploy automático - ${new Date().toLocaleString('pt-BR')}`;
  
  try {
    log('🚀 Iniciando Deploy Automático - TV Doutor ADS', 'green');
    log('===============================================', 'green');
    
    // Verificar pré-requisitos
    checkPrerequisites();
    
    // Commit e push (se não for pulado)
    if (!skipCommit) {
      commitAndPush(message);
    } else {
      log('⏭️ Pulando commit (--skip-commit especificado)', 'yellow');
    }
    
    // Build do projeto
    buildProject();
    
    // Deploy para Supabase (se não for pulado)
    if (!skipSupabase) {
      deploySupabase();
    } else {
      log('⏭️ Pulando Supabase (--skip-supabase especificado)', 'yellow');
    }
    
    // Deploy para Vercel
    deployVercel(isPreview);
    
    // Mostrar resumo
    showSummary(isPreview);
    
  } catch (error) {
    log('❌ Deploy falhou!', 'red');
    log(`Erro: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
