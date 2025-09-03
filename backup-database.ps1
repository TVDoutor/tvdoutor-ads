# =====================================================
# SCRIPT DE BACKUP AUTOMATIZADO - TVDoutor ADS
# =====================================================
# Data de criação: Janeiro 2025
# Projeto: TVDoutor ADS
# Plataforma: Windows PowerShell
# 
# Este script automatiza o processo de backup do banco de dados
# Supabase PostgreSQL com todas as configurações necessárias.
# =====================================================

param(
    [string]$BackupType = "completo",
    [string]$OutputDir = "./backups",
    [switch]$Compress = $false,
    [switch]$Help = $false
)

# Função para exibir ajuda
function Show-Help {
    Write-Host "=== SCRIPT DE BACKUP - TVDoutor ADS ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "USO:" -ForegroundColor Yellow
    Write-Host "  .\backup-database.ps1 [OPÇÕES]"
    Write-Host ""
    Write-Host "OPÇÕES:" -ForegroundColor Yellow
    Write-Host "  -BackupType <tipo>    Tipo de backup: completo, estrutura, dados (padrão: completo)"
    Write-Host "  -OutputDir <caminho>  Diretório de saída (padrão: ./backups)"
    Write-Host "  -Compress             Criar backup comprimido (.dump)"
    Write-Host "  -Help                 Exibir esta ajuda"
    Write-Host ""
    Write-Host "EXEMPLOS:" -ForegroundColor Yellow
    Write-Host "  .\backup-database.ps1                           # Backup completo"
    Write-Host "  .\backup-database.ps1 -BackupType estrutura     # Apenas estrutura"
    Write-Host "  .\backup-database.ps1 -Compress                 # Backup comprimido"
    Write-Host "  .\backup-database.ps1 -OutputDir C:\Backups     # Diretório customizado"
    Write-Host ""
    Write-Host "CONFIGURAÇÃO NECESSÁRIA:" -ForegroundColor Red
    Write-Host "  1. Instalar PostgreSQL client tools (pg_dump)"
    Write-Host "  2. Configurar variáveis de ambiente no arquivo .env"
    Write-Host "  3. Ter acesso ao banco de dados Supabase"
    Write-Host ""
}

if ($Help) {
    Show-Help
    exit 0
}

# Configurações
$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$projectName = "tvdoutor-ads"

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
    Write-ColorOutput "🔍 Verificando pré-requisitos..." "Info"
    
    # Verificar se pg_dump está disponível
    try {
        $pgDumpVersion = & pg_dump --version 2>$null
        Write-ColorOutput "✅ pg_dump encontrado: $pgDumpVersion" "Success"
    } catch {
        Write-ColorOutput "❌ pg_dump não encontrado. Instale o PostgreSQL client tools." "Error"
        Write-ColorOutput "   Download: https://www.postgresql.org/download/windows/" "Info"
        exit 1
    }
    
    # Verificar arquivo .env
    if (-not (Test-Path ".env")) {
        Write-ColorOutput "⚠️  Arquivo .env não encontrado. Criando template..." "Warning"
        Create-EnvTemplate
    }
    
    # Carregar variáveis de ambiente
    Load-EnvFile
    
    # Verificar variáveis necessárias
    $requiredVars = @("SUPABASE_DB_HOST", "SUPABASE_DB_USER", "SUPABASE_DB_PASSWORD", "SUPABASE_DB_NAME")
    $missingVars = @()
    
    foreach ($var in $requiredVars) {
        if (-not (Get-Variable -Name $var -ErrorAction SilentlyContinue)) {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -gt 0) {
        Write-ColorOutput "❌ Variáveis de ambiente faltando:" "Error"
        foreach ($var in $missingVars) {
            Write-ColorOutput "   - $var" "Error"
        }
        Write-ColorOutput "   Configure essas variáveis no arquivo .env" "Info"
        exit 1
    }
    
    Write-ColorOutput "✅ Pré-requisitos verificados com sucesso!" "Success"
}

