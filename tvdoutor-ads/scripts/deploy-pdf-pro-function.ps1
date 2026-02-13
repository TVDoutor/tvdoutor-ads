# Script PowerShell para deploy da Edge Function de PDF Profissional
# Execute: .\scripts\deploy-pdf-pro-function.ps1

Write-Host "🚀 Deploy da Edge Function PDF Profissional" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Verificar se estamos no diretório correto
if (-not (Test-Path "supabase/config.toml")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto (onde está supabase/config.toml)" -ForegroundColor Red
    exit 1
}

# Verificar se supabase CLI está instalado
try {
    $null = Get-Command supabase -ErrorAction Stop
} catch {
    Write-Host "❌ Erro: Supabase CLI não encontrado. Instale com:" -ForegroundColor Red
    Write-Host "npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Configurando secrets..." -ForegroundColor Blue

# Obter URL do projeto
try {
    $status = supabase status
    $projectUrl = ($status | Select-String "API URL").Line.Split(":")[1].Trim()
    if (-not $projectUrl) {
        throw "URL não encontrada"
    }
} catch {
    Write-Host "❌ Erro: Não foi possível obter a URL do projeto Supabase" -ForegroundColor Red
    Write-Host "Execute: supabase start (se local) ou supabase link (se remoto)" -ForegroundColor Yellow
    exit 1
}

Write-Host "📡 URL do projeto: $projectUrl" -ForegroundColor Cyan

# Verificar se SERVICE_ROLE_KEY está definida
if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "⚠️  AVISO: Variável SUPABASE_SERVICE_ROLE_KEY não definida" -ForegroundColor Yellow
    Write-Host "📝 Para configurar os secrets, execute:" -ForegroundColor Blue
    Write-Host ""
    Write-Host '$env:SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key-aqui"' -ForegroundColor Gray
    Write-Host "supabase secrets set SUPABASE_URL=`"$projectUrl`"" -ForegroundColor Gray
    Write-Host "supabase secrets set SUPABASE_SERVICE_ROLE_KEY=`"`$env:SUPABASE_SERVICE_ROLE_KEY`"" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 Você pode encontrar a SERVICE_ROLE_KEY em:" -ForegroundColor Blue
    Write-Host "   Supabase Dashboard > Settings > API > service_role (secret)" -ForegroundColor Gray
    Write-Host ""
    $continue = Read-Host "Deseja continuar sem configurar secrets? (y/N)"
    if ($continue -notmatch "^[Yy]$") {
        exit 1
    }
} else {
    Write-Host "✅ Configurando secrets..." -ForegroundColor Green
    supabase secrets set SUPABASE_URL="$projectUrl"
    supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$env:SUPABASE_SERVICE_ROLE_KEY"
    Write-Host "✅ Secrets configurados com sucesso!" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔨 Fazendo deploy da função..." -ForegroundColor Blue

# Deploy da função
try {
    supabase functions deploy pdf-proposal-pro
    Write-Host "✅ Deploy realizado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🧪 Para testar a função, execute:" -ForegroundColor Blue
    Write-Host ""
    Write-Host "curl -i -X POST \" -ForegroundColor Gray
    Write-Host "  -H `"Authorization: Bearer `$env:SUPABASE_ANON_KEY`" \" -ForegroundColor Gray
    Write-Host "  -H `"Content-Type: application/json`" \" -ForegroundColor Gray
    Write-Host "  -d '{`"proposalId`": 40}' \" -ForegroundColor Gray
    Write-Host "  $projectUrl/functions/v1/pdf-proposal-pro" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📊 Se retornar {`"pdfBase64`":`"...`"}, está funcionando!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎯 A função está pronta para uso no frontend!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro no deploy da função" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
