import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { UserSessionDashboard } from '@/components/admin/UserSessionDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

export default function UserManagement() {
  const { isSuperAdmin } = useAuth();

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Gerenciamento de Usuários
          </h1>
          <p className="text-muted-foreground">
            Monitoramento de usuários online e histórico de sessões em tempo real
          </p>
        </div>

        {/* Aviso de Permissão */}
        {!isSuperAdmin() && (
          <Alert className="border-red-200 bg-red-50">
            <Shield className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Acesso Negado:</strong> Esta funcionalidade está disponível apenas para Super Administradores.
              <br />
              <span className="text-sm">
                Entre em contato com um administrador se você acredita que deveria ter acesso a esta área.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Dashboard de Sessões */}
        <div className="flex-1 min-h-0">
          <UserSessionDashboard />
        </div>
      </div>
    </DashboardLayout>
  );
}
