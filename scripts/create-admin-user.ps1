# Script PowerShell para criar usuário admin no Supabase
# 
# Uso:
# .\scripts\create-admin-user.ps1
#
# Ou com parâmetros:
# .\scripts\create-admin-user.ps1 -Email "publicidade3@tvdoutor.com.br" -Password "Publi@2025!" -FullName "Maria Laura" -Role "admin"

param(
    [string]$Email = "publicidade3@tvdoutor.com.br",
    [string]$Password = "Publi@2025!",
    [string]$FullName = "Maria Laura",
    [string]$Role = "admin"  # "admin" ou "super_admin"
)

# Verificar se as variáveis de ambiente estão configuradas
$SupabaseUrl = $env:VITE_SUPABASE_URL
$SupabaseServiceKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SupabaseUrl) {
    Write-Error "VITE_SUPABASE_URL não encontrada nas variáveis de ambiente"
    exit 1
}

if (-not $SupabaseServiceKey) {
    Write-Error "SUPABASE_SERVICE_ROLE_KEY não encontrada nas variáveis de ambiente"
    exit 1
}

# Validar parâmetros
if (-not $Email -or -not $Password -or -not $FullName) {
    Write-Error "Email, Password e FullName são obrigatórios"
    exit 1
}

# Validar formato do email
if ($Email -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$') {
    Write-Error "Formato de email inválido"
    exit 1
}

# Validar força da senha
if ($Password.Length -lt 8) {
    Write-Error "Senha deve ter pelo menos 8 caracteres"
    exit 1
}

# Validar role
if ($Role -notin @("admin", "super_admin")) {
    Write-Error "Role deve ser 'admin' ou 'super_admin'"
    exit 1
}

Write-Host "🚀 Iniciando criação de usuário admin..." -ForegroundColor Green
Write-Host "📧 Email: $Email" -ForegroundColor Cyan
Write-Host "👤 Nome: $FullName" -ForegroundColor Cyan
Write-Host "🔑 Role: $Role" -ForegroundColor Cyan
Write-Host ""

try {
    # Criar o payload JSON
    $payload = @{
        email = $Email
        password = $Password
        full_name = $FullName
        role = $Role
    } | ConvertTo-Json

    # URL da Edge Function (assumindo que está deployada)
    $functionUrl = "$SupabaseUrl/functions/v1/create-admin-user"
    
    Write-Host "✅ Chamando Edge Function..." -ForegroundColor Green
    
    # Fazer a chamada para a Edge Function
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $SupabaseServiceKey"
    }

    $response = Invoke-RestMethod -Uri $functionUrl -Method Post -Body $payload -Headers $headers

    if ($response.success) {
        Write-Host ""
        Write-Host "🎉 USUÁRIO ADMIN CRIADO COM SUCESSO!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Resumo:" -ForegroundColor Yellow
        Write-Host "   ID: $($response.user.id)" -ForegroundColor White
        Write-Host "   Email: $($response.user.email)" -ForegroundColor White
        Write-Host "   Nome: $($response.user.full_name)" -ForegroundColor White
        Write-Host "   Role: $($response.user.role)" -ForegroundColor White
        Write-Host "   Criado em: $($response.user.created_at)" -ForegroundColor White
        Write-Host ""
        Write-Host "🔗 O usuário pode fazer login imediatamente com as credenciais fornecidas." -ForegroundColor Green
    } else {
        Write-Error "Falha na criação do usuário: $($response.error)"
        exit 1
    }

} catch {
    Write-Error "❌ ERRO AO CRIAR USUÁRIO ADMIN:"
    Write-Error "   $($_.Exception.Message)"
    
    if ($_.Exception.Message -like "*already registered*") {
        Write-Host "💡 Dica: Este email já está registrado. Tente com um email diferente." -ForegroundColor Yellow
    } elseif ($_.Exception.Message -like "*Password should be at least*") {
        Write-Host "💡 Dica: A senha deve ter pelo menos 8 caracteres." -ForegroundColor Yellow
    } elseif ($_.Exception.Message -like "*Invalid email*") {
        Write-Host "💡 Dica: Verifique se o formato do email está correto." -ForegroundColor Yellow
    }
    
    exit 1
}
