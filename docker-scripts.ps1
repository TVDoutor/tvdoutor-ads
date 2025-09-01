# Scripts para gerenciar Docker do TVDoutor-ADS (PowerShell)

param(
    [Parameter(Position=0)]
    [string]$Command
)

# Função para exibir ajuda
function Show-Help {
    Write-Host "TVDoutor-ADS Docker Management Scripts" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Uso: .\docker-scripts.ps1 [COMANDO]"
    Write-Host ""
    Write-Host "Comandos disponíveis:"
    Write-Host "  build          - Build da imagem de produção"
    Write-Host "  build-dev      - Build da imagem de desenvolvimento"
    Write-Host "  run            - Executar aplicação em produção"
    Write-Host "  run-dev        - Executar aplicação em desenvolvimento"
    Write-Host "  stop           - Parar todos os containers"
    Write-Host "  clean          - Limpar containers e imagens não utilizadas"
    Write-Host "  logs           - Ver logs da aplicação"
    Write-Host "  shell          - Acessar shell do container"
    Write-Host "  restart        - Reiniciar aplicação"
    Write-Host "  status         - Ver status dos containers"
    Write-Host "  help           - Exibir esta ajuda"
    Write-Host ""
}

# Função para build de produção
function Build-Production {
    Write-Host "Construindo imagem de produção..." -ForegroundColor Yellow
    docker-compose build app
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Build de produção concluído!" -ForegroundColor Green
    } else {
        Write-Host "Erro no build de produção!" -ForegroundColor Red
    }
}

# Função para build de desenvolvimento
function Build-Development {
    Write-Host "Construindo imagem de desenvolvimento..." -ForegroundColor Yellow
    docker-compose build app-dev
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Build de desenvolvimento concluído!" -ForegroundColor Green
    } else {
        Write-Host "Erro no build de desenvolvimento!" -ForegroundColor Red
    }
}

# Função para executar em produção
function Run-Production {
    Write-Host "Iniciando aplicação em produção..." -ForegroundColor Yellow
    docker-compose up -d app
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Aplicação rodando em http://localhost:3000" -ForegroundColor Green
    } else {
        Write-Host "Erro ao iniciar aplicação!" -ForegroundColor Red
    }
}

# Função para executar em desenvolvimento
function Run-Development {
    Write-Host "Iniciando aplicação em desenvolvimento..." -ForegroundColor Yellow
    docker-compose --profile dev up -d app-dev
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Aplicação rodando em http://localhost:8080" -ForegroundColor Green
    } else {
        Write-Host "Erro ao iniciar aplicação!" -ForegroundColor Red
    }
}

# Função para parar containers
function Stop-Containers {
    Write-Host "Parando containers..." -ForegroundColor Yellow
    docker-compose down
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Containers parados!" -ForegroundColor Green
    } else {
        Write-Host "Erro ao parar containers!" -ForegroundColor Red
    }
}

# Função para limpeza
function Clean-Docker {
    Write-Host "Limpando containers e imagens não utilizadas..." -ForegroundColor Yellow
    docker-compose down --rmi all --volumes --remove-orphans
    docker system prune -f
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Limpeza concluída!" -ForegroundColor Green
    } else {
        Write-Host "Erro na limpeza!" -ForegroundColor Red
    }
}

# Função para ver logs
function Show-Logs {
    Write-Host "Exibindo logs da aplicação..." -ForegroundColor Yellow
    docker-compose logs -f app
}

# Função para acessar shell
function Access-Shell {
    Write-Host "Acessando shell do container..." -ForegroundColor Yellow
    docker-compose exec app sh
}

# Função para reiniciar
function Restart-App {
    Write-Host "Reiniciando aplicação..." -ForegroundColor Yellow
    docker-compose restart app
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Aplicação reiniciada!" -ForegroundColor Green
    } else {
        Write-Host "Erro ao reiniciar aplicação!" -ForegroundColor Red
    }
}

# Função para ver status
function Show-Status {
    Write-Host "Status dos containers:" -ForegroundColor Yellow
    docker-compose ps
}

# Processamento dos argumentos
switch ($Command.ToLower()) {
    "build" { Build-Production }
    "build-dev" { Build-Development }
    "run" { Run-Production }
    "run-dev" { Run-Development }
    "stop" { Stop-Containers }
    "clean" { Clean-Docker }
    "logs" { Show-Logs }
    "shell" { Access-Shell }
    "restart" { Restart-App }
    "status" { Show-Status }
    "help" { Show-Help }
    "--help" { Show-Help }
    "-h" { Show-Help }
    default {
        if ([string]::IsNullOrEmpty($Command)) {
            Show-Help
        } else {
            Write-Host "Comando não reconhecido: $Command" -ForegroundColor Red
            Write-Host ""
            Show-Help
        }
    }
}