function Create-EnvTemplate {
    $envTemplate = @"
# Configurações do Banco de Dados Supabase
# Obtenha essas informações no Dashboard do Supabase > Settings > Database

SUPABASE_DB_HOST=db.your-project-ref.supabase.co
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-database-password
SUPABASE_DB_NAME=postgres
SUPABASE_DB_PORT=5432

# Configurações opcionais
BACKUP_RETENTION_DAYS=30
BACKUP_COMPRESS_DEFAULT=false
"@
    
    $envTemplate | Out-File -FilePath ".env" -Encoding UTF8
    Write-ColorOutput "📝 Template .env criado. Configure as variáveis antes de continuar." "Warning"
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

function Create-BackupDirectory {
    if (-not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
        Write-ColorOutput "📁 Diretório de backup criado: $OutputDir" "Info"
    }
}

function Test-DatabaseConnection {
    Write-ColorOutput "🔗 Testando conexão com o banco de dados..." "Info"
    
    $env:PGPASSWORD = $SUPABASE_DB_PASSWORD
    
    try {
        $testQuery = "SELECT version();"
        $result = & psql -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d $SUPABASE_DB_NAME -p $SUPABASE_DB_PORT -t -c $testQuery 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ Conexão estabelecida com sucesso!" "Success"
            Write-ColorOutput "   PostgreSQL: $($result.Trim())" "Info"
        } else {
            throw "Falha na conexão"
        }
    } catch {
        Write-ColorOutput "❌ Erro ao conectar com o banco de dados" "Error"
        Write-ColorOutput "   Verifique as configurações no arquivo .env" "Error"
        exit 1
    }
}

function Execute-Backup {
    param(
        [string]$Type,
        [string]$OutputPath
    )
    
    $env:PGPASSWORD = $SUPABASE_DB_PASSWORD
    
    $baseArgs = @(
        "-h", $SUPABASE_DB_HOST,
        "-U", $SUPABASE_DB_USER,
        "-d", $SUPABASE_DB_NAME,
        "-p", $SUPABASE_DB_PORT,
        "--no-owner",
        "--no-privileges",
        "--verbose"
    )
    
    switch ($Type) {
        "completo" {
            Write-ColorOutput "📦 Executando backup completo..." "Info"
            if ($Compress) {
                $args = $baseArgs + @("-Fc", "-f", $OutputPath)
            } else {
                $args = $baseArgs + @("-f", $OutputPath)
            }
        }
        "estrutura" {
            Write-ColorOutput "🏗️  Executando backup da estrutura..." "Info"
            $args = $baseArgs + @("--schema-only", "-f", $OutputPath)
        }
        "dados" {
            Write-ColorOutput "📊 Executando backup dos dados..." "Info"
            $args = $baseArgs + @("--data-only", "-f", $OutputPath)
        }
        default {
            throw "Tipo de backup inválido: $Type"
        }
    }
    
    try {
        $startTime = Get-Date
        & pg_dump @args
        
        if ($LASTEXITCODE -eq 0) {
            $endTime = Get-Date
            $duration = $endTime - $startTime
            $fileSize = if (Test-Path $OutputPath) { 
                [math]::Round((Get-Item $OutputPath).Length / 1MB, 2) 
            } else { 0 }
            
            Write-ColorOutput "✅ Backup concluído com sucesso!" "Success"
            Write-ColorOutput "   Arquivo: $OutputPath" "Info"
            Write-ColorOutput "   Tamanho: $fileSize MB" "Info"
            Write-ColorOutput "   Duração: $($duration.ToString('mm\:ss'))" "Info"
        } else {
            throw "pg_dump falhou com código de saída: $LASTEXITCODE"
        }
    } catch {
        Write-ColorOutput "❌ Erro durante o backup: $($_.Exception.Message)" "Error"
        exit 1
    }
}

