@echo off
git reset
git add src/
git add index.html
git commit -m "feat: Implementar sistema completo de autenticacao com Supabase

- Adicionar contexto de autenticacao (AuthContext.tsx)
- Criar componente de rotas protegidas (ProtectedRoute.tsx)  
- Implementar pagina de login com Google OAuth (Login.tsx)
- Atualizar Header com menu de usuario e logout
- Atualizar Sidebar com controle de acesso por roles
- Configurar mapeamento de roles: super_admin->Admin, admin->Manager, user->User
- Proteger todas as rotas com autenticacao
- Adicionar controle de permissoes baseado em roles
- Integrar completamente com Supabase Auth"
git push origin main
echo Commit e push finalizados!
pause


