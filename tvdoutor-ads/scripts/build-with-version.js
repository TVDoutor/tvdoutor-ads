#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

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

function getCurrentVersion() {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  return packageJson.version;
}

function incrementVersion(version, type = 'patch') {
  const [major, minor, patch] = version.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

function updatePackageVersion(newVersion) {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  packageJson.version = newVersion;
  writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
  log(`✅ Versão atualizada para ${newVersion}`, 'green');
}

function buildProject() {
  log('🔨 Executando build de produção...', 'yellow');
  execSync('npm run build:prod', { stdio: 'inherit' });
  log('✅ Build concluído com sucesso', 'green');
}

function deployToVercel() {
  log('🌐 Fazendo deploy para Vercel...', 'yellow');
  execSync('npx vercel --prod --yes', { stdio: 'inherit' });
  log('✅ Deploy para Vercel concluído', 'green');
}

function showSummary(newVersion) {
  log('===============================================', 'green');
  log('🎉 Build e Deploy Concluídos!', 'green');
  log('===============================================', 'green');
  log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`, 'gray');
  log(`🔢 Nova Versão: ${newVersion}`, 'cyan');
  log(`🌐 Aplicação disponível em: https://tvdoutor-ads.vercel.app`, 'cyan');
  log('===============================================', 'green');
}

// Função principal
async function main() {
  const args = process.argv.slice(2);
  const versionType = args[0] || 'patch';
  
  try {
    log('🚀 Iniciando Build e Deploy com Versionamento - TV Doutor ADS', 'green');
    log('===============================================', 'green');
    
    const currentVersion = getCurrentVersion();
    log(`📋 Versão atual: ${currentVersion}`, 'blue');
    
    const newVersion = incrementVersion(currentVersion, versionType);
    log(`🔄 Incrementando versão (${versionType}): ${currentVersion} → ${newVersion}`, 'yellow');
    
    updatePackageVersion(newVersion);
    buildProject();
    deployToVercel();
    showSummary(newVersion);
    
  } catch (error) {
    log('❌ Processo falhou!', 'red');
    log(`Erro: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
