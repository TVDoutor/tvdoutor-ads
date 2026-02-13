# Aplicar migração fix_signup_final
# Este script aplica a migração diretamente no banco de dados remoto

Write-Host "🔧 Aplicando migração fix_signup_final..." -ForegroundColor Cyan

# Ler variáveis de ambiente
if (-not (Test-Path .env)) {
    Write-Host "❌ Arquivo .env não encontrado" -ForegroundColor Red
    exit 1
}

# Carregar variáveis de ambiente
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
}

$SUPABASE_URL = $env:VITE_SUPABASE_URL
$SUPABASE_SERVICE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY
$SUPABASE_ANON_KEY = $env:VITE_SUPABASE_ANON_KEY

if (-not $SUPABASE_URL -or -not $SUPABASE_SERVICE_KEY) {
    Write-Host "❌ Variáveis de ambiente não configuradas" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Variáveis carregadas" -ForegroundColor Green
Write-Host "   URL: $SUPABASE_URL" -ForegroundColor Gray

# Ler o arquivo de migração
$migrationFile = "supabase\migrations\20251008094213_fix_signup_final.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Arquivo de migração não encontrado: $migrationFile" -ForegroundColor Red
    exit 1
}

$migrationSQL = Get-Content $migrationFile -Raw

Write-Host "📄 Migração carregada: $migrationFile" -ForegroundColor Green

# Aplicar migração via REST API do Supabase
$projectRef = ($SUPABASE_URL -replace 'https://', '' -replace '.supabase.co', '')

# Preparar query SQL
$body = @{
    query = $migrationSQL
} | ConvertTo-Json

Write-Host "🚀 Executando migração..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/rpc" -Method POST -Headers @{
        "apikey" = $SUPABASE_SERVICE_KEY
        "Authorization" = "Bearer $SUPABASE_SERVICE_KEY"
        "Content-Type" = "application/json"
    } -Body $body -ErrorAction Stop

    Write-Host "✅ Migração aplicada com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Testar cadastro de novo usuário" -ForegroundColor Gray
    Write-Host "   2. Verificar logs no console do Supabase" -ForegroundColor Gray
    Write-Host "   3. Confirmar que profile e role foram criados" -ForegroundColor Gray
} catch {
    Write-Host "❌ Erro ao aplicar migração: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Alternativa: Execute o SQL manualmente no Dashboard do Supabase:" -ForegroundColor Yellow
    Write-Host "   1. Acesse: https://supabase.com/dashboard/project/$projectRef/sql" -ForegroundColor Gray
    Write-Host "   2. Cole o conteúdo de: $migrationFile" -ForegroundColor Gray
    Write-Host "   3. Execute o SQL" -ForegroundColor Gray
}

