# Script PowerShell para corrigir permissões do usuário hildebrando
# Este script executa as correções no banco de dados Supabase

Write-Host "🔧 Iniciando correção de permissões do usuário hildebrando..." -ForegroundColor Yellow

# Verificar se o arquivo SQL existe
$sqlFile = "fix_hildebrando_permissions.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Arquivo SQL não encontrado: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Arquivo SQL encontrado: $sqlFile" -ForegroundColor Green

Write-Host "`n📋 INSTRUÇÕES PARA EXECUÇÃO MANUAL:" -ForegroundColor Cyan
Write-Host "1. Acesse o Supabase Dashboard" -ForegroundColor White
Write-Host "2. Vá para SQL Editor" -ForegroundColor White
Write-Host "3. Cole e execute o conteúdo do arquivo: $sqlFile" -ForegroundColor White
Write-Host "4. Verifique os resultados das consultas" -ForegroundColor White

Write-Host "`n🔍 CONTEÚDO DO SCRIPT SQL:" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Gray
Get-Content $sqlFile | Write-Host
Write-Host "=================================" -ForegroundColor Gray

Write-Host "`n✅ Após executar o script SQL:" -ForegroundColor Green
Write-Host "- Faça logout e login novamente na aplicação" -ForegroundColor White
Write-Host "- Verifique se agora aparece como 'Super Admin'" -ForegroundColor White
Write-Host "- Teste se consegue editar outros usuários" -ForegroundColor White

Write-Host "`n🚀 Deploy das correções do frontend já foi realizado!" -ForegroundColor Green
Write-Host "Agora execute apenas o script SQL no Supabase." -ForegroundColor Yellow
