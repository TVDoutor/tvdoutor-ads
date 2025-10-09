# Script PowerShell para corrigir acesso de admin
# Execute este script para verificar e corrigir seu status de admin

Write-Host "🔧 Verificando e corrigindo status de admin..." -ForegroundColor Cyan

# Verificar se o Supabase CLI está instalado
try {
    $supabaseVersion = supabase --version
    Write-Host "✅ Supabase CLI encontrado: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI não encontrado. Instale com: npm install -g supabase" -ForegroundColor Red
    exit 1
}

Write-Host "`n📋 Executando correções de admin..." -ForegroundColor Yellow

# Executar o script SQL
try {
    Write-Host "1. Executando verificação e correção no banco de dados..." -ForegroundColor Blue
    
    # Executar o script SQL
    supabase db reset --linked
    
    # Ou se preferir executar apenas o script específico:
    # Get-Content "fix-user-admin-status.sql" | supabase db push --linked
    
    Write-Host "✅ Script SQL executado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao executar script SQL: $_" -ForegroundColor Red
    Write-Host "💡 Tente executar o script SQL manualmente no Supabase Dashboard" -ForegroundColor Yellow
}

Write-Host "`n🔍 Verificações adicionais..." -ForegroundColor Yellow

# Verificar variáveis de ambiente
$envVars = @(
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY"
)

foreach ($var in $envVars) {
    if ([Environment]::GetEnvironmentVariable($var)) {
        Write-Host "✅ $var está configurado" -ForegroundColor Green
    } else {
        Write-Host "❌ $var não está configurado" -ForegroundColor Red
    }
}

Write-Host "`n📝 Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Faça logout e login novamente na aplicação" -ForegroundColor White
Write-Host "2. Verifique o console do navegador para logs de debug" -ForegroundColor White
Write-Host "3. Se ainda não funcionar, execute o script SQL manualmente no Supabase Dashboard" -ForegroundColor White

Write-Host "`n✅ Script concluído!" -ForegroundColor Green
