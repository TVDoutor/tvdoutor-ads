// @ts-nocheck
import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatsGrid } from "@/components/StatsGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Users as UsersIcon, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  UserPlus, 
  Eye, 
  Shield,
  Crown,
  User,
  Filter,
  Grid,
  List,
  RefreshCw,
  Mail,
  Calendar,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AdminDebug } from "@/components/AdminDebug";
import { logDebug, logError } from "@/utils/secureLogger";

interface UserProfile {
  id: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  role?: string;
  created_at: string;
  updated_at?: string;
  super_admin?: boolean;
  phone?: string;
  organization?: string;
}

const Users = () => {
  const { toast } = useToast();
  const { isAdmin, isSuperAdmin, profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Modal states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // User data
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "user"
  });

  useEffect(() => {
    const adminStatus = isAdmin();
    if (adminStatus && !initialized) {
      setInitialized(true);
      fetchUsers();
    } else if (!adminStatus) {
      setLoading(false);
    }
  }, [profile?.role, initialized]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      logDebug('Starting to fetch users...');
      
      // Fetch profiles directly from the profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        logError('Error fetching profiles', profilesError);
        throw profilesError;
      }

      logDebug('Successfully fetched profiles', { count: profiles?.length || 0 });

      // Create roles map from profiles data
      const rolesMap: Record<string, string> = {};
      profiles?.forEach(profile => {
        // Use the role from profiles table, with super_admin taking precedence
        if (profile.super_admin === true || profile.role === 'super_admin') {
          rolesMap[profile.id] = 'super_admin';
        } else {
          rolesMap[profile.id] = profile.role || 'user';
        }
      });

      setUsers(profiles || []);
      setUserRoles(rolesMap);
      
      logDebug('Successfully processed users', { 
        profileCount: profiles?.length || 0,
        rolesCount: Object.keys(rolesMap).length
      });
      
    } catch (error: any) {
      logError('Error fetching users', error);
      
      let errorMessage = "Não foi possível carregar os usuários.";
      
      if (error.message?.includes('permission denied')) {
        errorMessage = "Sem permissão para acessar os dados de usuários.";
      } else if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        errorMessage = "Estrutura do banco de dados não encontrada. Execute as migrações.";
      } else if (error.message) {
        errorMessage = `Erro: ${error.message}`;
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || userRoles[user.id] === roleFilter || 
                       (roleFilter === 'admin' && user.super_admin);

    return matchesSearch && matchesRole;
  });

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      logDebug('Criando usuário no Auth', { hasEmail: !!newUser.email, name: newUser.name, role: newUser.role });
      
      // CORREÇÃO: Usar apenas signUp sem tentar definir role diretamente
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.name
            // REGRA DE SEGURANÇA: A role de um novo usuário cadastrado
            // publicamente DEVE ser sempre 'user'. Nunca deixe o usuário escolher.
            // role: 'user', // Removido - o trigger handle_new_user já define
          }
        }
      });

      // Se a chamada signUp retornar um erro, nós o lançamos para o bloco CATCH
      if (authError) {
        throw authError;
      }

      if (authData.user) {
        logDebug('Usuário criado no Auth', { userId: authData.user.id });
        
        // O trigger handle_new_user cria automaticamente:
        // - Profile na tabela profiles
        // - Role 'user' na tabela user_roles
        
        // Aguardar um pouco para o trigger processar
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await fetchUsers();
        setNewUser({ name: "", email: "", password: "", role: "user" });
        setIsCreateDialogOpen(false);

        toast({
          title: "Usuário criado",
          description: `${newUser.name} foi adicionado com sucesso`
        });
      }
    } catch (error: any) {
      logError('Error creating user', error);
      
      let errorMessage = 'Erro desconhecido';
      
      if (error.message?.includes('User already registered')) {
        errorMessage = 'Este email já está cadastrado no sistema';
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = 'Email inválido';
      } else if (error.message?.includes('Password')) {
        errorMessage = 'Senha deve ter pelo menos 6 caracteres';
      } else if (error.message?.includes('Only super administrators can change user roles')) {
        errorMessage = 'Apenas super administradores podem alterar roles de usuários';
      } else if (error.message?.includes('Database error saving new user')) {
        errorMessage = 'Erro no banco de dados ao salvar usuário';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro ao criar usuário",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleViewUser = (user: UserProfile) => {
    setSelectedUser(user);
    setIsViewDialogOpen(true);
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser({ ...user });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    // Verificar permissões de edição
    const currentUserRole = userRoles[profile?.id || ''];
    const isCurrentUserSuperAdmin = currentUserRole === 'super_admin' || isSuperAdmin();
    const isCurrentUserAdmin = currentUserRole === 'admin' || isCurrentUserSuperAdmin;
    const isEditingOwnProfile = editingUser.id === profile?.id;
    
    // Apenas super_admins podem editar outros usuários
    // Outros usuários só podem editar seus próprios dados
    if (!isCurrentUserSuperAdmin && !isEditingOwnProfile) {
      toast({
        title: "Acesso Negado",
        description: "Apenas Super Administradores podem editar outros usuários",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      logDebug('Iniciando atualização de usuário', { userId: editingUser?.id });
      
      // 1. Prepara o objeto de atualização com os dados básicos
      const updatePayload: { [key: string]: any } = {
        display_name: editingUser.display_name,
        full_name: editingUser.display_name, // Garante consistência
        updated_at: new Date().toISOString(),
      };

      const currentRole = userRoles[editingUser.id];
      const newRole = editingUser.role;
      logDebug('Current role vs New role', { currentRole, newRole });

      // 2. Verifica se a role foi alterada e se o usuário atual tem permissão
      if (currentRole !== newRole) {
        if (isCurrentUserAdmin) {
          // Adiciona as alterações de role ao mesmo objeto
          updatePayload.role = newRole;
          updatePayload.super_admin = newRole === 'super_admin'; // Atualiza a flag booleana
        } else {
          // Se não tiver permissão, exibe um erro e interrompe
          toast({
            title: "Acesso Negado",
            description: "Você não tem permissão para alterar a função de um usuário.",
            variant: "destructive",
          });
          setSaving(false); // Libera o botão de salvar
          return; // Interrompe a execução da função
        }
      }

      // 3. Executa UMA ÚNICA chamada de update com todos os dados
      logDebug('Enviando payload de atualização unificado:', updatePayload);
      const { data, error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', editingUser.id)
        .select();

      // 4. Trata o erro (se houver)
      if (error) {
        console.error('Unified update error:', error);
        throw error;
      }

      // 5. Se a role foi alterada, atualizar também a tabela user_roles
      if (currentRole !== newRole && isCurrentUserAdmin) {
        logDebug('Atualizando user_roles', { userId: editingUser.id, newRole });
        
        // Remover role antiga da tabela user_roles (se não for super_admin)
        if (currentRole && currentRole !== 'super_admin') {
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', editingUser.id)
            .eq('role', currentRole);
        }
        
        // Adicionar nova role na tabela user_roles
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: editingUser.id,
            role: newRole,
            created_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,role'
          });
        
        if (roleError) {
          logError('Error updating user_roles', roleError);
          // Não lançar erro fatal, pois o profiles já foi atualizado
          console.warn('Aviso: Não foi possível atualizar user_roles:', roleError.message);
        } else {
          logDebug('user_roles atualizado com sucesso');
        }
      }

      await fetchUsers();
      setIsEditDialogOpen(false);
      setEditingUser(null);

      toast({
        title: "Usuário atualizado",
        description: "As alterações foram salvas com sucesso"
      });
    } catch (error: any) {
      logError('Error updating user', error);
      
      let errorMessage = 'Erro desconhecido';
      if (error.message?.includes('permission denied')) {
        errorMessage = 'Sem permissão para atualizar este usuário';
      } else if (error.message?.includes('Row Level Security')) {
        errorMessage = 'Políticas de segurança impedem a atualização';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro ao atualizar usuário",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return;

    // Verificar se o usuário atual pode excluir outros usuários
    const currentUserRole = userRoles[profile?.id || ''];
    const isCurrentUserAdmin = currentUserRole === 'admin' || isSuperAdmin();
    
    if (!isCurrentUserAdmin) {
      toast({
        title: "Acesso Negado",
        description: "Apenas administradores podem excluir outros usuários",
        variant: "destructive"
      });
      return;
    }

    try {
      // Delete from profiles table (this will cascade to auth.users if configured)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      await fetchUsers();
      
      toast({
        title: "Usuário removido",
        description: "O usuário foi removido do sistema"
      });
    } catch (error: any) {
      logError('Error deleting user', error);
      toast({
        title: "Erro",
        description: `Não foi possível remover o usuário: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const getRoleColor = (role: string, user?: UserProfile) => {
    if (user?.super_admin === true) {
      return "destructive";
    }
    
    switch (role) {
      case "admin": return "destructive";
      case "manager": return "secondary";
      case "client": return "outline";
      case "user": return "default";
      default: return "default";
    }
  };

  const getRoleLabel = (role: string, user?: UserProfile) => {
    if (user?.super_admin === true) {
      return "Super Admin";
    }
    
    switch (role) {
      case "admin": return "Administrador";
      case "manager": return "Gerente";
      case "client": return "Cliente";
      case "user": return "Usuário";
      default: return "Usuário";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  logDebug('Current user profile loaded', { hasProfile: !!profile });
  logDebug('User admin status', { isAdmin: isAdmin() });

  if (!isAdmin()) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <div className="p-4 bg-red-100 rounded-full inline-block mb-6">
                <Shield className="h-12 w-12 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Acesso Restrito</h3>
              <p className="text-muted-foreground mb-4">
                Apenas administradores podem gerenciar usuários do sistema.
              </p>
              <Alert className="text-left">
                <AlertDescription className="text-sm">
                  <div className="space-y-1">
                    <p><strong>Seu perfil:</strong> {profile?.role || 'não definido'}</p>
                    <p><strong>É admin:</strong> {isAdmin() ? 'Sim' : 'Não'}</p>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        <PageHeader
          icon={UsersIcon}
          title="Gestão de Usuários"
          description="Administre usuários do sistema"
          badges={[
            { label: `${users.length} usuários`, variant: "default" }
          ]}
          actions={
            <>
              <div className="flex bg-white/20 rounded-lg p-1">
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="gap-2"
                >
                  <Grid className="h-4 w-4" />
                  Cards
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="gap-2"
                >
                  <List className="h-4 w-4" />
                  Tabela
                </Button>
              </div>

              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    disabled={loading}
                    className="bg-white text-[#f48220] hover:bg-white/90 shadow-2xl hover:shadow-white/50 hover:scale-105 transition-all font-bold group"
                  >
                    <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform" />
                    Novo Usuário
                  </Button>
                </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-primary" />
                        Criar Novo Usuário
                      </DialogTitle>
                      <DialogDescription>
                        Preencha as informações do novo usuário. Um email de confirmação será enviado.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome completo</Label>
                        <Input
                          id="name"
                          value={newUser.name}
                          onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                          placeholder="João Silva"
                          disabled={saving}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                          placeholder="joao@tvdoutorada.com"
                          disabled={saving}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Senha temporária</Label>
                        <Input
                          id="password"
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                          placeholder="Senha mínima 6 caracteres"
                          disabled={saving}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Função</Label>
                        <Select 
                          value={newUser.role} 
                          onValueChange={(value) => setNewUser({...newUser, role: value})}
                          disabled={saving}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Selecione a função" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Usuário</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsCreateDialogOpen(false)}
                        disabled={saving}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateUser} disabled={saving} className="gap-2">
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            Criando...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Criar usuário
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
            </>
          }
        />

        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-12 space-y-8">
          {/* Enhanced Stats Cards */}
          <StatsGrid
            columns={3}
            stats={[
              {
                title: "Total de Usuários",
                value: loading ? "..." : users.length.toString(),
                subtitle: "Ativos no sistema",
                icon: UsersIcon,
                gradient: "bg-gradient-to-br from-[#f48220] to-[#e67516]",
                badge: { label: "Todos", icon: UsersIcon }
              },
              {
                title: "Administradores",
                value: loading ? "..." : Object.values(userRoles).filter(role => role === "super_admin" || role === "admin" || role === "manager" || role === "client").length.toString(),
                subtitle: "Com privilégios elevados",
                icon: Shield,
                gradient: "bg-gradient-to-br from-[#ffb87a] to-[#ffc499]",
                badge: { label: "Admins", icon: Shield }
              },
              {
                title: "Usuários Comuns",
                value: loading ? "..." : Object.values(userRoles).filter(role => role === "user").length.toString(),
                subtitle: "Acesso padrão",
                icon: User,
                gradient: "bg-gradient-to-br from-[#ff9d4d] to-[#ffb87a]",
                badge: { label: "Padrão", icon: User }
              }
            ]}
          />

          {/* Enhanced Filters */}
          <Card className="border-0 shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 bg-[#f48220]/10 rounded-lg">
                  <Filter className="w-5 h-5 text-[#f48220]" />
                </div>
                Filtros e Busca
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Buscar Usuários</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Nome ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Função</label>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as funções</SelectItem>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="client">Cliente</SelectItem>
                      <SelectItem value="manager">Gerente</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Exibindo <strong>{filteredUsers.length}</strong> de <strong>{users.length}</strong> usuários
                </span>
                <Button variant="outline" size="sm" onClick={fetchUsers} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Recarregar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="space-y-6">
            <TabsContent value="cards">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <Card key={index} className="animate-pulse">
                      <CardHeader className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-32"></div>
                            <div className="h-3 bg-gray-200 rounded w-24"></div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-16 bg-gray-200 rounded"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                      <UsersIcon className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">
                      {searchTerm || roleFilter !== 'all' ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                      {searchTerm || roleFilter !== 'all'
                        ? 'Tente ajustar os filtros ou termos de busca.'
                        : 'Comece criando o primeiro usuário do sistema.'
                      }
                    </p>
                    <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Criar Primeiro Usuário
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredUsers.map((user) => (
                    <ModernUserCard 
                      key={user.id} 
                      user={user}
                      userRole={userRoles[user.id] || 'user'}
                      onView={handleViewUser}
                      onEdit={handleEditUser}
                      onDelete={handleDeleteUser}
                      getRoleColor={getRoleColor}
                      getRoleLabel={getRoleLabel}
                      formatDate={formatDate}
                      currentProfile={profile}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="table">
              <Card className="shadow-lg">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                              Carregando usuários...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <div className="text-muted-foreground">
                              {searchTerm || roleFilter !== 'all' ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={user.avatar_url} />
                                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                    {user.display_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{user.display_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-gray-400" />
                                {user.email}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getRoleColor(userRoles[user.id], user) as any}>
                                {getRoleLabel(userRoles[user.id] || 'user', user)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {formatDate(user.created_at)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleViewUser(user)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEditUser(user)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {/* Só mostrar botão de excluir se for admin ou se for o próprio usuário */}
                                {(userRoles[user.id] === 'super_admin' || userRoles[user.id] === 'admin' || (profile && user.id === profile.id)) && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Modal de Visualização */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Detalhes do Usuário
                </DialogTitle>
              </DialogHeader>
              {selectedUser && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedUser.avatar_url} />
                      <AvatarFallback className="text-lg">
                        {selectedUser.display_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{selectedUser.display_name}</h3>
                      <p className="text-muted-foreground">{selectedUser.email}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Função</Label>
                      <div className="mt-1">
                        <Badge variant={getRoleColor(userRoles[selectedUser.id], selectedUser) as any}>
                          {getRoleLabel(userRoles[selectedUser.id] || 'user', selectedUser)}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Cadastrado em</Label>
                      <p className="text-sm mt-1">{formatDate(selectedUser.created_at)}</p>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal de Edição */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Editar Usuário
                </DialogTitle>
                <DialogDescription>
                  Altere as informações do usuário
                </DialogDescription>
              </DialogHeader>
              {editingUser && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Nome completo</Label>
                    <Input
                      id="edit-name"
                      value={editingUser.display_name || ''}
                      onChange={(e) => setEditingUser({...editingUser, display_name: e.target.value})}
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editingUser.email || ''}
                      onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                      disabled={true}
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-role">Função</Label>
                    <Select 
                      value={editingUser.role || userRoles[editingUser.id] || 'user'} 
                      onValueChange={(value) => setEditingUser({...editingUser, role: value})}
                      disabled={saving}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a função" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="client">Cliente</SelectItem>
                        <SelectItem value="manager">Gerente</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar alterações"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </DashboardLayout>
  );
};

// Componente de Card Moderno para Usuários
function ModernUserCard({ 
  user, 
  userRole, 
  onView, 
  onEdit, 
  onDelete, 
  getRoleColor, 
  getRoleLabel, 
  formatDate,
  currentProfile
}: {
  user: UserProfile;
  userRole: string;
  onView: (user: UserProfile) => void;
  onEdit: (user: UserProfile) => void;
  onDelete: (userId: string) => void;
  getRoleColor: (role: string, user?: UserProfile) => string;
  getRoleLabel: (role: string, user?: UserProfile) => string;
  formatDate: (date: string) => string;
  currentProfile: UserProfile | null;
}) {
  const roleIcon = user.super_admin || userRole === 'super_admin' || userRole === 'admin' ? Crown :
                  userRole === 'manager' ? Shield : 
                  userRole === 'client' ? Shield : User;
  
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-primary/20 hover:border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                {user.display_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors truncate">
                {user.display_name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={getRoleColor(userRole, user) as any} className="text-xs">
                  {React.createElement(roleIcon, { className: "h-3 w-3 mr-1" })}
                  {getRoleLabel(userRole, user)}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span className="truncate">{user.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Criado em {formatDate(user.created_at)}</span>
          </div>
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onView(user)}
            className="flex-1 text-xs h-8"
          >
            <Eye className="h-3 w-3 mr-1" />
            Ver
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onEdit(user)}
            className="flex-1 text-xs h-8"
          >
            <Edit className="h-3 w-3 mr-1" />
            Editar
          </Button>
          {/* Só mostrar botão de excluir se for super_admin ou se for o próprio usuário */}
          {(userRole === 'super_admin' || (currentProfile && user.id === currentProfile.id)) && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onDelete(user.id)}
              className="text-xs h-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default Users;