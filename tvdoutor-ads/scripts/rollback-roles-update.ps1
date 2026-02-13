# Script de Rollback para Atualização das Roles
# Data: 2025-01-15
# Descrição: Reverte as alterações da atualização das roles

Write-Host "🔄 Iniciando rollback da atualização das roles..." -ForegroundColor Yellow

# Verificar se o Supabase CLI está instalado
if (-not (Get-Command "supabase" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Supabase CLI não encontrado. Instale primeiro:" -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "⚠️  ATENÇÃO: Este rollback pode causar perda de dados!" -ForegroundColor Red
Write-Host "   Usuários com role 'manager' podem ser afetados" -ForegroundColor Red
$confirm = Read-Host "Deseja continuar? (digite 'SIM' para confirmar)"

if ($confirm -ne "SIM") {
    Write-Host "❌ Rollback cancelado pelo usuário" -ForegroundColor Yellow
    exit 0
}

Write-Host "🔄 Aplicando rollback no banco de dados..." -ForegroundColor Blue

# Script SQL de rollback
$rollbackSQL = @"
-- ROLLBACK: Remover role 'manager' do sistema

-- 1. Atualizar usuários com role 'manager' para 'user'
UPDATE public.user_roles 
SET role = 'user' 
WHERE role = 'manager';

UPDATE public.profiles 
SET role = 'user' 
WHERE role = 'manager';

-- 2. Criar novo enum sem 'manager'
CREATE TYPE public.app_role_old AS ENUM ('super_admin', 'admin', 'user');

-- 3. Atualizar tabela user_roles
ALTER TABLE public.user_roles 
ALTER COLUMN role TYPE public.app_role_old 
USING role::text::public.app_role_old;

-- 4. Remover enum antigo
DROP TYPE public.app_role;

-- 5. Renomear novo enum
ALTER TYPE public.app_role_old RENAME TO app_role;

-- 6. Restaurar função is_admin original
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
$$;

-- 7. Remover funções adicionadas
DROP FUNCTION IF EXISTS public.is_manager();
DROP FUNCTION IF EXISTS public.can_delete_other_users();
DROP FUNCTION IF EXISTS public.can_edit_other_users();

-- 8. Log do rollback
INSERT INTO public.migration_log (migration_name, applied_at, description) 
VALUES (
    'ROLLBACK_20250115000000_add_manager_role', 
    now(), 
    'Rollback aplicado: role manager removida do sistema'
) ON CONFLICT DO NOTHING;
"@

try {
    # Salvar SQL em arquivo temporário
    $tempFile = [System.IO.Path]::GetTempFileName() + ".sql"
    $rollbackSQL | Out-File -FilePath $tempFile -Encoding UTF8
    
    # Executar rollback
    supabase db query --linked --file $tempFile
    
    # Limpar arquivo temporário
    Remove-Item $tempFile -Force
    
    Write-Host "✅ Rollback do banco de dados concluído" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao aplicar rollback no banco:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host "🔄 Revertendo arquivos do frontend..." -ForegroundColor Blue

# Verificar se git está disponível
if (Get-Command "git" -ErrorAction SilentlyContinue) {
    try {
        # Reverter arquivos modificados
        git checkout HEAD~1 -- src/integrations/supabase/types.ts
        git checkout HEAD~1 -- src/contexts/AuthContext.tsx  
        git checkout HEAD~1 -- src/pages/Users.tsx
        
        Write-Host "✅ Arquivos do frontend revertidos" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Aviso: Não foi possível reverter arquivos via git" -ForegroundColor Yellow
        Write-Host "   Reverta manualmente os arquivos modificados" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Git não encontrado. Reverta manualmente os arquivos:" -ForegroundColor Yellow
    Write-Host "   - src/integrations/supabase/types.ts" -ForegroundColor White
    Write-Host "   - src/contexts/AuthContext.tsx" -ForegroundColor White
    Write-Host "   - src/pages/Users.tsx" -ForegroundColor White
}

Write-Host "🧪 Verificando rollback..." -ForegroundColor Blue

# Verificar se o enum foi revertido
try {
    $verifyQuery = @"
SELECT 
    'Enum values after rollback:' as info,
    unnest(enum_range(NULL::app_role)) as current_values;
"@
    
    $result = supabase db query --linked --query $verifyQuery
    Write-Host "✅ Verificação concluída:" -ForegroundColor Green
    Write-Host $result -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Aviso: Não foi possível verificar o rollback automaticamente" -ForegroundColor Yellow
}

Write-Host "🎉 Rollback concluído com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Resumo do rollback:" -ForegroundColor Cyan
Write-Host "   ✅ Role 'manager' removida do enum app_role" -ForegroundColor White
Write-Host "   ✅ Usuários com role 'manager' convertidos para 'user'" -ForegroundColor White
Write-Host "   ✅ Funções adicionais removidas" -ForegroundColor White
Write-Host "   ✅ Função is_admin() restaurada" -ForegroundColor White
Write-Host "   ✅ Arquivos do frontend revertidos" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Verifique se a interface está funcionando" -ForegroundColor White
Write-Host "   2. Teste as funcionalidades de usuários" -ForegroundColor White
Write-Host "   3. Verifique se não há erros no console" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Importante: Usuários que tinham role 'manager' agora são 'user'" -ForegroundColor Yellow
