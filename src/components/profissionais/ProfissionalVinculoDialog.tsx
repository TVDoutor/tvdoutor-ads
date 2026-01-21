/**
 * Diálogo para Gerenciar Vínculos Profissional-Venue
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  Building2,
  Plus,
  Trash2,
  RefreshCw,
  MapPin
} from 'lucide-react';
import {
  useProfissionalVenues,
  useVincularProfissionalVenue,
  useDesvincularProfissionalVenue,
  type ProfissionalSaude
} from '@/hooks/useProfissionaisSaude';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProfissionalVinculoDialogProps {
  profissional?: ProfissionalSaude | null;
  open: boolean;
  onClose: () => void;
}

export function ProfissionalVinculoDialog({ profissional, open, onClose }: ProfissionalVinculoDialogProps) {
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [cargoNaUnidade, setCargoNaUnidade] = useState('');
  const [vinculoToDelete, setVinculoToDelete] = useState<string | null>(null);

  const { data: vinculos, isLoading: loadingVinculos } = useProfissionalVenues(profissional?.id || null);
  const vincularMutation = useVincularProfissionalVenue();
  const desvincularMutation = useDesvincularProfissionalVenue();

  // Buscar todos os venues
  const { data: venues, isLoading: loadingVenues, error: venuesError } = useQuery({
    queryKey: ['venues'],
    queryFn: async () => {
      console.log('🔍 Buscando venues...');
      const { data, error } = await supabase
        .from('venues')
        .select('id, name, cidade, state')
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar venues:', error);
        throw error;
      }
      
      console.log('✅ Venues carregados:', data?.length || 0, 'registros');
      console.log('📋 Venues:', data);
      return data || [];
    }
  });

  // Debug: Log dos venues e vínculos
  console.log('🔍 Debug Venues:', {
    venues: venues?.length || 0,
    vinculos: vinculos?.length || 0,
    loadingVenues,
    loadingVinculos,
    venuesError: venuesError?.message
  });

  const handleVincular = async () => {
    if (!profissional || !selectedVenueId) return;

    await vincularMutation.mutateAsync({
      profissional_id: profissional.id,
      venue_id: parseInt(selectedVenueId),
      cargo_na_unidade: cargoNaUnidade || null
    });

    setSelectedVenueId('');
    setCargoNaUnidade('');
  };

  const handleDesvincular = async () => {
    if (!vinculoToDelete) return;

    await desvincularMutation.mutateAsync(vinculoToDelete);
    setVinculoToDelete(null);
  };

  // Filtrar venues já vinculados
  const venuesDisponiveis = venues?.filter(
    venue => !vinculos?.some(v => v.venue_id === venue.id)
  );

  // Debug: Log dos venues disponíveis após filtro
  console.log('🎯 Venues Disponíveis após filtro:', {
    total: venues?.length || 0,
    vinculados: vinculos?.length || 0,
    disponiveis: venuesDisponiveis?.length || 0,
    venuesDisponiveis
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Gerenciar Vínculos - {profissional?.nome}
            </DialogTitle>
          </DialogHeader>

          {/* Adicionar Novo Vínculo */}
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <h3 className="font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Novo Vínculo
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unidade de Saúde *</Label>
                <Select
                  value={selectedVenueId}
                  onValueChange={setSelectedVenueId}
                  disabled={loadingVenues}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {venuesDisponiveis?.map(venue => (
                      <SelectItem key={venue.id} value={venue.id.toString()}>
                        {venue.name} - {venue.cidade}/{venue.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cargo na Unidade</Label>
                <Input
                  value={cargoNaUnidade}
                  onChange={(e) => setCargoNaUnidade(e.target.value)}
                  placeholder="Ex: Diretor Médico"
                />
              </div>
            </div>

            <Button
              onClick={handleVincular}
              disabled={!selectedVenueId || vincularMutation.isPending}
              className="w-full"
            >
              {vincularMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Vinculando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Vínculo
                </>
              )}
            </Button>
          </div>

          {/* Lista de Vínculos */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Vínculos Ativos ({vinculos?.length || 0})
            </h3>

            {loadingVinculos ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : vinculos && vinculos.length > 0 ? (
              <div className="space-y-3">
                {vinculos.map((vinculo: any) => (
                  <div
                    key={vinculo.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <h4 className="font-medium">{vinculo.venues?.name}</h4>
                          <Badge variant="outline">
                            {vinculo.venues?.cidade}/{vinculo.venues?.state}
                          </Badge>
                        </div>

                        {vinculo.cargo_na_unidade && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Cargo:</span> {vinculo.cargo_na_unidade}
                          </p>
                        )}

                        {vinculo.created_at && (
                          <p className="text-xs text-gray-400 mt-1">
                            Vinculado em: {new Date(vinculo.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setVinculoToDelete(vinculo.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum vínculo cadastrado</p>
                <p className="text-sm mt-1">Adicione uma unidade de saúde acima</p>
              </div>
            )}
          </div>

          {/* Botão Fechar */}
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!vinculoToDelete} onOpenChange={() => setVinculoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este vínculo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDesvincular}
              className="bg-red-600 hover:bg-red-700"
            >
              Remover Vínculo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
