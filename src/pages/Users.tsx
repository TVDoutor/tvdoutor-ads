import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
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
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
  const { isAdmin, profile } = useAuth();
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
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const rolesMap: Record<string, string> = {};
      roles?.forEach(role => {
        rolesMap[role.user_id] = role.role;
      });

      setUsers(profiles || []);
      setUserRoles(rolesMap);
      
    } catch (error: any) {
      logError('Error fetching users', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários.",
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
                       (roleFilter === 'super_admin' && user.super_admin);

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
            full_name: newUser.name,
            // REGRA DE SEGURANÇA: A role de um novo usuário cadastrado
            // publicamente DEVE ser sempre 'user'. Nunca deixe o usuário escolher.
            role: 'user',
          }
        }
      });

      // Se a chamada signUp retornar um erro, nós o lançamos para o bloco CATCH
      if (authError) {
        throw authError;
      }

      if (authData.user) {
        logDebug('Usuário criado no Auth', { userId: authData.user.id });
        
        // Aguardar o trigger criar o perfil automaticamente
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verificar se o perfil foi criado pelo trigger
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name, display_name, role')
          .eq('id', authData.user.id)
          .single();

        if (profileError || !profile) {
          console.log('Trigger não criou perfil, criando manualmente...');
          const { error: manualProfileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: newUser.email,
              full_name: newUser.name,
              display_name: newUser.name,
              role: 'user'
            });

          if (manualProfileError) {
            console.error('Erro ao criar perfil manualmente:', manualProfileError);
            throw new Error(`Erro ao criar perfil: ${manualProfileError.message}`);
          }
          console.log('Perfil criado manualmente');
        }

        // Nota: Roles são gerenciadas através da tabela profiles.role
        // O trigger handle_new_user já cria o perfil com role 'user'
        // Se necessário, a role pode ser atualizada posteriormente através da edição do usuário

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

    setSaving(true);
    try {
      logDebug('Iniciando atualização de usuário', { userId: editingUser?.id });
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: editingUser.display_name,
          full_name: editingUser.display_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id)
        .select();

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw profileError;
      }

      const currentRole = userRoles[editingUser.id];
      logDebug('Current role vs New role', { currentRole, newRole: editingUser.role });
      
      if (currentRole !== editingUser.role) {
        const { data: updateData, error: updateError } = await supabase
          .from('user_roles')
          .update({ role: editingUser.role as 'user' | 'admin' | 'super_admin' })
          .eq('user_id', editingUser.id)
          .select();

        console.log('Resultado update role:', { updateData, updateError });

        if (updateError) {
          console.error('Role update error:', updateError);
          console.log('Tentando delete + insert...');
          
          const { error: deleteError } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', editingUser.id);

          if (deleteError) {
            console.error('Delete role error:', deleteError);
          }

          const { data: insertData, error: insertError } = await supabase
            .from('user_roles')
            .insert({
              user_id: editingUser.id,
              role: editingUser.role as 'user' | 'admin' | 'super_admin'
            })
            .select();

          console.log('Resultado insert role:', { insertData, insertError });

          if (insertError) {
            console.error('Insert role error:', insertError);
            throw insertError;
          }
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

    try {
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

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
      case "super_admin": return "destructive";
      case "admin": return "secondary";
      default: return "default";
    }
  };

  const getRoleLabel = (role: string, user?: UserProfile) => {
    if (user?.super_admin === true) {
      return "Super Admin";
    }
    
    switch (role) {
      case "super_admin": return "Super Admin";
      case "admin": return "Admin";
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <UsersIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Gestão de Usuários</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Administre usuários do sistema • {users.length} usuários cadastrados
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex bg-gray-100 rounded-lg p-1">
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
                    <Button className="gap-2 shadow-sm" disabled={loading}>
                      <Plus className="h-4 w-4" />
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
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">Total de Usuários</p>
                    <p className="text-3xl font-bold text-blue-900">{loading ? "..." : users.length}</p>
                    <p className="text-xs text-blue-700">Ativos no sistema</p>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-lg">
                    <UsersIcon className="h-8 w-8 text-blue-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-800">Administradores</p>
                    <p className="text-3xl font-bold text-purple-900">
                      {loading ? "..." : Object.values(userRoles).filter(role => role === "admin" || role === "super_admin").length}
                    </p>
                    <p className="text-xs text-purple-700">Com privilégios elevados</p>
                  </div>
                  <div className="p-3 bg-purple-200 rounded-lg">
                    <Shield className="h-8 w-8 text-purple-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">Usuários Comuns</p>
                    <p className="text-3xl font-bold text-green-900">
                      {loading ? "..." : Object.values(userRoles).filter(role => role === "user").length}
                    </p>
                    <p className="text-xs text-green-700">Acesso padrão</p>
                  </div>
                  <div className="p-3 bg-green-200 rounded-lg">
                    <User className="h-8 w-8 text-green-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Filters */}
          <Card className="bg-gradient-to-r from-gray-50/50 to-blue-50/50 border-l-4 border-l-primary">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary" />
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
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
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
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
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
  formatDate 
}: {
  user: UserProfile;
  userRole: string;
  onView: (user: UserProfile) => void;
  onEdit: (user: UserProfile) => void;
  onDelete: (userId: string) => void;
  getRoleColor: (role: string, user?: UserProfile) => string;
  getRoleLabel: (role: string, user?: UserProfile) => string;
  formatDate: (date: string) => string;
}) {
  const roleIcon = user.super_admin || userRole === 'super_admin' ? Crown :
                  userRole === 'admin' ? Shield : User;
  
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
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onDelete(user.id)}
            className="text-xs h-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default Users;