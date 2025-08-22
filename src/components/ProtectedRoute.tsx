import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
  requireAuth?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requiredRole,
  requireAuth = true 
}: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  // Debug logs para investigar o problema
  console.log('ProtectedRoute Debug:', {
    path: location.pathname,
    user: user ? 'Present' : 'Null',
    userId: user?.id,
    profile: profile ? `${profile.name} (${profile.role})` : 'Null',
    loading,
    requireAuth,
    requiredRole
  });

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Verificando autenticação...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirecionar para login se não estiver autenticado
  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar se tem o role necessário
  if (requiredRole && profile) {
    const hasPermission = (() => {
      switch (requiredRole) {
        case 'Admin':
          return profile.role === 'Admin';
        case 'Manager':
          return profile.role === 'Admin' || profile.role === 'Manager';
        case 'User':
          return true; // Todos os usuários autenticados podem acessar recursos de User
        default:
          return false;
      }
    })();

    if (!hasPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <div className="rounded-full bg-destructive/10 p-3 mb-4">
                <Lock className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
              <p className="text-muted-foreground mb-4">
                Você não tem permissão para acessar esta página.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                <span>Nível necessário: {requiredRole}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <span>Seu nível: {profile?.role || 'Não definido'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
};
