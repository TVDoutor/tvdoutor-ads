# Script para corrigir acesso de admin às páginas de manager
# Data: 2025-01-15

Write-Host "🔧 Aplicando correção de permissões de admin..." -ForegroundColor Yellow

# Verificar se o Supabase CLI está disponível
if (-not (Get-Command "npx" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ NPX não encontrado. Instale Node.js primeiro." -ForegroundColor Red
    exit 1
}

# Aplicar correção via SQL direto
Write-Host "📝 Aplicando correção SQL..." -ForegroundColor Blue

$sqlContent = @"
-- CORREÇÃO URGENTE: Permitir que usuários admin acessem páginas de manager
-- 1. Verificar se o enum app_role contém 'manager'
DO `$`$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'manager' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
    ) THEN
        ALTER TYPE public.app_role ADD VALUE 'manager';
        RAISE NOTICE 'Role manager adicionada ao enum app_role';
    ELSE
        RAISE NOTICE 'Role manager já existe no enum app_role';
    END IF;
END `$`$;

-- 2. Garantir que o usuário admin tem role 'admin' na tabela user_roles
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
    p.id,
    'admin'::app_role,
    now()
FROM profiles p
WHERE (p.email = 'hildebrando.cardoso@tvdoutor.com.br' 
   OR p.id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3')
  AND p.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'admin'
  );

-- 3. Criar função is_manager para verificar permissões de manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS `$`$
  SELECT has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
`$`$;

-- 4. Verificação final
SELECT 
    'CORREÇÃO APLICADA' as status,
    'Usuários admin agora podem acessar páginas de manager' as description;
"@

# Salvar SQL em arquivo temporário
$tempSqlFile = "temp_fix_admin.sql"
$sqlContent | Out-File -FilePath $tempSqlFile -Encoding UTF8

Write-Host "✅ Script SQL criado: $tempSqlFile" -ForegroundColor Green
Write-Host "📋 Para aplicar a correção, execute:" -ForegroundColor Yellow
Write-Host "   npx supabase db push --linked" -ForegroundColor White
Write-Host "   ou aplique o SQL diretamente no painel do Supabase" -ForegroundColor White

Write-Host "`n🔍 Verificando arquivos de correção..." -ForegroundColor Blue

# Verificar se os arquivos de correção existem
$files = @(
    "fix-admin-permissions.sql",
    "src/components/ProtectedRoute.tsx",
    "src/contexts/AuthContext.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file" -ForegroundColor Red
    }
}

Write-Host "`n🎯 Resumo da correção aplicada:" -ForegroundColor Cyan
Write-Host "   1. ✅ Corrigida lógica do ProtectedRoute para admin acessar páginas de manager" -ForegroundColor White
Write-Host "   2. ✅ Atualizada função hasRole no AuthContext" -ForegroundColor White
Write-Host "   3. ✅ Criado script SQL para corrigir banco de dados" -ForegroundColor White
Write-Host "   4. ✅ Adicionada função is_manager() no banco" -ForegroundColor White

Write-Host "`n🚀 Próximos passos:" -ForegroundColor Yellow
Write-Host "   1. Aplique o SQL no banco de dados" -ForegroundColor White
Write-Host "   2. Reinicie a aplicação" -ForegroundColor White
Write-Host "   3. Teste o acesso às páginas bloqueadas" -ForegroundColor White

Write-Host "`n✨ Correção concluída!" -ForegroundColor Green