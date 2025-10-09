import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, User, Shield, Database } from "lucide-react";

export const AdminDebug = () => {
  const { user, profile, loading } = useAuth();

  const refreshProfile = async () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Debug Admin - Carregando...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Debug Admin Status
        </CardTitle>
        <Button variant="outline" size="sm" onClick={refreshProfile}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Atualizar
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Informações do usuário */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Usuário Auth
            </h4>
            <div className="text-sm space-y-1">
              <p><strong>ID:</strong> {user?.id || 'N/A'}</p>
              <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
              <p><strong>Email confirmado:</strong> {user?.email_confirmed_at ? 'Sim' : 'Não'}</p>
              <p><strong>Último login:</strong> {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Perfil & Roles
            </h4>
            <div className="text-sm space-y-1">
              <p><strong>Nome:</strong> {profile?.name || 'N/A'}</p>
              <p><strong>Email:</strong> {profile?.email || 'N/A'}</p>
              <p><strong>Role:</strong> 
                <Badge variant={profile?.role === 'admin' ? 'default' : 'secondary'} className="ml-1">
                  {profile?.role || 'N/A'}
                </Badge>
              </p>
              <p><strong>Super Admin:</strong> 
                <Badge variant={profile?.role === 'super_admin' || (profile as any)?.super_admin ? 'destructive' : 'outline'} className="ml-1">
                  {profile?.role === 'super_admin' || (profile as any)?.super_admin ? 'Sim' : 'Não'}
                </Badge>
              </p>
            </div>
          </div>
        </div>

        {/* Testes de acesso */}
        <div className="space-y-2">
          <h4 className="font-medium">Testes de Acesso</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-accent/20 rounded">
              <span>isAdmin():</span>
              <Badge variant={profile?.role === 'admin' || profile?.role === 'super_admin' || (profile as any)?.super_admin ? 'default' : 'secondary'}>
                {profile?.role === 'admin' || profile?.role === 'super_admin' || (profile as any)?.super_admin ? 'Sim' : 'Não'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-2 bg-accent/20 rounded">
              <span>Acesso Users:</span>
              <Badge variant={profile?.role === 'admin' || profile?.role === 'super_admin' || (profile as any)?.super_admin ? 'default' : 'secondary'}>
                {profile?.role === 'admin' || profile?.role === 'super_admin' || (profile as any)?.super_admin ? 'Sim' : 'Não'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-2 bg-accent/20 rounded">
              <span>Acesso Manager:</span>
              <Badge variant={profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'super_admin' || (profile as any)?.super_admin ? 'default' : 'secondary'}>
                {profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'super_admin' || (profile as any)?.super_admin ? 'Sim' : 'Não'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-2 bg-accent/20 rounded">
              <span>Perfil carregado:</span>
              <Badge variant={profile ? 'default' : 'destructive'}>
                {profile ? 'Sim' : 'Não'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Dados brutos para debug */}
        <div className="space-y-2">
          <h4 className="font-medium">Dados Brutos (Debug)</h4>
          <div className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-32">
            <pre>{JSON.stringify({
              user: user ? {
                id: user.id,
                email: user.email,
                email_confirmed_at: user.email_confirmed_at,
                last_sign_in_at: user.last_sign_in_at
              } : null,
              profile: profile,
              loading: loading
            }, null, 2)}</pre>
          </div>
        </div>

        {/* Instruções */}
        <div className="space-y-2 p-3 bg-blue-50 rounded">
          <h4 className="font-medium text-blue-900">Se não é admin:</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Execute o script SQL no Supabase Dashboard</li>
            <li>Faça logout e login novamente</li>
            <li>Verifique se o email está correto no banco</li>
            <li>Confirme se o trigger está funcionando</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
