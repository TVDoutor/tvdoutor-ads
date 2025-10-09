# Script PowerShell para Deploy na Vercel
# Execute este script para fazer deploy das correções

Write-Host "🚀 Iniciando Deploy para Vercel..." -ForegroundColor Cyan

# Verificar se está no diretório correto
if (!(Test-Path "package.json")) {
    Write-Host "❌ Execute este script no diretório raiz do projeto" -ForegroundColor Red
    exit 1
}

# Verificar se o Git está configurado
try {
    $gitStatus = git status --porcelain
    Write-Host "✅ Repositório Git encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ Git não encontrado. Instale o Git primeiro." -ForegroundColor Red
    exit 1
}

# Verificar se há mudanças para commit
if ($gitStatus) {
    Write-Host "📝 Mudanças detectadas:" -ForegroundColor Yellow
    Write-Host $gitStatus -ForegroundColor Gray
    
    # Perguntar se quer fazer commit
    $commit = Read-Host "Deseja fazer commit das mudanças? (y/n)"
    
    if ($commit -eq "y" -or $commit -eq "Y") {
        Write-Host "`n📦 Fazendo commit das alterações..." -ForegroundColor Blue
        
        # Adicionar todos os arquivos
        git add .
        
        # Commit com mensagem
        $commitMessage = "fix: Corrigir acesso admin e erros 400 nas Edge Functions

- Corrigir chamadas Edge Functions sem body JSON
- Melhorar verificação de permissões admin  
- Adicionar suporte a super_admin
- Corrigir case sensitivity em roles
- Adicionar componente de debug temporário"
        
        git commit -m $commitMessage
        
        Write-Host "✅ Commit realizado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Commit cancelado pelo usuário" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️ Nenhuma mudança detectada" -ForegroundColor Blue
}

# Verificar se há commits para push
try {
    $aheadCommits = git rev-list --count HEAD ^origin/main
    if ($aheadCommits -gt 0) {
        Write-Host "`n🚀 Fazendo push para o repositório..." -ForegroundColor Blue
        git push origin main
        
        Write-Host "✅ Push realizado com sucesso!" -ForegroundColor Green
        Write-Host "🔄 Vercel iniciará deploy automático..." -ForegroundColor Cyan
    } else {
        Write-Host "ℹ️ Nenhum commit novo para enviar" -ForegroundColor Blue
    }
} catch {
    Write-Host "❌ Erro ao fazer push: $_" -ForegroundColor Red
    Write-Host "💡 Verifique se o repositório remoto está configurado corretamente" -ForegroundColor Yellow
}

# Verificar build local (opcional)
$buildLocal = Read-Host "`nDeseja testar o build localmente? (y/n)"
if ($buildLocal -eq "y" -or $buildLocal -eq "Y") {
    Write-Host "`n🔨 Testando build local..." -ForegroundColor Blue
    
    try {
        npm run build
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Build local bem-sucedido!" -ForegroundColor Green
        } else {
            Write-Host "❌ Erro no build local" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Erro ao executar build: $_" -ForegroundColor Red
    }
}

# Instruções finais
Write-Host "`n📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Acesse o Dashboard da Vercel para acompanhar o deploy" -ForegroundColor White
Write-Host "2. Execute o script SQL no Supabase Dashboard" -ForegroundColor White
Write-Host "3. Faça logout/login na aplicação após o deploy" -ForegroundColor White
Write-Host "4. Teste o acesso admin na página /users" -ForegroundColor White

Write-Host "`n🔗 Links úteis:" -ForegroundColor Cyan
Write-Host "- Vercel Dashboard: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "- Supabase Dashboard: https://supabase.com/dashboard" -ForegroundColor White
Write-Host "- Logs da Vercel: Dashboard → Deployments → [seu-projeto] → View Function Logs" -ForegroundColor White

Write-Host "`n✅ Script concluído!" -ForegroundColor Green
