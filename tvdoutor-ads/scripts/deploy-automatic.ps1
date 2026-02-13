# Script de Deploy Automático para TV Doutor ADS
# Este script executa build, commit, push e deploy para Vercel

param(
    [string]$Message = "Deploy automático - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    [switch]$SkipCommit = $false,
    [switch]$SkipSupabase = $false,
    [switch]$Preview = $false
)

Write-Host "🚀 Iniciando Deploy Automático - TV Doutor ADS" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green

# Verificar se estamos no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script no diretório raiz do projeto" -ForegroundColor Red
    exit 1
}

# 1. Verificar status do Git
Write-Host "📋 Verificando status do Git..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus -and -not $SkipCommit) {
    Write-Host "📝 Alterações detectadas:" -ForegroundColor Yellow
    Write-Host $gitStatus -ForegroundColor Gray
    
    # Adicionar todas as alterações
    Write-Host "➕ Adicionando alterações ao Git..." -ForegroundColor Yellow
    git add .
    
    # Fazer commit
    Write-Host "💾 Fazendo commit..." -ForegroundColor Yellow
    git commit -m $Message
    
    # Push para o repositório
    Write-Host "📤 Enviando para o repositório..." -ForegroundColor Yellow
    git push origin main
    
    Write-Host "✅ Alterações enviadas para o repositório" -ForegroundColor Green
} elseif ($SkipCommit) {
    Write-Host "⏭️ Pulando commit (--SkipCommit especificado)" -ForegroundColor Yellow
} else {
    Write-Host "✅ Nenhuma alteração detectada" -ForegroundColor Green
}

# 2. Executar build de produção
Write-Host "🔨 Executando build de produção..." -ForegroundColor Yellow
npm run build:prod

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no build. Deploy cancelado." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build concluído com sucesso" -ForegroundColor Green

# 3. Deploy para Supabase (se não for pulado)
if (-not $SkipSupabase) {
    Write-Host "🗄️ Aplicando migrações do Supabase..." -ForegroundColor Yellow
    npx supabase db push --yes
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Aviso: Erro nas migrações do Supabase, mas continuando..." -ForegroundColor Yellow
    } else {
        Write-Host "✅ Migrações do Supabase aplicadas" -ForegroundColor Green
    }
} else {
    Write-Host "⏭️ Pulando Supabase (--SkipSupabase especificado)" -ForegroundColor Yellow
}

# 4. Deploy para Vercel
Write-Host "🌐 Fazendo deploy para Vercel..." -ForegroundColor Yellow

if ($Preview) {
    Write-Host "🔍 Deploy em modo preview..." -ForegroundColor Yellow
    vercel
} else {
    Write-Host "🚀 Deploy em produção..." -ForegroundColor Yellow
    vercel --prod
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no deploy do Vercel" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Deploy para Vercel concluído" -ForegroundColor Green

# 5. Resumo final
Write-Host "===============================================" -ForegroundColor Green
Write-Host "🎉 Deploy Automático Concluído!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host "📅 Data/Hora: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "🌐 Aplicação disponível em: https://tvdoutor-ads.vercel.app" -ForegroundColor Cyan
Write-Host "📊 Dashboard Supabase: https://supabase.com/dashboard" -ForegroundColor Cyan

# Verificar se o Vercel CLI está instalado
Write-Host "🔍 Verificando Vercel CLI..." -ForegroundColor Yellow
$vercelVersion = vercel --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Vercel CLI: $vercelVersion" -ForegroundColor Green
} else {
    Write-Host "⚠️ Vercel CLI não encontrado. Instale com: npm i -g vercel" -ForegroundColor Yellow
}

Write-Host "===============================================" -ForegroundColor Green
