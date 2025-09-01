import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Shield, Calendar, Save, Edit2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfileData {
  id: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  role?: string;
  created_at: string;
  updated_at?: string;
  phone?: string;
  organization?: string;
}

export default function Profile() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    phone: '',
    organization: ''
  });

  useEffect(() => {
    fetchProfileData();
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do perfil.",
          variant: "destructive"
        });
        return;
      }

      setProfileData(data);
      setFormData({
        display_name: data.display_name || '',
        phone: data.phone || '',
        organization: data.organization || ''
      });
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !profileData) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name,
          phone: formData.phone,
          organization: formData.organization,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Erro ao salvar perfil:', error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar as alterações.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!"
      });
      
      setIsEditing(false);
      fetchProfileData();
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast({
        title: "Erro",
        description: "Erro interno do servidor.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      display_name: profileData?.display_name || '',
      phone: profileData?.phone || '',
      organization: profileData?.organization || ''
    });
    setIsEditing(false);
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'super_admin':
        return 'Super Administrador';
      case 'user':
      default:
        return 'Usuário';
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'secondary';
      case 'super_admin':
        return 'destructive';
      case 'user':
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando perfil...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
            <p className="text-muted-foreground">
              Gerencie suas informações pessoais e configurações de conta
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Editar Perfil
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Card */}
          <Card className="md:col-span-1">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profileData?.avatar_url} />
                  <AvatarFallback className="text-2xl">
                    {profileData?.display_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-xl">{profileData?.display_name || 'Usuário'}</CardTitle>
              <div className="flex justify-center">
                <Badge variant={getRoleColor(profileData?.role) as any}>
                  <Shield className="mr-1 h-3 w-3" />
                  {getRoleLabel(profileData?.role)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{profileData?.email || user?.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Membro desde {new Date(profileData?.created_at || '').toLocaleDateString('pt-BR')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Profile Information */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Nome de Exibição</Label>
                  {isEditing ? (
                    <Input
                      id="display_name"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      placeholder="Digite seu nome"
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded-md">
                      {profileData?.display_name || 'Não informado'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="p-2 bg-muted rounded-md text-muted-foreground">
                    {profileData?.email || user?.email}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O e-mail não pode ser alterado
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded-md">
                      {profileData?.phone || 'Não informado'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization">Organização</Label>
                  {isEditing ? (
                    <Input
                      id="organization"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      placeholder="Nome da empresa/clínica"
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded-md">
                      {profileData?.organization || 'Não informado'}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Função no Sistema</Label>
                <div className="p-2 bg-muted rounded-md">
                  <Badge variant={getRoleColor(profileData?.role) as any}>
                    <Shield className="mr-1 h-3 w-3" />
                    {getRoleLabel(profileData?.role)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  A função no sistema é definida pelos administradores
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}