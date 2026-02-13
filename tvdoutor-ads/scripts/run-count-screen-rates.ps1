# Executa scripts/count_screen_rates.sql usando Supabase CLI + psql
# Uso:
#   .\scripts\run-count-screen-rates.ps1              # usa banco LOCAL (supabase status)
#   $env:SUPABASE_DB_URL="postgresql://..."; .\scripts\run-count-screen-rates.ps1  # usa URL remota

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlFile = Join-Path $scriptDir "count_screen_rates.sql"
$projectRoot = Split-Path -Parent $scriptDir

if (-not (Test-Path $sqlFile)) {
    Write-Host "Arquivo não encontrado: $sqlFile" -ForegroundColor Red
    exit 1
}

# Se tiver URL do banco remoto, usa ela
$dbUrl = $env:SUPABASE_DB_URL
if (-not $dbUrl) {
    Push-Location $projectRoot
    try {
        $status = npx supabase status -o json 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Supabase local não está rodando ou não retornou JSON." -ForegroundColor Yellow
            Write-Host "Inicie com: npx supabase start" -ForegroundColor Cyan
            Write-Host "Ou defina SUPABASE_DB_URL com a connection string do Dashboard (Settings > Database)." -ForegroundColor Cyan
            exit 1
        }
        $obj = $status | ConvertFrom-Json
        $dbUrl = $obj.db_url
        if (-not $dbUrl) { $dbUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres" }
        Write-Host "Usando banco LOCAL (supabase status)." -ForegroundColor Cyan
    } finally {
        Pop-Location
    }
} else {
    Write-Host "Usando SUPABASE_DB_URL (banco remoto)." -ForegroundColor Cyan
}

$psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
if (-not (Test-Path $psql)) {
    $psql = "psql"
}

Write-Host "Executando: $sqlFile" -ForegroundColor Green
& $psql $dbUrl -f $sqlFile
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Concluído." -ForegroundColor Green
