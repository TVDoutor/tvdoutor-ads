/**
 * Página de Gestão de Profissionais da Saúde
 * 
 * Permite cadastrar, editar, listar e vincular profissionais com venues
 */

import React, { useState } from 'react';
import {
  useProfissionaisSaude,
  useDeleteProfissional,
  type ProfissionalSaude
} from '@/hooks/useProfissionaisSaude';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Building2,
  UserCheck,
  RefreshCw,
  AlertCircle,
  Stethoscope
} from 'lucide-react';
import { ProfissionalFormDialog } from '@/components/profissionais/ProfissionalFormDialog';
import { ProfissionalVinculoDialog } from '@/components/profissionais/ProfissionalVinculoDialog';
import { DashboardLayout } from '@/components/DashboardLayout';

export default function ProfissionaisSaude() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfissional, setSelectedProfissional] = useState<ProfissionalSaude | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isVinculoOpen, setIsVinculoOpen] = useState(false);
  const [profissionalToDelete, setProfissionalToDelete] = useState<string | null>(null);

  const { data: profissionais, isLoading, error, refetch } = useProfissionaisSaude();
  const deleteProfissional = useDeleteProfissional();

  // Filtrar profissionais por busca
  const profissionaisFiltrados = profissionais?.filter(prof =>
    prof.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prof.registro_profissional.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prof.tipo_profissional.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (profissional: ProfissionalSaude) => {
    setSelectedProfissional(profissional);
    setIsFormOpen(true);
  };

  const handleVincular = (profissional: ProfissionalSaude) => {
    setSelectedProfissional(profissional);
    setIsVinculoOpen(true);
  };

  const handleDelete = async () => {
    if (!profissionalToDelete) return;
    
    await deleteProfissional.mutateAsync(profissionalToDelete);
    setProfissionalToDelete(null);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedProfissional(null);
  };

  const handleCloseVinculo = () => {
    setIsVinculoOpen(false);
    setSelectedProfissional(null);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 p-6">
          <Card>
            <CardContent className="flex items-center justify-center p-12">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Carregando profissionais...</span>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 p-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Erro ao carregar profissionais</span>
              </div>
              <p className="text-red-600 text-sm mb-4">{(error as Error).message}</p>
              <Button onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Stethoscope className="h-8 w-8 text-blue-600" />
            Profissionais da Saúde
          </h1>
          <p className="text-gray-600 mt-2">
            Gerencie os profissionais da saúde e seus vínculos com unidades de saúde
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total de Profissionais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{profissionais?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {profissionais?.filter(p => p.ativo).length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Tipos de Profissionais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {new Set(profissionais?.map(p => p.tipo_profissional)).size || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, registro ou tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Button
                onClick={() => {
                  setSelectedProfissional(null);
                  setIsFormOpen(true);
                }}
                className="w-full md:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Profissional
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Profissionais */}
        <Card>
          <CardHeader>
            <CardTitle>
              Profissionais Cadastrados ({profissionaisFiltrados?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profissionaisFiltrados && profissionaisFiltrados.length > 0 ? (
              <div className="space-y-4">
                {profissionaisFiltrados.map((profissional) => (
                  <div
                    key={profissional.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{profissional.nome}</h3>
                          {profissional.ativo ? (
                            <Badge variant="default" className="bg-green-500">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600">Tipo:</span>{' '}
                            <span className="font-medium">{profissional.tipo_profissional}</span>
                          </div>

                          <div>
                            <span className="text-gray-600">Registro:</span>{' '}
                            <span className="font-medium">
                              {profissional.tipo_registro} {profissional.registro_profissional}
                            </span>
                          </div>

                          {profissional.email && (
                            <div>
                              <span className="text-gray-600">Email:</span>{' '}
                              <span className="font-medium">{profissional.email}</span>
                            </div>
                          )}

                          {profissional.telefone && (
                            <div>
                              <span className="text-gray-600">Telefone:</span>{' '}
                              <span className="font-medium">{profissional.telefone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(profissional)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleVincular(profissional)}>
                            <Building2 className="h-4 w-4 mr-2" />
                            Gerenciar Vínculos
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setProfissionalToDelete(profissional.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhum profissional encontrado</p>
                {searchTerm && (
                  <p className="text-sm mt-1">Tente ajustar sua busca</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogos */}
      <ProfissionalFormDialog
        profissional={selectedProfissional}
        open={isFormOpen}
        onClose={handleCloseForm}
      />

      <ProfissionalVinculoDialog
        profissional={selectedProfissional}
        open={isVinculoOpen}
        onClose={handleCloseVinculo}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!profissionalToDelete} onOpenChange={() => setProfissionalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este profissional? Esta ação não pode ser desfeita.
              Todos os vínculos com venues também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
