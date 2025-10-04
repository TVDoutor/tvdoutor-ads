# Script completo para configurar Supabase CLI e deploy da Edge Function
# Execute: .\scripts\setup-supabase-complete.ps1

Write-Host "🚀 Configuração Completa do Supabase CLI" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Verificar se estamos no diretório correto
if (-not (Test-Path "supabase/config.toml")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto" -ForegroundColor Red
    exit 1
}

# 1. Verificar se Supabase CLI está instalado
Write-Host "🔍 Verificando Supabase CLI..." -ForegroundColor Blue
try {
    $version = supabase --version
    Write-Host "✅ Supabase CLI encontrado: $version" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI não encontrado. Instalando..." -ForegroundColor Yellow
    Write-Host "📦 Instalando via npm..." -ForegroundColor Blue
    
    try {
        npm install -g supabase
        Write-Host "✅ Supabase CLI instalado com sucesso!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erro na instalação. Instale manualmente:" -ForegroundColor Red
        Write-Host "npm install -g supabase" -ForegroundColor Yellow
        exit 1
    }
}

# 2. Login no Supabase
Write-Host ""
Write-Host "🔐 Fazendo login no Supabase..." -ForegroundColor Blue
Write-Host "📝 Abra o navegador e faça login quando solicitado" -ForegroundColor Yellow

try {
    supabase login
    Write-Host "✅ Login realizado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro no login. Execute manualmente: supabase login" -ForegroundColor Red
    exit 1
}

# 3. Link do projeto
Write-Host ""
Write-Host "🔗 Linkando projeto..." -ForegroundColor Blue
Write-Host "📋 Projeto detectado: vaogzhwzucijiyvyglls" -ForegroundColor Cyan

try {
    supabase link --project-ref vaogzhwzucijiyvyglls
    Write-Host "✅ Projeto linkado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro no link. Execute manualmente:" -ForegroundColor Red
    Write-Host "supabase link --project-ref vaogzhwzucijiyvyglls" -ForegroundColor Yellow
    exit 1
}

# 4. Configurar secrets
Write-Host ""
Write-Host "🔑 Configurando secrets..." -ForegroundColor Blue

# Verificar se SERVICE_ROLE_KEY está definida
if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "⚠️  SERVICE_ROLE_KEY não definida" -ForegroundColor Yellow
    Write-Host "📝 Configure com:" -ForegroundColor Blue
    Write-Host '$env:SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"' -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 Encontre a chave em: Supabase Dashboard > Settings > API > service_role" -ForegroundColor Blue
    Write-Host ""
    $continue = Read-Host "Deseja continuar sem configurar secrets? (y/N)"
    if ($continue -notmatch "^[Yy]$") {
        exit 1
    }
} else {
    Write-Host "✅ Configurando secrets..." -ForegroundColor Green
    supabase secrets set SUPABASE_URL="https://vaogzhwzucijiyvyglls.supabase.co"
    supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$env:SUPABASE_SERVICE_ROLE_KEY"
    Write-Host "✅ Secrets configurados!" -ForegroundColor Green
}

# 5. Deploy da Edge Function
Write-Host ""
Write-Host "🚀 Fazendo deploy da Edge Function..." -ForegroundColor Blue

try {
    supabase functions deploy pdf-proposal-pro
    Write-Host "✅ Deploy realizado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro no deploy. Execute manualmente:" -ForegroundColor Red
    Write-Host "supabase functions deploy pdf-proposal-pro" -ForegroundColor Yellow
    exit 1
}

# 6. Teste da função
Write-Host ""
Write-Host "🧪 Testando a função..." -ForegroundColor Blue

if (-not $env:SUPABASE_ANON_KEY) {
    Write-Host "⚠️  ANON_KEY não definida para teste" -ForegroundColor Yellow
    Write-Host "📝 Configure com:" -ForegroundColor Blue
    Write-Host '$env:SUPABASE_ANON_KEY="sua-anon-key"' -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 Encontre a chave em: Supabase Dashboard > Settings > API > anon" -ForegroundColor Blue
} else {
    Write-Host "✅ Executando teste..." -ForegroundColor Green
    try {
        node scripts/test-pdf-pro-function.js
        Write-Host "✅ Teste executado!" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Erro no teste, mas a função foi deployada" -ForegroundColor Yellow
    }
}

# 7. Resumo final
Write-Host ""
Write-Host "🎉 Configuração Concluída!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Supabase CLI instalado e configurado" -ForegroundColor Green
Write-Host "✅ Projeto linkado" -ForegroundColor Green
Write-Host "✅ Edge Function deployada" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Agora teste no frontend:" -ForegroundColor Blue
Write-Host "1. Acesse uma proposta" -ForegroundColor Gray
Write-Host "2. Clique em 'PDF Profissional'" -ForegroundColor Gray
Write-Host "3. Deve aparecer 'PDF profissional gerado com sucesso!'" -ForegroundColor Gray
Write-Host ""
Write-Host "📊 Se ainda aparecer erro CORS, verifique:" -ForegroundColor Yellow
Write-Host "- Secrets configurados corretamente" -ForegroundColor Gray
Write-Host "- Função deployada sem erros" -ForegroundColor Gray
Write-Host "- Projeto linkado corretamente" -ForegroundColor Gray
