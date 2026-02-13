import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { UserSessionDashboard } from '@/components/admin/UserSessionDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

export default function UserManagement() {
  const { isSuperAdmin } = useAuth();

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        {/* Page Header - mesmo estilo laranja com cantos arredondados do Inventário */}
        <PageHeader
          title="Gerenciamento de Usuários"
          subtitle="Monitoramento de usuários online e histórico de sessões em tempo real"
          icon={Shield}
        />

        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-12 space-y-6">
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
      </div>
    </DashboardLayout>
  );
}
