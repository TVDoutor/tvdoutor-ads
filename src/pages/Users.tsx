import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Users as UsersIcon, Plus, Search, Edit, Trash2, UserPlus, Eye, Shield } from "lucide-react";
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

// Interface for user roles
// interface UserRole {
//   user_id: string;
//   role: 'user' | 'admin' | 'super_admin';
// }

const Users = () => {
  const { toast } = useToast();
  const { isAdmin, profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
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

  // Carregar usuários do Supabase
  useEffect(() => {
    const adminStatus = isAdmin();
    if (adminStatus && !initialized) {
      setInitialized(true);
      fetchUsers();
    } else if (!adminStatus) {
      setLoading(false);
    }
  }, [profile?.role, initialized]); // Depender do role do perfil e estado de inicialização

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Buscar perfis de usuários
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Buscar roles dos usuários
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Mapear roles por usuário
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

  const filteredUsers = users.filter(user => 
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      
      // 1. APENAS criar usuário no Supabase Auth - deixar trigger fazer o resto
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.name,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        logDebug('Usuário criado no Auth', { userId: 'user_created' });
        
        // 2. Aguardar trigger processar (2 segundos para ser seguro)
        logDebug('Aguardando trigger processar...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 3. Verificar se trigger criou perfil e role
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, full_name, display_name, role')
          .eq('id', authData.user.id)
          .single();

        const { data: role } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .eq('user_id', authData.user.id)
          .single();

        console.log('Verificação pós-trigger:', { profile, role });

        // 4. Se trigger não criou perfil, criar manualmente
        if (!profile) {
          console.log('Trigger não criou perfil, criando manualmente...');
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: newUser.email,
              full_name: newUser.name,
              display_name: newUser.name,
              role: 'user'
            });

          if (profileError) {
            console.error('Erro ao criar perfil manualmente:', profileError);
            throw new Error(`Erro ao criar perfil: ${profileError.message}`);
          }
          console.log('Perfil criado manualmente');
        }

        // 5. Se trigger não criou role OU role é diferente do solicitado, ajustar
        if (!role || role.role !== newUser.role) {
          console.log('Ajustando role do usuário...');
          
          if (role && role.role !== newUser.role) {
            // Atualizar role existente
            const { error: updateError } = await supabase
              .from('user_roles')
              .update({ role: newUser.role as 'user' | 'admin' | 'super_admin' })
              .eq('user_id', authData.user.id);
              
            if (updateError) {
              console.error('Erro ao atualizar role:', updateError);
              throw new Error(`Erro ao atualizar role: ${updateError.message}`);
            }
            logDebug('Role atualizado para:', { role: newUser.role });
          } else {
            // Criar role
            const { error: roleError } = await supabase
              .from('user_roles')
              .insert({
                user_id: authData.user.id,
                role: newUser.role as 'user' | 'admin' | 'super_admin'
              });

            if (roleError) {
              console.error('Erro ao criar role:', roleError);
              throw new Error(`Erro ao criar role: ${roleError.message}`);
            }
            logDebug('Role criado:', { role: newUser.role });
          }
        }

        // 6. Finalizar
        await fetchUsers(); // Recarregar lista
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
      
      // Atualizar perfil com mais campos
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: editingUser.display_name,
          full_name: editingUser.display_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id)
        .select();

      console.log('Resultado update profile:', { profileData, profileError });

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw profileError;
      }

      // Atualizar role se necessário
      const currentRole = userRoles[editingUser.id];
      logDebug('Current role vs New role', { currentRole, newRole: editingUser.role });
      
      if (currentRole !== editingUser.role) {
        // Primeiro, tentar atualizar o role existente
        const { data: updateData, error: updateError } = await supabase
          .from('user_roles')
          .update({ role: editingUser.role as 'user' | 'admin' | 'super_admin' })
          .eq('user_id', editingUser.id)
          .select();

        console.log('Resultado update role:', { updateData, updateError });

        if (updateError) {
          console.error('Role update error:', updateError);
          // Se falhar, tentar o método antigo (delete + insert)
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

      await fetchUsers(); // Recarregar lista
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
      // Remover roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Remover perfil
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      await fetchUsers(); // Recarregar lista
      
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
    // Verificar primeiro se é super admin (campo booleano)
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
    // Verificar primeiro se é super admin (campo booleano)
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

  // Debug: mostrar informações do usuário atual
  logDebug('Current user profile loaded', { hasProfile: !!profile });
  logDebug('User admin status', { isAdmin: isAdmin() });

  // Verificar se usuário atual tem permissão para gerenciar usuários
  if (!isAdmin()) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md">
              <CardContent className="p-6 text-center">
                <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
                <p className="text-muted-foreground mb-4">
                  Apenas administradores podem gerenciar usuários.
                </p>
                <div className="text-xs text-muted-foreground mt-4 p-2 bg-muted rounded">
                  <p>Seu role atual: {profile?.role || 'não definido'}</p>
                  <p>É admin: {isAdmin() ? 'Sim' : 'Não'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UsersIcon className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Usuários</h1>
              <p className="text-muted-foreground">Gerencie os usuários da plataforma</p>
            </div>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" disabled={loading}>
                <Plus className="h-4 w-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar novo usuário</DialogTitle>
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Função</Label>
                  <Select 
                    value={newUser.role} 
                    onValueChange={(value) => setNewUser({...newUser, role: value})}
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
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreateUser} disabled={saving}>
                  {saving ? "Criando..." : "Criar usuário"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de usuários</p>
                  <p className="text-3xl font-bold">{loading ? "..." : users.length}</p>
                </div>
                <UsersIcon className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Administradores</p>
                  <p className="text-3xl font-bold text-secondary">
                    {loading ? "..." : Object.values(userRoles).filter(role => role === "admin" || role === "super_admin").length}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Usuários comuns</p>
                  <p className="text-3xl font-bold text-primary">
                    {loading ? "..." : Object.values(userRoles).filter(role => role === "user").length}
                  </p>
                </div>
                <UserPlus className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lista de usuários</CardTitle>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
                        {searchTerm ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>
                              {user.display_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.display_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleColor(userRoles[user.id], user) as any}>
                          {getRoleLabel(userRoles[user.id] || 'user', user)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(user.created_at)}
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
    </DashboardLayout>
  );
};

export default Users;