/**
 * Componente Popover para exibir vínculos de um profissional
 */

import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Briefcase, RefreshCw } from 'lucide-react';
import { useProfissionalVenues } from '@/hooks/useProfissionaisSaude';

interface VinculosPopoverProps {
  profissionalId: string;
  profissionalNome: string;
}

export function VinculosPopover({ profissionalId, profissionalNome }: VinculosPopoverProps) {
  const { data: vinculos, isLoading, error } = useProfissionalVenues(profissionalId);

  const totalVinculos = vinculos?.length || 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 hover:bg-blue-50 hover:border-blue-300 transition-colors"
        >
          <Building2 className="h-4 w-4" />
          <span className="font-semibold">{totalVinculos}</span>
          <span className="text-xs text-gray-600">
            {totalVinculos === 1 ? 'vínculo' : 'vínculos'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Building2 className="h-5 w-5 text-blue-600" />
            <div>
              <h4 className="font-semibold text-sm">Vínculos de {profissionalNome}</h4>
              <p className="text-xs text-gray-600">
                {totalVinculos} {totalVinculos === 1 ? 'unidade vinculada' : 'unidades vinculadas'}
              </p>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-600">Carregando...</span>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 py-2">
              Erro ao carregar vínculos
            </div>
          )}

          {!isLoading && !error && totalVinculos === 0 && (
            <div className="text-center py-4 text-sm text-gray-500">
              Nenhum vínculo cadastrado
            </div>
          )}

          {!isLoading && !error && vinculos && vinculos.length > 0 && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {vinculos.map((vinculo) => (
                <div
                  key={vinculo.id}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-sm truncate">
                        {vinculo.venues?.name || 'Venue sem nome'}
                      </h5>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {vinculo.venues?.cidade}/{vinculo.venues?.state}
                        </Badge>
                      </div>
                      {vinculo.cargo_na_unidade && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                          <Briefcase className="h-3 w-3" />
                          <span>{vinculo.cargo_na_unidade}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
