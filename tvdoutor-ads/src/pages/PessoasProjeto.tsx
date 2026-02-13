// @ts-nocheck
import { useState, useEffect } from 'react';
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  Plus, 
  Edit, 
  Trash2, 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Building, 
  Users as UsersIcon,
  Shield,
  UserPlus,
  Search,
  Filter,
  Grid,
  List,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { PessoasProjetoService } from '@/lib/pessoas-projeto-service';
import { listarAgencias } from '@/lib/agencia-service';
import type { PessoaProjeto, PessoaProjetoInsert, PessoaProjetoUpdate } from '@/types/agencia';
import type { Agencia } from '@/types/agencia';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function PessoasProjeto() {
  const { user } = useAuth();
  const [pessoas, setPessoas] = useState<PessoaProjeto[]>([]);
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPessoa, setEditingPessoa] = useState<PessoaProjeto | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [agenciaFilter, setAgenciaFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [filteredPessoas, setFilteredPessoas] = useState<PessoaProjeto[]>([]);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cargo: '',
    agencia_id: ''
  });

  useEffect(() => {
    loadData();
    checkAdminStatus();
  }, []);

  useEffect(() => {
    filterPessoas();
  }, [pessoas, searchTerm, agenciaFilter]);

  const filterPessoas = () => {
    let filtered = pessoas;

    // Text search
    if (searchTerm.trim()) {
      filtered = filtered.filter(pessoa =>
        pessoa.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pessoa.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pessoa.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Agency filter
    if (agenciaFilter !== 'all') {
      if (agenciaFilter === 'null') {
        filtered = filtered.filter(pessoa => !pessoa.agencia_id);
      } else {
        filtered = filtered.filter(pessoa => pessoa.agencia_id === agenciaFilter);
      }
    }

    setFilteredPessoas(filtered);
  };

  const checkAdminStatus = async () => {
    try {
      // Verificar se o usuário é administrador
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();
      
      setIsAdmin(profile?.role === 'admin' || profile?.role === 'super_admin');
    } catch (error) {
      console.error('Erro ao verificar status de admin:', error);
      setIsAdmin(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [pessoasData, agenciasData] = await Promise.all([
        PessoasProjetoService.listar(),
        listarAgencias()
      ]);
      
      setPessoas(pessoasData);
      setAgencias(agenciasData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdmin) {
      toast.error('Apenas administradores podem gerenciar pessoas do projeto');
      return;
    }

    try {
      const pessoaData: PessoaProjetoInsert = {
        nome: formData.nome.trim(),
        email: formData.email.trim() || null,
        telefone: formData.telefone.trim() || null,
        cargo: formData.cargo.trim() || null,
        agencia_id: formData.agencia_id === "null" ? null : formData.agencia_id || null
      };

      if (editingPessoa) {
        await PessoasProjetoService.atualizar(editingPessoa.id, pessoaData);
        toast.success('Pessoa atualizada com sucesso!');
      } else {
        await PessoasProjetoService.criar(pessoaData);
        toast.success('Pessoa criada com sucesso!');
      }

      setModalOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar pessoa:', error);
      toast.error(`Erro ao salvar pessoa: ${error.message}`);
    }
  };

  const handleDelete = async (pessoa: PessoaProjeto) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem remover pessoas do projeto');
      return;
    }

    if (!confirm(`Tem certeza que deseja remover ${pessoa.nome}?`)) {
      return;
    }

    try {
      await PessoasProjetoService.remover(pessoa.id);
      toast.success('Pessoa removida com sucesso!');
      loadData();
    } catch (error: any) {
      console.error('Erro ao remover pessoa:', error);
      toast.error(`Erro ao remover pessoa: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      cargo: '',
      agencia_id: 'null'
    });
    setEditingPessoa(null);
  };

  const openEditModal = (pessoa: PessoaProjeto) => {
    setEditingPessoa(pessoa);
    setFormData({
      nome: pessoa.nome,
      email: pessoa.email || '',
      telefone: pessoa.telefone || '',
      cargo: pessoa.cargo || '',
      agencia_id: pessoa.agencia_id || 'null'
    });
    setModalOpen(true);
  };

  const getAgenciaNome = (agenciaId: string | null) => {
    if (!agenciaId) return 'Não vinculada';
    const agencia = agencias.find(a => a.id === agenciaId);
    return agencia?.nome_agencia || 'Agência não encontrada';
  };

  // Se não for admin, mostrar mensagem de acesso negado
  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <div className="p-4 bg-red-100 rounded-full inline-block mb-6">
                <Shield className="h-12 w-12 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Acesso Restrito</h3>
              <p className="text-muted-foreground">
                Apenas administradores podem gerenciar pessoas do projeto.
              </p>
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
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Pessoas do Projeto</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Gerencie contatos responsáveis por projetos • {pessoas.length} pessoas cadastradas
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
                
                <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm} className="gap-2 shadow-sm">
                      <Plus className="h-4 w-4" />
                      Nova Pessoa
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-primary" />
                        {editingPessoa ? 'Editar Pessoa' : 'Nova Pessoa'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Informações Pessoais
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="nome">Nome Completo *</Label>
                            <Input
                              id="nome"
                              value={formData.nome}
                              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                              required
                              placeholder="Nome completo"
                              className="bg-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cargo">Cargo/Função</Label>
                            <Input
                              id="cargo"
                              value={formData.cargo}
                              onChange={(e) => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
                              placeholder="Ex: Gerente de Projetos"
                              className="bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Contato
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="email@exemplo.com"
                              className="bg-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="telefone">Telefone</Label>
                            <Input
                              id="telefone"
                              value={formData.telefone}
                              onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                              placeholder="(11) 99999-9999"
                              className="bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          Associação
                        </h4>
                        <div className="space-y-2">
                          <Label htmlFor="agencia_id">Agência (Opcional)</Label>
                          <Select
                            value={formData.agencia_id}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, agencia_id: value }))}
                          >
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Selecione uma agência (opcional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="null">Não vinculada</SelectItem>
                              {agencias.map(agencia => (
                                <SelectItem key={agencia.id} value={agencia.id}>
                                  {agencia.nome_agencia}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 pt-6 border-t">
                        <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" className="gap-2">
                          {editingPessoa ? (
                            <>
                              <Edit className="h-4 w-4" />
                              Atualizar
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              Criar
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">Total de Pessoas</p>
                    <p className="text-3xl font-bold text-blue-900">{pessoas.length}</p>
                    <p className="text-xs text-blue-700">Cadastradas no sistema</p>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-lg">
                    <UsersIcon className="h-8 w-8 text-blue-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">Com Agência</p>
                    <p className="text-3xl font-bold text-green-900">
                      {pessoas.filter(p => p.agencia_id).length}
                    </p>
                    <p className="text-xs text-green-700">Vinculadas à agências</p>
                  </div>
                  <div className="p-3 bg-green-200 rounded-lg">
                    <Building className="h-8 w-8 text-green-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-800">Independentes</p>
                    <p className="text-3xl font-bold text-purple-900">
                      {pessoas.filter(p => !p.agencia_id).length}
                    </p>
                    <p className="text-xs text-purple-700">Sem vinculação</p>
                  </div>
                  <div className="p-3 bg-purple-200 rounded-lg">
                    <UserPlus className="h-8 w-8 text-purple-700" />
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
                  <label className="text-sm font-medium text-gray-700">Buscar Pessoas</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Nome, email, cargo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Agência</label>
                  <Select value={agenciaFilter} onValueChange={setAgenciaFilter}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as agências</SelectItem>
                      <SelectItem value="null">Sem agência</SelectItem>
                      {agencias.map(agencia => (
                        <SelectItem key={agencia.id} value={agencia.id}>
                          {agencia.nome_agencia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Exibindo <strong>{filteredPessoas.length}</strong> de <strong>{pessoas.length}</strong> pessoas
                </span>
                <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
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
                        <div className="h-20 bg-gray-200 rounded"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredPessoas.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                      <UsersIcon className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">
                      {pessoas.length === 0 ? 'Nenhuma pessoa cadastrada' : 'Nenhum resultado encontrado'}
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                      {pessoas.length === 0 
                        ? 'Comece adicionando pessoas que podem ser responsáveis por projetos.'
                        : 'Tente ajustar os filtros ou termos de busca.'
                      }
                    </p>
                    <Button onClick={() => setModalOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      {pessoas.length === 0 ? 'Adicionar Primeira Pessoa' : 'Nova Pessoa'}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredPessoas.map((pessoa) => (
                    <ModernPersonCard 
                      key={pessoa.id} 
                      pessoa={pessoa} 
                      onEdit={openEditModal}
                      onDelete={handleDelete}
                      getAgenciaNome={getAgenciaNome}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="table">
              <Card className="shadow-lg">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b bg-gray-50/50">
                        <tr>
                          <th className="text-left p-4 font-medium text-gray-900">Pessoa</th>
                          <th className="text-left p-4 font-medium text-gray-900">Cargo</th>
                          <th className="text-left p-4 font-medium text-gray-900">Contato</th>
                          <th className="text-left p-4 font-medium text-gray-900">Agência</th>
                          <th className="text-left p-4 font-medium text-gray-900">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredPessoas.map((pessoa) => (
                          <tr key={pessoa.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                    {pessoa.nome.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium text-gray-900">{pessoa.nome}</div>
                                  <div className="text-sm text-gray-500">ID: {pessoa.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-sm text-gray-600">
                              {pessoa.cargo || '—'}
                            </td>
                            <td className="p-4">
                              <div className="space-y-1">
                                {pessoa.email && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Mail className="h-3 w-3" />
                                    <span>{pessoa.email}</span>
                                  </div>
                                )}
                                {pessoa.telefone && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone className="h-3 w-3" />
                                    <span>{pessoa.telefone}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant={pessoa.agencia_id ? "default" : "secondary"} className="text-xs">
                                {getAgenciaNome(pessoa.agencia_id)}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => openEditModal(pessoa)}
                                  className="gap-1"
                                >
                                  <Edit className="h-3 w-3" />
                                  Editar
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDelete(pessoa)}
                                  className="gap-1 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Remover
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );

  // Componente de Card Moderno para Pessoas
  function ModernPersonCard({ 
    pessoa, 
    onEdit, 
    onDelete, 
    getAgenciaNome 
  }: {
    pessoa: PessoaProjeto;
    onEdit: (pessoa: PessoaProjeto) => void;
    onDelete: (pessoa: PessoaProjeto) => void;
    getAgenciaNome: (agenciaId: string | null) => string;
  }) {
    return (
      <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-primary/20 hover:border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                  {pessoa.nome.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors truncate">
                  {pessoa.nome}
                </CardTitle>
                <div className="flex flex-col gap-1 mt-1">
                  {pessoa.cargo && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Briefcase className="h-3 w-3" />
                      <span className="truncate">{pessoa.cargo}</span>
                    </div>
                  )}
                  <Badge variant={pessoa.agencia_id ? "default" : "secondary"} className="text-xs w-fit">
                    {getAgenciaNome(pessoa.agencia_id)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {pessoa.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="truncate">{pessoa.email}</span>
              </div>
            )}
            {pessoa.telefone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{pessoa.telefone}</span>
              </div>
            )}
            {!pessoa.email && !pessoa.telefone && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <AlertCircle className="h-4 w-4" />
                <span>Nenhum contato cadastrado</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onEdit(pessoa)}
              className="flex-1 text-xs h-8"
            >
              <Edit className="h-3 w-3 mr-1" />
              Editar
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onDelete(pessoa)}
              className="text-xs h-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
}
