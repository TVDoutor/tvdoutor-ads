/**
 * Exemplo de componente usando o hook useCorpoClinico
 * 
 * Este é um exemplo completo mostrando como usar a view de forma tipada
 */

import React, { useState } from 'react';
import { useCorpoClinico, useEstatisticasCorpoClinico } from '@/hooks/useCorpoClinico';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, Users, Stethoscope, MapPin, Building } from 'lucide-react';

export function CorpoClinicoExample() {
  const [filtros, setFiltros] = useState({
    venueId: undefined as number | undefined,
    tipoProfissional: undefined as string | undefined,
    cidade: undefined as string | undefined,
  });

  const { data: profissionais, isLoading, error, refetch } = useCorpoClinico(filtros);
  const { data: stats } = useEstatisticasCorpoClinico(filtros.venueId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Carregando corpo clínico...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Erro ao carregar dados</span>
          </div>
          <p className="text-red-600 text-sm mb-4">{error.message}</p>
          <button 
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2 inline" />
            Tentar Novamente
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Profissionais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalProfissionais}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Especialidades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalEspecialidades}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Building className="h-4 w-4" />
                Unidades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalVenues}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Cidades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalCidades}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Distribuição por Tipo */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Tipo de Profissional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(stats.porTipo).map(([tipo, quantidade]) => (
                <div key={tipo} className="p-4 border rounded-lg">
                  <div className="text-sm text-gray-600">{tipo}</div>
                  <div className="text-2xl font-bold text-blue-600">{quantidade}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Profissional</label>
              <Select
                value={filtros.tipoProfissional || 'todos'}
                onValueChange={(value) => setFiltros({ 
                  ...filtros, 
                  tipoProfissional: value === 'todos' ? undefined : value 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {stats && Object.keys(stats.porTipo).map(tipo => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Cidade</label>
              <Select
                value={filtros.cidade || 'todas'}
                onValueChange={(value) => setFiltros({ 
                  ...filtros, 
                  cidade: value === 'todas' ? undefined : value 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as cidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {stats?.cidades.map(cidade => (
                    <SelectItem key={cidade} value={cidade}>{cidade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">ID do Venue</label>
              <Input
                type="number"
                placeholder="Digite o ID"
                value={filtros.venueId || ''}
                onChange={(e) => setFiltros({ 
                  ...filtros, 
                  venueId: e.target.value ? parseInt(e.target.value) : undefined 
                })}
              />
            </div>
          </div>

          <button
            onClick={() => setFiltros({ 
              venueId: undefined, 
              tipoProfissional: undefined,
              cidade: undefined 
            })}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
          >
            Limpar Filtros
          </button>
        </CardContent>
      </Card>

      {/* Lista de Profissionais */}
      <Card>
        <CardHeader>
          <CardTitle>Profissionais ({profissionais?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {profissionais && profissionais.length > 0 ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {profissionais.map((profissional) => (
                <div 
                  key={profissional.profissional_id} 
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {profissional.profissional_nome}
                      </h3>
                      <Badge variant="outline" className="mt-1">
                        {profissional.tipo_profissional}
                      </Badge>
                    </div>
                    {profissional.registro_profissional && (
                      <div className="text-sm text-gray-600 text-right">
                        <div className="font-medium">{profissional.tipo_registro}</div>
                        <div>{profissional.registro_profissional}</div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {profissional.cargo_na_unidade && (
                      <div>
                        <span className="text-gray-600">Cargo:</span>{' '}
                        <span className="font-medium">{profissional.cargo_na_unidade}</span>
                      </div>
                    )}

                    {profissional.venue_nome && (
                      <div>
                        <span className="text-gray-600">Unidade:</span>{' '}
                        <span className="font-medium">{profissional.venue_nome}</span>
                      </div>
                    )}

                    {profissional.venue_cidade && (
                      <div>
                        <span className="text-gray-600">Cidade:</span>{' '}
                        <span className="font-medium">{profissional.venue_cidade}</span>
                      </div>
                    )}
                  </div>

                  {profissional.especialidades && profissional.especialidades.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm text-gray-600 mb-2">Especialidades:</div>
                      <div className="flex flex-wrap gap-2">
                        {profissional.especialidades.map((especialidade, idx) => (
                          <Badge key={idx} variant="secondary">
                            {especialidade}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum profissional encontrado com os filtros aplicados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
