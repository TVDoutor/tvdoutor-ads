import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { UserSessionDashboard } from '@/components/admin/UserSessionDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function UserManagement() {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
            <p className="text-gray-600">
              Monitoramento de usuários online e histórico de sessões
            </p>
          </div>
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
        <UserSessionDashboard />
      </div>
    </DashboardLayout>
  );
}
