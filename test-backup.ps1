# =====================================================
# SCRIPT DE TESTE DE BACKUP - TVDoutor ADS
# =====================================================
# Este script testa a conectividade e executa um backup
# de teste para validar a configuração.
# =====================================================

param(
    [switch]$Quick = $false,
    [switch]$Help = $false
)

function Show-Help {
    Write-Host "=== TESTE DE BACKUP - TVDoutor ADS ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "USO:" -ForegroundColor Yellow
    Write-Host "  .\test-backup.ps1 [OPÇÕES]"
    Write-Host ""
    Write-Host "OPÇÕES:" -ForegroundColor Yellow
    Write-Host "  -Quick    Teste rápido (apenas conectividade)"
    Write-Host "  -Help     Exibir esta ajuda"
    Write-Host ""
    Write-Host "DESCRIÇÃO:" -ForegroundColor Yellow
    Write-Host "  Este script testa:"
    Write-Host "  - Pré-requisitos (pg_dump, psql)"
    Write-Host "  - Arquivo .env e variáveis"
    Write-Host "  - Conectividade com o banco"
    Write-Host "  - Backup de teste (se não for -Quick)"
    Write-Host ""
}

if ($Help) {
    Show-Help
    exit 0
}

# Configurações
$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# Cores para output
$colors = @{
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Info = "Cyan"
    Header = "Magenta"
}

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $colors[$Color]
}

function Test-Prerequisites {
    Write-ColorOutput "🔍 Testando pré-requisitos..." "Info"
    $issues = @()
    
    # Testar pg_dump
    try {
        $pgDumpVersion = & pg_dump --version 2>$null
        Write-ColorOutput "  ✅ pg_dump: $pgDumpVersion" "Success"
    } catch {
        Write-ColorOutput "  ❌ pg_dump não encontrado" "Error"
        $issues += "pg_dump não instalado"
    }
    
    # Testar psql
    try {
        $psqlVersion = & psql --version 2>$null
        Write-ColorOutput "  ✅ psql: $psqlVersion" "Success"
    } catch {
        Write-ColorOutput "  ❌ psql não encontrado" "Error"
        $issues += "psql não instalado"
    }
    
    # Testar arquivo .env
    if (Test-Path ".env") {
        Write-ColorOutput "  ✅ Arquivo .env encontrado" "Success"
    } else {
        Write-ColorOutput "  ❌ Arquivo .env não encontrado" "Error"
        $issues += "Arquivo .env ausente"
    }
    
    return $issues
}

function Load-EnvFile {
    if (Test-Path ".env") {
        Get-Content ".env" | ForEach-Object {
            if ($_ -match '^([^#][^=]+)=(.*)$') {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim()
                Set-Variable -Name $name -Value $value -Scope Global
            }
        }
    }
}

function Test-EnvVariables {
    Write-ColorOutput "🔧 Testando variáveis de ambiente..." "Info"
    
    Load-EnvFile
    
    $requiredVars = @(
        @{Name="SUPABASE_DB_HOST"; Description="Host do banco"},
        @{Name="SUPABASE_DB_USER"; Description="Usuário do banco"},
        @{Name="SUPABASE_DB_PASSWORD"; Description="Senha do banco"},
        @{Name="SUPABASE_DB_NAME"; Description="Nome do banco"},
        @{Name="SUPABASE_DB_PORT"; Description="Porta do banco"}
    )
    
    $issues = @()
    
    foreach ($var in $requiredVars) {
        $value = Get-Variable -Name $var.Name -ValueOnly -ErrorAction SilentlyContinue
        if ($value) {
            if ($var.Name -eq "SUPABASE_DB_PASSWORD") {
                Write-ColorOutput "  ✅ $($var.Description): [OCULTA]" "Success"
            } else {
                Write-ColorOutput "  ✅ $($var.Description): $value" "Success"
            }
        } else {
            Write-ColorOutput "  ❌ $($var.Description): NÃO DEFINIDA" "Error"
            $issues += $var.Name
        }
    }
    
    return $issues
}

