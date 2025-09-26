# Deploy da Edge Function PDF via Docker (PowerShell)
Write-Host "🐳 Deploy da Edge Function PDF via Docker" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue

# Verificar se o Docker está rodando
try {
    docker info | Out-Null
    Write-Host "✅ Docker está rodando" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker não está rodando. Inicie o Docker primeiro." -ForegroundColor Red
    exit 1
}

# Verificar variáveis de ambiente
if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "Variaveis de ambiente necessarias:" -ForegroundColor Red
    Write-Host "   SUPABASE_URL" -ForegroundColor Yellow
    Write-Host "   SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Configure no PowerShell:" -ForegroundColor Cyan
    Write-Host '$env:SUPABASE_URL="https://seu-projeto.supabase.co"' -ForegroundColor Gray
    Write-Host '$env:SUPABASE_SERVICE_ROLE_KEY="sua-service-key"' -ForegroundColor Gray
    exit 1
}

Write-Host "✅ Variáveis de ambiente configuradas" -ForegroundColor Green
Write-Host "📦 Fazendo build da Edge Function..." -ForegroundColor Yellow

# Build da imagem Docker
docker build -t pdf-proposal-pro ./supabase/functions/pdf-proposal-pro/

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build concluído com sucesso" -ForegroundColor Green
} else {
    Write-Host "❌ Erro no build" -ForegroundColor Red
    exit 1
}

# Parar container existente se estiver rodando
Write-Host "🛑 Parando container existente (se houver)..." -ForegroundColor Yellow
docker stop pdf-proposal-pro 2>$null
docker rm pdf-proposal-pro 2>$null

Write-Host "🚀 Iniciando container..." -ForegroundColor Yellow

# Rodar o container
docker run -d `
    --name pdf-proposal-pro `
    -p 8001:8000 `
    -e SUPABASE_URL="$env:SUPABASE_URL" `
    -e SUPABASE_SERVICE_ROLE_KEY="$env:SUPABASE_SERVICE_ROLE_KEY" `
    -e DENO_DEPLOYMENT_ID="docker-local" `
    --restart unless-stopped `
    pdf-proposal-pro

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Edge Function rodando em http://localhost:8001" -ForegroundColor Green
    Write-Host "📝 Logs: docker logs -f pdf-proposal-pro" -ForegroundColor Cyan
    Write-Host "🛑 Parar: docker stop pdf-proposal-pro" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🧪 Teste a função:" -ForegroundColor Yellow
    Write-Host "curl -X POST http://localhost:8001 \\" -ForegroundColor Gray
    Write-Host "  -H 'Content-Type: application/json' \\" -ForegroundColor Gray
    Write-Host "  -d '{`"proposalId`": 32}'" -ForegroundColor Gray
} else {
    Write-Host "❌ Erro ao iniciar container" -ForegroundColor Red
    exit 1
}
