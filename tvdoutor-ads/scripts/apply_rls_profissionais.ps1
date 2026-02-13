# =====================================================
# Script para Aplicar Políticas RLS de Profissionais
# =====================================================

Write-Host "🔧 Aplicando políticas RLS para Profissionais da Saúde..." -ForegroundColor Cyan
Write-Host ""

# Verificar se o arquivo SQL existe
$sqlFile = Join-Path $PSScriptRoot "..\FIX_RLS_PROFISSIONAIS_SAUDE.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Arquivo SQL não encontrado: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Arquivo SQL encontrado" -ForegroundColor Green
Write-Host ""

# Tentar aplicar via Supabase CLI
Write-Host "🚀 Tentando aplicar via Supabase CLI..." -ForegroundColor Yellow

try {
    # Verificar se Supabase CLI está instalado
    $supabaseVersion = npx supabase --version 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Supabase CLI encontrado" -ForegroundColor Green
        
        # Aplicar o script SQL
        Write-Host "📤 Aplicando script SQL..." -ForegroundColor Yellow
        
        $projectId = "vaogzhwzucijiyvyglls"
        
        # Executar o comando
        Get-Content $sqlFile | npx supabase db query --project-id $projectId
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Políticas RLS aplicadas com sucesso!" -ForegroundColor Green
            Write-Host ""
            Write-Host "🎉 Agora você pode acessar a página de Profissionais da Saúde!" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "📍 Acesse: http://localhost:8080/profissionais-saude" -ForegroundColor White
        } else {
            throw "Erro ao aplicar SQL via CLI"
        }
    } else {
        throw "Supabase CLI não está instalado"
    }
} catch {
    Write-Host ""
    Write-Host "⚠️  Não foi possível aplicar via CLI" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📋 SOLUÇÃO MANUAL:" -ForegroundColor Cyan
    Write-Host "1. Acesse: https://app.supabase.com" -ForegroundColor White
    Write-Host "2. Selecione seu projeto: vaogzhwzucijiyvyglls" -ForegroundColor White
    Write-Host "3. Vá em 'SQL Editor'" -ForegroundColor White
    Write-Host "4. Copie e execute o conteúdo do arquivo:" -ForegroundColor White
    Write-Host "   $sqlFile" -ForegroundColor Gray
    Write-Host ""
    Write-Host "OU execute este comando:" -ForegroundColor Cyan
    Write-Host "   Get-Content '$sqlFile' | Set-Clipboard" -ForegroundColor Gray
    Write-Host "   (Isso copia o SQL para a área de transferência)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host ""
Write-Host "Pressione qualquer tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