function Test-DatabaseConnection {
    Write-ColorOutput "🔗 Testando conexão com o banco..." "Info"
    
    $env:PGPASSWORD = $SUPABASE_DB_PASSWORD
    
    try {
        # Teste básico de conexão
        Write-ColorOutput "  📡 Conectando ao servidor..." "Info"
        $connectionTest = & psql -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d $SUPABASE_DB_NAME -p $SUPABASE_DB_PORT -t -c "SELECT 1;" 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "  ✅ Conexão estabelecida" "Success"
        } else {
            throw "Falha na conexão básica"
        }
        
        # Teste de versão do PostgreSQL
        Write-ColorOutput "  🔍 Verificando versão do PostgreSQL..." "Info"
        $versionQuery = & psql -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d $SUPABASE_DB_NAME -p $SUPABASE_DB_PORT -t -c "SELECT version();" 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            $version = $versionQuery.Trim() -replace '^\s+', ''
            Write-ColorOutput "  ✅ PostgreSQL: $version" "Success"
        }
        
        # Teste de permissões
        Write-ColorOutput "  🔐 Verificando permissões..." "Info"
        $permissionTest = & psql -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d $SUPABASE_DB_NAME -p $SUPABASE_DB_PORT -t -c "SELECT current_user, session_user;" 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "  ✅ Usuário autenticado: $($permissionTest.Trim())" "Success"
        }
        
        # Contar tabelas
        Write-ColorOutput "  📊 Contando tabelas..." "Info"
        $tableCount = & psql -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d $SUPABASE_DB_NAME -p $SUPABASE_DB_PORT -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "  ✅ Tabelas encontradas: $($tableCount.Trim())" "Success"
        }
        
        return $true
        
    } catch {
        Write-ColorOutput "  ❌ Erro na conexão: $($_.Exception.Message)" "Error"
        return $false
    } finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Test-BackupOperation {
    Write-ColorOutput "📦 Executando backup de teste..." "Info"
    
    $testDir = "./test-backup"
    $testFile = Join-Path $testDir "test_backup_$timestamp.sql"
    
    try {
        # Criar diretório de teste
        if (-not (Test-Path $testDir)) {
            New-Item -ItemType Directory -Path $testDir -Force | Out-Null
        }
        
        $env:PGPASSWORD = $SUPABASE_DB_PASSWORD
        
        # Backup apenas da estrutura (mais rápido)
        Write-ColorOutput "  🏗️  Fazendo backup da estrutura..." "Info"
        $args = @(
            "-h", $SUPABASE_DB_HOST,
            "-U", $SUPABASE_DB_USER,
            "-d", $SUPABASE_DB_NAME,
            "-p", $SUPABASE_DB_PORT,
            "--schema-only",
            "--no-owner",
            "--no-privileges",
            "-f", $testFile
        )
        
        $startTime = Get-Date
        & pg_dump @args 2>$null
        $endTime = Get-Date
        
        if ($LASTEXITCODE -eq 0 -and (Test-Path $testFile)) {
            $duration = $endTime - $startTime
            $fileSize = [math]::Round((Get-Item $testFile).Length / 1KB, 2)
            
            Write-ColorOutput "  ✅ Backup de teste concluído" "Success"
            Write-ColorOutput "    📁 Arquivo: $testFile" "Info"
            Write-ColorOutput "    📏 Tamanho: $fileSize KB" "Info"
            Write-ColorOutput "    ⏱️  Duração: $($duration.TotalSeconds.ToString('F2'))s" "Info"
            
            # Verificar conteúdo do backup
            $content = Get-Content $testFile -TotalCount 10
            if ($content -match "PostgreSQL database dump") {
                Write-ColorOutput "  ✅ Conteúdo do backup válido" "Success"
            } else {
                Write-ColorOutput "  ⚠️  Conteúdo do backup pode estar incompleto" "Warning"
            }
            
            return $true
        } else {
            Write-ColorOutput "  ❌ Falha no backup de teste" "Error"
            return $false
        }
        
    } catch {
        Write-ColorOutput "  ❌ Erro durante backup: $($_.Exception.Message)" "Error"
        return $false
    } finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        
        # Limpar arquivo de teste
        if (Test-Path $testFile) {
            Remove-Item $testFile -Force -ErrorAction SilentlyContinue
        }
    }
}

