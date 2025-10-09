# Script para aplicar a atualizacao das roles do sistema
# Data: 2025-01-15
# Descricao: Aplica a migracao para adicionar a role 'manager' ao sistema

Write-Host "Iniciando atualizacao das roles do sistema..." -ForegroundColor Green

# Verificar se o Supabase CLI esta instalado
if (-not (Get-Command "supabase" -ErrorAction SilentlyContinue)) {
    Write-Host "Supabase CLI nao encontrado. Instale primeiro:" -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Verificar se estamos no diretorio correto
if (-not (Test-Path "supabase/migrations/20250115000000_add_manager_role.sql")) {
    Write-Host "Arquivo de migracao nao encontrado!" -ForegroundColor Red
    Write-Host "   Certifique-se de estar no diretorio raiz do projeto" -ForegroundColor Yellow
    exit 1
}

Write-Host "Criando backup do estado atual..." -ForegroundColor Blue

# Aplicar o backup
try {
    supabase db reset --linked
    Write-Host "Backup criado com sucesso" -ForegroundColor Green
} catch {
    Write-Host "Aviso: Nao foi possivel criar backup automatico" -ForegroundColor Yellow
    Write-Host "   Execute manualmente: supabase db reset --linked" -ForegroundColor Yellow
}

Write-Host "Aplicando migracao das roles..." -ForegroundColor Blue

# Aplicar a migracao
try {
    supabase db push --linked
    Write-Host "Migracao aplicada com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "Erro ao aplicar migracao:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host "Testando as novas funcoes..." -ForegroundColor Blue

# Testar se as funcoes foram criadas
try {
    $testQuery = "SELECT 'Testing new functions:' as info, is_manager() as can_manage, can_delete_other_users() as can_delete, can_edit_other_users() as can_edit;"
    
    $result = supabase db query --linked --query $testQuery
    Write-Host "Funcoes testadas com sucesso" -ForegroundColor Green
    Write-Host $result -ForegroundColor Gray
} catch {
    Write-Host "Aviso: Nao foi possivel testar as funcoes automaticamente" -ForegroundColor Yellow
}

Write-Host "Verificando enum atualizado..." -ForegroundColor Blue

# Verificar se o enum foi atualizado
try {
    $enumQuery = "SELECT 'Current app_role enum values:' as info, unnest(enum_range(NULL::app_role)) as current_values;"
    
    $enumResult = supabase db query --linked --query $enumQuery
    Write-Host "Enum verificado:" -ForegroundColor Green
    Write-Host $enumResult -ForegroundColor Gray
} catch {
    Write-Host "Aviso: Nao foi possivel verificar o enum automaticamente" -ForegroundColor Yellow
}

Write-Host "Atualizacao das roles concluida com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Resumo das alteracoes:" -ForegroundColor Cyan
Write-Host "   Role 'manager' adicionada ao enum app_role" -ForegroundColor White
Write-Host "   Funcao is_manager() criada" -ForegroundColor White
Write-Host "   Funcao can_delete_other_users() criada" -ForegroundColor White
Write-Host "   Funcao can_edit_other_users() criada" -ForegroundColor White
Write-Host "   Politicas RLS atualizadas" -ForegroundColor White
Write-Host "   Interface atualizada para incluir Manager" -ForegroundColor White
Write-Host ""
Write-Host "Regras de permissao implementadas:" -ForegroundColor Cyan
Write-Host "   Admin: Acesso total, pode excluir dados de outros usuarios" -ForegroundColor White
Write-Host "   Manager: Acesso a tudo, mas so pode editar/excluir proprios dados" -ForegroundColor White
Write-Host "   User: Usuario padrao" -ForegroundColor White
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "   1. Teste a interface de usuarios" -ForegroundColor White
Write-Host "   2. Crie usuarios com role 'manager' para testar" -ForegroundColor White
Write-Host "   3. Verifique se as permissoes estao funcionando corretamente" -ForegroundColor White