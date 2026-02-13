import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Bell, Shield, Palette, Database, Save, Download, HardDrive } from "lucide-react";
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

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        <PageHeader
          icon={SettingsIcon}
          title="Configurações"
          description="Gerencie suas preferências e configurações da plataforma"
          actions={
            <Button 
              onClick={handleSave}
              className="bg-white text-[#f48220] hover:bg-white/90 shadow-2xl hover:shadow-white/50 hover:scale-105 transition-all duration-300 font-bold group"
            >
              <Save className="h-5 w-5 mr-2" />
              Salvar Tudo
            </Button>
          }
        />

        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-12 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notificações */}
            <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-[#f48220]/5 to-[#ff9d4d]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="p-2 bg-[#f48220]/10 rounded-lg group-hover:scale-110 transition-transform">
                    <Bell className="h-5 w-5 text-[#f48220]" />
                  </div>
                  Notificações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-slate-50 transition-colors">
                  <div>
                    <Label className="font-semibold">Notificações por email</Label>
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
                
                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-slate-50 transition-colors">
                  <div>
                    <Label className="font-semibold">Notificações push</Label>
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
                
                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-slate-50 transition-colors">
                  <div>
                    <Label className="font-semibold">Marketing</Label>
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
            <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-[#f48220]/5 to-[#ff9d4d]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="p-2 bg-[#ff9d4d]/10 rounded-lg group-hover:scale-110 transition-transform">
                    <Shield className="h-5 w-5 text-[#ff9d4d]" />
                  </div>
                  Segurança
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-slate-50 transition-colors">
                  <div>
                    <Label className="font-semibold">Autenticação em duas etapas</Label>
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
                
                <div className="space-y-2 p-4 rounded-lg hover:bg-slate-50 transition-colors">
                  <Label className="font-semibold">Timeout da sessão (minutos)</Label>
                  <Input 
                    type="number"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: { ...settings.security, sessionTimeout: parseInt(e.target.value) }
                    })}
                    className="border-2 border-slate-200 hover:border-[#f48220]/50 focus:border-[#f48220] transition-all"
                  />
                </div>

                <Button 
                  variant="outline" 
                  className="w-full border-2 hover:bg-[#f48220]/10 hover:border-[#f48220] hover:text-[#f48220] transition-all"
                  onClick={handleChangePassword}
                >
                  Alterar senha
                </Button>
              </CardContent>
            </Card>

            {/* Preferências */}
            <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-[#f48220]/5 to-[#ff9d4d]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="p-2 bg-[#d66912]/10 rounded-lg group-hover:scale-110 transition-transform">
                    <Palette className="h-5 w-5 text-[#d66912]" />
                  </div>
                  Preferências
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                <div className="space-y-2 p-4 rounded-lg hover:bg-slate-50 transition-colors">
                  <Label className="font-semibold">Tema</Label>
                  <select 
                    className="w-full p-3 border-2 border-slate-200 rounded-md hover:border-[#f48220]/50 focus:border-[#f48220] transition-all"
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

                <div className="space-y-2 p-4 rounded-lg hover:bg-slate-50 transition-colors">
                  <Label className="font-semibold">Idioma</Label>
                  <select 
                    className="w-full p-3 border-2 border-slate-200 rounded-md hover:border-[#f48220]/50 focus:border-[#f48220] transition-all"
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

                <div className="space-y-2 p-4 rounded-lg hover:bg-slate-50 transition-colors">
                  <Label className="font-semibold">Moeda</Label>
                  <select 
                    className="w-full p-3 border-2 border-slate-200 rounded-md hover:border-[#f48220]/50 focus:border-[#f48220] transition-all"
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
            <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-[#f48220]/5 to-[#ff9d4d]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="p-2 bg-[#ffb87a]/10 rounded-lg group-hover:scale-110 transition-transform">
                    <Database className="h-5 w-5 text-[#ffb87a]" />
                  </div>
                  Informações da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                <div className="space-y-2">
                  <Label className="font-semibold">Nome da empresa</Label>
                  <Input 
                    value={settings.company.name}
                    onChange={(e) => setSettings({
                      ...settings,
                      company: { ...settings.company, name: e.target.value }
                    })}
                    className="border-2 border-slate-200 hover:border-[#f48220]/50 focus:border-[#f48220] transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Email</Label>
                  <Input 
                    type="email"
                    value={settings.company.email}
                    onChange={(e) => setSettings({
                      ...settings,
                      company: { ...settings.company, email: e.target.value }
                    })}
                    className="border-2 border-slate-200 hover:border-[#f48220]/50 focus:border-[#f48220] transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Telefone</Label>
                  <Input 
                    value={settings.company.phone}
                    onChange={(e) => setSettings({
                      ...settings,
                      company: { ...settings.company, phone: e.target.value }
                    })}
                    className="border-2 border-slate-200 hover:border-[#f48220]/50 focus:border-[#f48220] transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Endereço</Label>
                  <Input 
                    value={settings.company.address}
                    onChange={(e) => setSettings({
                      ...settings,
                      company: { ...settings.company, address: e.target.value }
                    })}
                    className="border-2 border-slate-200 hover:border-[#f48220]/50 focus:border-[#f48220] transition-all"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator className="my-8" />

          {/* Ações do Sistema */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h3 className="text-xl font-bold mb-1">Ações do Sistema</h3>
                  <p className="text-sm text-muted-foreground">Gerenciar dados e backups do sistema</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <Button 
                    variant="outline"
                    className="border-2 hover:bg-[#f48220]/10 hover:border-[#f48220] hover:text-[#f48220] transition-all group"
                  >
                    <Download className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                    Exportar dados
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-2 hover:bg-[#f48220]/10 hover:border-[#f48220] hover:text-[#f48220] transition-all group"
                  >
                    <HardDrive className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                    Fazer backup
                  </Button>
                  <Button 
                    onClick={handleSave}
                    className="bg-[#f48220] hover:bg-[#e67516] shadow-xl hover:shadow-2xl hover:scale-105 transition-all group"
                  >
                    <Save className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" />
                    Salvar configurações
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