function Show-Summary {
    param(
        [array]$PrereqIssues,
        [array]$EnvIssues,
        [bool]$ConnectionOk,
        [bool]$BackupOk
    )
    
    Write-ColorOutput "" 
    Write-ColorOutput "📋 RESUMO DO TESTE" "Header"
    Write-ColorOutput "==================" "Header"
    
    # Pré-requisitos
    if ($PrereqIssues.Count -eq 0) {
        Write-ColorOutput "✅ Pré-requisitos: OK" "Success"
    } else {
        Write-ColorOutput "❌ Pré-requisitos: $($PrereqIssues.Count) problema(s)" "Error"
        foreach ($issue in $PrereqIssues) {
            Write-ColorOutput "   - $issue" "Error"
        }
    }
    
    # Variáveis de ambiente
    if ($EnvIssues.Count -eq 0) {
        Write-ColorOutput "✅ Configuração: OK" "Success"
    } else {
        Write-ColorOutput "❌ Configuração: $($EnvIssues.Count) problema(s)" "Error"
        foreach ($issue in $EnvIssues) {
            Write-ColorOutput "   - $issue não definida" "Error"
        }
    }
    
    # Conexão
    if ($ConnectionOk) {
        Write-ColorOutput "✅ Conectividade: OK" "Success"
    } else {
        Write-ColorOutput "❌ Conectividade: FALHA" "Error"
    }
    
    # Backup (se testado)
    if (-not $Quick) {
        if ($BackupOk) {
            Write-ColorOutput "✅ Backup: OK" "Success"
        } else {
            Write-ColorOutput "❌ Backup: FALHA" "Error"
        }
    }
    
    Write-ColorOutput "" 
    
    # Status geral
    $allOk = ($PrereqIssues.Count -eq 0) -and ($EnvIssues.Count -eq 0) -and $ConnectionOk -and ($Quick -or $BackupOk)
    
    if ($allOk) {
        Write-ColorOutput "🎉 TODOS OS TESTES PASSARAM!" "Success"
        Write-ColorOutput "   O sistema de backup está pronto para uso." "Success"
        Write-ColorOutput "   Execute: .\backup-database.ps1" "Info"
    } else {
        Write-ColorOutput "⚠️  ALGUNS TESTES FALHARAM" "Warning"
        Write-ColorOutput "   Corrija os problemas antes de usar o backup." "Warning"
        Write-ColorOutput "   Consulte: BACKUP_INSTRUCTIONS.md" "Info"
    }
    
    Write-ColorOutput "" 
}

# =====================================================
# EXECUÇÃO PRINCIPAL
# =====================================================

try {
    Write-ColorOutput "" 
    Write-ColorOutput "=== TESTE DE BACKUP - TVDoutor ADS ===" "Header"
    Write-ColorOutput "Iniciado em: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')" "Info"
    if ($Quick) {
        Write-ColorOutput "Modo: TESTE RÁPIDO (apenas conectividade)" "Info"
    } else {
        Write-ColorOutput "Modo: TESTE COMPLETO (incluindo backup)" "Info"
    }
    Write-ColorOutput "" 
    
    # Executar testes
    $prereqIssues = Test-Prerequisites
    $envIssues = Test-EnvVariables
    $connectionOk = Test-DatabaseConnection
    
    $backupOk = $true
    if (-not $Quick -and $connectionOk) {
        $backupOk = Test-BackupOperation
    }
    
    # Mostrar resumo
    Show-Summary -PrereqIssues $prereqIssues -EnvIssues $envIssues -ConnectionOk $connectionOk -BackupOk $backupOk
    
} catch {
    Write-ColorOutput "" 
    Write-ColorOutput "💥 ERRO DURANTE O TESTE" "Error"
    Write-ColorOutput "   $($_.Exception.Message)" "Error"
    Write-ColorOutput "" 
    exit 1
}

# =====================================================
# FIM DO SCRIPT
# =====================================================