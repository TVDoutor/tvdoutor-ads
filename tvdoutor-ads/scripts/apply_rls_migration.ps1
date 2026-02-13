# ====================================================================
# Script: Aplicar Migração de RLS para Signup
# Descrição: Aplica a migração 20251008091837_fix_signup_rls_policies.sql
# Data: 2025-10-08
# ====================================================================

Write-Host "================================" -ForegroundColor Cyan
Write-Host "APLICAR MIGRAÇÃO RLS PARA SIGNUP" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório correto
$currentDir = Get-Location
$expectedPath = "tvdoutor-ads"

if ($currentDir.Path -notlike "*$expectedPath*") {
    Write-Host "⚠️  AVISO: Você pode não estar no diretório correto do projeto." -ForegroundColor Yellow
    Write-Host "   Diretório atual: $currentDir" -ForegroundColor Yellow
    Write-Host "   Esperado: *\$expectedPath" -ForegroundColor Yellow
    Write-Host ""
    
    $continue = Read-Host "Deseja continuar mesmo assim? (s/N)"
    if ($continue -ne "s" -and $continue -ne "S") {
        Write-Host "❌ Operação cancelada pelo usuário." -ForegroundColor Red
        exit 1
    }
}

# Verificar se o arquivo de migração existe
$migrationFile = "supabase\migrations\20251008091837_fix_signup_rls_policies.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ ERRO: Arquivo de migração não encontrado!" -ForegroundColor Red
    Write-Host "   Procurando: $migrationFile" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Certifique-se de estar no diretório raiz do projeto." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Arquivo de migração encontrado" -ForegroundColor Green
Write-Host ""

# Perguntar qual método usar
Write-Host "Escolha o método de aplicação:" -ForegroundColor Cyan
Write-Host "1. Via Supabase CLI (db push) - Recomendado" -ForegroundColor White
Write-Host "2. Via Supabase CLI (db execute)" -ForegroundColor White
Write-Host "3. Exibir instruções para aplicação manual" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Digite sua escolha (1-3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🚀 Aplicando migração via 'supabase db push'..." -ForegroundColor Cyan
        Write-Host ""
        
        # Verificar se Supabase CLI está instalado
        try {
            $supabaseVersion = supabase --version 2>&1
            Write-Host "✅ Supabase CLI encontrado: $supabaseVersion" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ ERRO: Supabase CLI não está instalado ou não está no PATH" -ForegroundColor Red
            Write-Host ""
            Write-Host "   Instale o Supabase CLI:" -ForegroundColor Yellow
            Write-Host "   npm install -g supabase" -ForegroundColor White
            exit 1
        }
        
        Write-Host ""
        Write-Host "Executando: supabase db push" -ForegroundColor Cyan
        Write-Host ""
        
        supabase db push
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Migração aplicada com sucesso!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Próximos passos:" -ForegroundColor Cyan
            Write-Host "1. Verificar políticas RLS no dashboard do Supabase" -ForegroundColor White
            Write-Host "2. Testar o signup criando uma nova conta" -ForegroundColor White
            Write-Host "3. Verificar logs no console do navegador" -ForegroundColor White
        }
        else {
            Write-Host ""
            Write-Host "❌ Erro ao aplicar migração" -ForegroundColor Red
            Write-Host "   Código de saída: $LASTEXITCODE" -ForegroundColor Red
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "🚀 Aplicando migração via 'supabase db execute'..." -ForegroundColor Cyan
        Write-Host ""
        
        # Verificar se Supabase CLI está instalado
        try {
            $supabaseVersion = supabase --version 2>&1
            Write-Host "✅ Supabase CLI encontrado: $supabaseVersion" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ ERRO: Supabase CLI não está instalado ou não está no PATH" -ForegroundColor Red
            Write-Host ""
            Write-Host "   Instale o Supabase CLI:" -ForegroundColor Yellow
            Write-Host "   npm install -g supabase" -ForegroundColor White
            exit 1
        }
        
        Write-Host ""
        Write-Host "Executando: supabase db execute --file $migrationFile" -ForegroundColor Cyan
        Write-Host ""
        
        supabase db execute --file $migrationFile
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Migração aplicada com sucesso!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Próximos passos:" -ForegroundColor Cyan
            Write-Host "1. Verificar políticas RLS no dashboard do Supabase" -ForegroundColor White
            Write-Host "2. Testar o signup criando uma nova conta" -ForegroundColor White
            Write-Host "3. Verificar logs no console do navegador" -ForegroundColor White
        }
        else {
            Write-Host ""
            Write-Host "❌ Erro ao aplicar migração" -ForegroundColor Red
            Write-Host "   Código de saída: $LASTEXITCODE" -ForegroundColor Red
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "📋 INSTRUÇÕES PARA APLICAÇÃO MANUAL" -ForegroundColor Cyan
        Write-Host "====================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. Acesse o Supabase Dashboard:" -ForegroundColor White
        Write-Host "   https://app.supabase.com" -ForegroundColor Gray
        Write-Host ""
        Write-Host "2. Selecione seu projeto" -ForegroundColor White
        Write-Host ""
        Write-Host "3. Vá para 'SQL Editor'" -ForegroundColor White
        Write-Host ""
        Write-Host "4. Clique em 'New Query'" -ForegroundColor White
        Write-Host ""
        Write-Host "5. Abra o arquivo:" -ForegroundColor White
        Write-Host "   $migrationFile" -ForegroundColor Gray
        Write-Host ""
        Write-Host "6. Copie todo o conteúdo e cole no SQL Editor" -ForegroundColor White
        Write-Host ""
        Write-Host "7. Clique em 'Run' (ou pressione Ctrl+Enter)" -ForegroundColor White
        Write-Host ""
        Write-Host "8. Verifique se não houve erros" -ForegroundColor White
        Write-Host ""
        Write-Host "9. Teste o signup criando uma nova conta" -ForegroundColor White
        Write-Host ""
        
        # Abrir arquivo no editor padrão
        $openFile = Read-Host "Deseja abrir o arquivo de migração agora? (s/N)"
        if ($openFile -eq "s" -or $openFile -eq "S") {
            Start-Process $migrationFile
            Write-Host "✅ Arquivo aberto no editor padrão" -ForegroundColor Green
        }
    }
    
    default {
        Write-Host ""
        Write-Host "❌ Opção inválida. Operação cancelada." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "SCRIPT CONCLUÍDO" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Perguntar se deseja verificar as políticas
$verify = Read-Host "Deseja verificar as políticas RLS aplicadas? (s/N)"
if ($verify -eq "s" -or $verify -eq "S") {
    Write-Host ""
    Write-Host "📋 Para verificar as políticas, execute no SQL Editor:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "-- Verificar políticas de profiles" -ForegroundColor Gray
    Write-Host "SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'profiles';" -ForegroundColor White
    Write-Host ""
    Write-Host "-- Verificar políticas de user_roles" -ForegroundColor Gray
    Write-Host "SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'user_roles';" -ForegroundColor White
    Write-Host ""
}

Write-Host "📚 Consulte MIGRACAO_RLS_SIGNUP.md para mais informações" -ForegroundColor Yellow

