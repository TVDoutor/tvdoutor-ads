import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Bell, Shield, Palette, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";

const Settings = () => {
  const { toast } = useToast();
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: false,
      marketing: false
    },
    security: {
      twoFactor: false,
      sessionTimeout: 30
    },
    preferences: {
      theme: "system",
      language: "pt-BR",
      currency: "BRL"
    },
    company: {
      name: "TV Doutor ADS",
      email: "contato@tvdoutorada.com",
      phone: "+55 11 99999-9999",
      address: "São Paulo, SP"
    }
  });

  const handleSave = () => {
    toast({
      title: "Configurações salvas",
      description: "Suas configurações foram atualizadas com sucesso."
    });
  };

  const handleChangePassword = () => {
    setShowChangePasswordModal(true);
  };

  // Mock user data for demo
  // const mockUser = {
  //   name: "João Silva",
  //   email: "joao@tvdoutorada.com", 
  //   role: "Admin"
  // };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Configurações</h1>
            <p className="text-muted-foreground">Gerencie suas preferências e configurações da plataforma</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notificações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notificações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notificações por email</Label>
                  <p className="text-sm text-muted-foreground">Receba atualizações importantes</p>
                </div>
                <Switch 
                  checked={settings.notifications.email}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, email: checked }
                  })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notificações push</Label>
                  <p className="text-sm text-muted-foreground">Alertas em tempo real</p>
                </div>
                <Switch 
                  checked={settings.notifications.push}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, push: checked }
                  })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Marketing</Label>
                  <p className="text-sm text-muted-foreground">Novidades e promoções</p>
                </div>
                <Switch 
                  checked={settings.notifications.marketing}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, marketing: checked }
                  })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Segurança */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-secondary" />
                Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Autenticação em duas etapas</Label>
                  <p className="text-sm text-muted-foreground">Maior segurança para sua conta</p>
                </div>
                <Switch 
                  checked={settings.security.twoFactor}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    security: { ...settings.security, twoFactor: checked }
                  })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Timeout da sessão (minutos)</Label>
                <Input 
                  type="number"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, sessionTimeout: parseInt(e.target.value) }
                  })}
                />
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleChangePassword}
              >
                Alterar senha
              </Button>
            </CardContent>
          </Card>

          {/* Preferências */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-accent" />
                Preferências
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tema</Label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={settings.preferences.theme}
                  onChange={(e) => setSettings({
                    ...settings,
                    preferences: { ...settings.preferences, theme: e.target.value }
                  })}
                >
                  <option value="light">Claro</option>
                  <option value="dark">Escuro</option>
                  <option value="system">Sistema</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Idioma</Label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={settings.preferences.language}
                  onChange={(e) => setSettings({
                    ...settings,
                    preferences: { ...settings.preferences, language: e.target.value }
                  })}
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Moeda</Label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={settings.preferences.currency}
                  onChange={(e) => setSettings({
                    ...settings,
                    preferences: { ...settings.preferences, currency: e.target.value }
                  })}
                >
                  <option value="BRL">Real (R$)</option>
                  <option value="USD">Dólar ($)</option>
                  <option value="EUR">Euro (€)</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Informações da empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Informações da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da empresa</Label>
                <Input 
                  value={settings.company.name}
                  onChange={(e) => setSettings({
                    ...settings,
                    company: { ...settings.company, name: e.target.value }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={settings.company.email}
                  onChange={(e) => setSettings({
                    ...settings,
                    company: { ...settings.company, email: e.target.value }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input 
                  value={settings.company.phone}
                  onChange={(e) => setSettings({
                    ...settings,
                    company: { ...settings.company, phone: e.target.value }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input 
                  value={settings.company.address}
                  onChange={(e) => setSettings({
                    ...settings,
                    company: { ...settings.company, address: e.target.value }
                  })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold">Ações do sistema</h3>
            <p className="text-sm text-muted-foreground">Gerenciar dados e backups</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              Exportar dados
            </Button>
            <Button variant="outline">
              Fazer backup
            </Button>
            <Button onClick={handleSave}>
              Salvar configurações
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Alteração de Senha */}
      <ChangePasswordModal 
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
    </DashboardLayout>
  );
};

export default Settings;