function Generate-BackupReport {
    param(
        [string]$BackupFile
    )
    
    $reportFile = $BackupFile -replace '\.(sql|dump)$', '_report.txt'
    
    $report = @"
RELATÓRIO DE BACKUP - TVDoutor ADS
=====================================

Data/Hora: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')
Tipo de Backup: $BackupType
Arquivo: $BackupFile
Tamanho: $([math]::Round((Get-Item $BackupFile).Length / 1MB, 2)) MB

Configuração do Banco:
- Host: $SUPABASE_DB_HOST
- Usuário: $SUPABASE_DB_USER
- Banco: $SUPABASE_DB_NAME
- Porta: $SUPABASE_DB_PORT

Para restaurar este backup:
"@
    
    if ($BackupFile -like "*.dump") {
        $report += "`npg_restore -h [host] -U [user] -d [database] `"$BackupFile`""
    } else {
        $report += "`npsql -h [host] -U [user] -d [database] -f `"$BackupFile`""
    }
    
    $report += "`n`nSubstitua [host], [user] e [database] pelos valores apropriados."
    
    $report | Out-File -FilePath $reportFile -Encoding UTF8
    Write-ColorOutput "📋 Relatório gerado: $reportFile" "Info"
}

function Cleanup-OldBackups {
    if ($BACKUP_RETENTION_DAYS) {
        $retentionDays = [int]$BACKUP_RETENTION_DAYS
        $cutoffDate = (Get-Date).AddDays(-$retentionDays)
        
        Write-ColorOutput "🧹 Limpando backups antigos (>$retentionDays dias)..." "Info"
        
        $oldFiles = Get-ChildItem -Path $OutputDir -Filter "*backup*" | Where-Object { $_.LastWriteTime -lt $cutoffDate }
        
        if ($oldFiles.Count -gt 0) {
            foreach ($file in $oldFiles) {
                Remove-Item $file.FullName -Force
                Write-ColorOutput "   Removido: $($file.Name)" "Warning"
            }
            Write-ColorOutput "✅ $($oldFiles.Count) arquivo(s) antigo(s) removido(s)" "Success"
        } else {
            Write-ColorOutput "   Nenhum arquivo antigo encontrado" "Info"
        }
    }
}

# =====================================================
# EXECUÇÃO PRINCIPAL
# =====================================================

try {
    Write-ColorOutput "" 
    Write-ColorOutput "=== BACKUP DATABASE - TVDoutor ADS ===" "Header"
    Write-ColorOutput "Iniciado em: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')" "Info"
    Write-ColorOutput ""
    
    # Verificar pré-requisitos
    Test-Prerequisites
    
    # Criar diretório de backup
    Create-BackupDirectory
    
    # Testar conexão
    Test-DatabaseConnection
    
    # Definir nome do arquivo de backup
    $extension = if ($Compress) { "dump" } else { "sql" }
    $backupFileName = "${projectName}_backup_${BackupType}_${timestamp}.${extension}"
    $backupFilePath = Join-Path $OutputDir $backupFileName
    
    # Executar backup
    Execute-Backup -Type $BackupType -OutputPath $backupFilePath
    
    # Gerar relatório
    Generate-BackupReport -BackupFile $backupFilePath
    
    # Limpeza de arquivos antigos
    Cleanup-OldBackups
    
    Write-ColorOutput ""
    Write-ColorOutput "🎉 BACKUP CONCLUÍDO COM SUCESSO!" "Success"
    Write-ColorOutput "   Arquivo: $backupFilePath" "Info"
    Write-ColorOutput ""
    
} catch {
    Write-ColorOutput ""
    Write-ColorOutput "💥 ERRO DURANTE O BACKUP" "Error"
    Write-ColorOutput "   $($_.Exception.Message)" "Error"
    Write-ColorOutput ""
    exit 1
} finally {
    # Limpar variável de senha
    if ($env:PGPASSWORD) {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# =====================================================
# FIM DO SCRIPT
# =====================================================