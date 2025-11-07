import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  User, 
  Briefcase, 
  Monitor, 
  Settings, 
  BarChart3,
  Building2,
  Calendar,
  DollarSign,
  Target,
  Users,
  MapPin,
  Clock,
  Play,
  Calculator,
  AlertCircle
} from 'lucide-react';
import { ProposalData } from '../NewProposalWizardImproved';
import { ScreenFilters, type ScreenFilters as IScreenFilters } from '../ScreenFilters';
import { ImpactFormulaRadioGroup } from './ImpactFormulaRadioGroup';
import { toast } from 'sonner';
import { combineIds } from '@/utils/ids';
import { calculateProposalMetrics } from '@/lib/pricing';

interface StepProps {
  data: ProposalData;
  onUpdate: (updates: Partial<ProposalData>) => void;
}

// Step 1: Proposal Type Selection
export const ProposalTypeStep: React.FC<StepProps> = ({ data, onUpdate }) => {
  

  const handleTypeToggle = (type: 'avulsa' | 'projeto', checked: boolean) => {
    const currentTypes = data.proposal_type || [];
    let newTypes: ('avulsa' | 'projeto')[];
    
    if (checked) {
      // Adiciona o tipo se não estiver presente
      newTypes = currentTypes.includes(type) ? currentTypes : [...currentTypes, type];
    } else {
      // Remove o tipo
      newTypes = currentTypes.filter(t => t !== type);
    }
    onUpdate({ proposal_type: newTypes });
  };

  const isTypeSelected = (type: 'avulsa' | 'projeto') => {
    return data.proposal_type?.includes(type) || false;
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Que tipo de proposta você deseja criar?</h3>
        <p className="text-gray-600">Selecione um ou ambos os tipos de campanha que atendem às necessidades do seu cliente</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
            isTypeSelected('avulsa') ? 'ring-2 ring-blue-500 border-blue-500' : ''
          }`}
          onClick={() => handleTypeToggle('avulsa', !isTypeSelected('avulsa'))}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <Checkbox
                id="avulsa"
                checked={isTypeSelected('avulsa')}
                onCheckedChange={(checked) => handleTypeToggle('avulsa', checked as boolean)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <Label htmlFor="avulsa" className="cursor-pointer">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Play className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg">Veiculação Avulsa</h4>
                  <p className="text-sm text-muted-foreground mt-2">
                    Campanha pontual sem projeto específico. Ideal para ações promocionais ou campanhas de curta duração.
                  </p>
                </div>
              </div>
            </Label>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
            isTypeSelected('projeto') ? 'ring-2 ring-green-500 border-green-500' : ''
          }`}
          onClick={() => handleTypeToggle('projeto', !isTypeSelected('projeto'))}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <Checkbox
                id="projeto"
                checked={isTypeSelected('projeto')}
                onCheckedChange={(checked) => handleTypeToggle('projeto', checked as boolean)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <Label htmlFor="projeto" className="cursor-pointer">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <Briefcase className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg">Projeto Especial de Conteúdo</h4>
                  <p className="text-sm text-muted-foreground mt-2">
                    Campanha vinculada a um projeto existente com orçamento, cronograma e objetivos específicos.
                  </p>
                </div>
              </div>
            </Label>
          </CardContent>
        </Card>
      </div>

      
    </div>
  );
};

// Step 2: Client Information
export const ClientInfoStep: React.FC<StepProps> = ({ data, onUpdate }) => (
  <div className="space-y-8 pdf-dense-text">
    <div className="text-center">
      <h3 className="text-xl font-semibold text-gray-900 mb-2 pdf-compact-title">Informações do Cliente</h3>
      <p className="text-gray-600">Insira os dados do cliente para identificar projetos relacionados</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
      <div className="space-y-2">
        <Label htmlFor="customer_name" className="flex items-center gap-2">
          <User className="w-4 h-4" />
          Nome do Cliente
        </Label>
        <Input
          id="customer_name"
          value={data.customer_name}
          onChange={(e) => onUpdate({ customer_name: e.target.value })}
          placeholder="Digite o nome do cliente"
          className="h-12"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer_email" className="flex items-center gap-2">
          <User className="w-4 h-4" />
          Email do Cliente
        </Label>
        <Input
          id="customer_email"
          type="email"
          value={data.customer_email}
          onChange={(e) => onUpdate({ customer_email: e.target.value })}
          placeholder="email@cliente.com"
          className="h-12"
        />
      </div>
    </div>

    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto pdf-dense-text">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-100 rounded-full">
          <Briefcase className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h4 className="font-semibold text-blue-900 mb-1 pdf-compact-title">Verificação de Projetos</h4>
          <p className="text-sm text-blue-700">
            Com base no nome do cliente, o sistema buscará automaticamente por projetos existentes na próxima etapa.
          </p>
        </div>
      </div>
    </div>
  </div>
);

// Step 3: Project Selection
interface ProjectSelectionStepProps extends StepProps {
  projects: any[];
  loading: boolean;
}

export const ProjectSelectionStep: React.FC<ProjectSelectionStepProps> = ({ 
  data, 
  onUpdate, 
  projects, 
  loading 
}) => {

  const getProposalTypeLabel = () => {
    if (!data.proposal_type || data.proposal_type.length === 0) return 'Nenhum tipo selecionado';
    const types = data.proposal_type.map(type => 
      type === 'avulsa' ? 'Veiculação Avulsa' : 'Projeto Especial de Conteúdo'
    );
    return types.join(' + ');
  };

  return (
    <div className="space-y-8 pdf-dense-text">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2 pdf-compact-title">Selecione um Projeto</h3>
        <p className="text-gray-600">Toda proposta deve estar vinculada a um projeto</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4 max-w-2xl mx-auto pdf-dense-text">
          <p className="text-sm text-blue-700">
            <strong>Todos os projetos ativos</strong> estão listados abaixo. 
            Selecione aquele que melhor se adequa à sua proposta comercial.
            <br />
            <span className="text-blue-600 font-medium">
              Tipo de proposta: {getProposalTypeLabel()}
            </span>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Buscando projetos...</p>
        </div>
      ) : projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <Card
              key={project.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                data.selected_project?.id === project.id ? 'ring-2 ring-blue-600 bg-blue-50' : ''
              }`}
              onClick={() => onUpdate({ 
                selected_project: project,
                start_date: project.data_inicio,
                end_date: project.data_fim
              })}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg text-gray-900">{project.nome_projeto}</h4>
                    <p className="text-sm text-gray-600 mb-3">{project.descricao}</p>
                    <p className="text-xs text-gray-500 mb-3">Cliente: {project.cliente_final}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{new Date(project.data_inicio).toLocaleDateString('pt-BR')} - {new Date(project.data_fim).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.orcamento_projeto || 0)}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant={project.status_projeto === 'ativo' ? 'default' : 'secondary'}>
                        {project.status_projeto}
                      </Badge>
                      {project.pessoas_projeto && (
                        <Badge variant="outline">
                          Resp: {project.pessoas_projeto.nome}
                        </Badge>
                      )}
                      {project.agencias && (
                        <Badge variant="secondary">
                          {project.agencias.nome_agencia}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Nenhum projeto ativo encontrado</h4>
          <p className="text-gray-600 mb-4">
            Não há projetos ativos disponíveis no momento.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-amber-700">
              <strong>Dica:</strong> Certifique-se de que existem projetos com status "ativo" no sistema.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Step 4: Screen Selection
interface ScreenSelectionStepProps extends StepProps {
  screens: any[];
  loading: boolean;
  onApplyFilters?: (filters: IScreenFilters) => void;
}

export const ScreenSelectionStep: React.FC<ScreenSelectionStepProps> = ({ 
  data, 
  onUpdate, 
  screens, 
  loading,
  onApplyFilters
}) => {
  

  const [filters, setFilters] = useState<IScreenFilters>({
    nameOrCode: '',
    address: '',
    city: '',
    state: '',
    selectedClasses: [],
    selectedSpecialties: [],
    // Campos para busca por raio
    radiusSearchAddress: '',
    radiusKm: 5,
    useRadiusSearch: false // Mantido para compatibilidade, mas não usado
  });

  const [hasSearched, setHasSearched] = useState(false);
  // Seleção temporária para permitir múltiplas buscas e adicionar pontos incrementalmente
  const [tempSelectedScreens, setTempSelectedScreens] = useState<number[]>([]);

  const toggleScreen = (screenId: number) => {
    const isSelected = tempSelectedScreens.includes(screenId);
    const newTempSelected = isSelected
      ? tempSelectedScreens.filter(id => id !== screenId)
      : [...tempSelectedScreens, screenId];
    setTempSelectedScreens(newTempSelected);
  };

  const handleFiltersChange = (newFilters: IScreenFilters) => {
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    if (onApplyFilters) {
      onApplyFilters(filters);
    }
    // Marcar como pesquisado após a busca ser iniciada
    setHasSearched(true);
    // Ao aplicar novos filtros, limpamos a seleção temporária
    setTempSelectedScreens([]);
  };

  const handleClearFilters = () => {
    const emptyFilters: IScreenFilters = {
      nameOrCode: '',
      address: '',
      city: '',
      state: '',
      selectedClasses: [],
      selectedSpecialties: [],
      radiusSearchAddress: '',
      radiusKm: 5,
      useRadiusSearch: false
    };
    setFilters(emptyFilters);
    setHasSearched(false);
    if (onApplyFilters) {
      onApplyFilters(emptyFilters);
    }
    // Limpar apenas a seleção temporária
    setTempSelectedScreens([]);
  };

  const handleSelectAll = () => {
    const allScreenIds = screens.map(screen => screen.id);
    // Seleciona temporariamente todas as telas disponíveis (sem alterar a proposta ainda)
    setTempSelectedScreens(prev => combineIds<number>(prev, allScreenIds));
    toast.success(`${allScreenIds.length} telas selecionadas! Clique em "Adicionar Ponto" para incluir na proposta.`);
  };

  const handleDeselectAll = () => {
    // Limpa apenas a seleção temporária da busca atual
    setTempSelectedScreens([]);
    toast.info('Seleção temporária limpa');
  };

  // Adiciona os pontos selecionados temporariamente à proposta de forma incremental (sem duplicar)
  const handleAddPoints = () => {
    if (tempSelectedScreens.length === 0) {
      toast.error('Selecione pelo menos uma tela para adicionar');
      return;
    }
    const combined = combineIds<number>(data.selectedScreens as number[], tempSelectedScreens);
    onUpdate({ selectedScreens: combined });
    // Limpar a seleção temporária para permitir nova busca/seleção
    setTempSelectedScreens([]);
    toast.success(`${tempSelectedScreens.length} ponto(s) adicionado(s) à proposta!`);
  };

  const getUniqueLocations = () => {
    const selectedScreensData = screens.filter(s => data.selectedScreens.includes(s.id));
    const locations = selectedScreensData.map(s => `${s.city}, ${s.state}`);
    return [...new Set(locations)];
  };

  return (
    <div className="space-y-6">
      {/* Header com contadores */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Seleção de Telas</h3>
          <p className="text-gray-600">Use os filtros para encontrar e selecionar as telas desejadas</p>
        </div>
        
        <div className="flex gap-4">
          <Badge variant="outline" className="text-lg px-3 py-1">
            <Monitor className="w-4 h-4 mr-2" />
            {data.selectedScreens.length} Selecionadas
          </Badge>
          <Badge variant="outline" className="text-lg px-3 py-1">
            <MapPin className="w-4 h-4 mr-2" />
            {getUniqueLocations().length} Praças
          </Badge>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {screens.length} Disponíveis
          </Badge>
        </div>
      </div>

      {/* Filtros */}
      <ScreenFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        loading={loading}
      />

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Carregando telas...</p>
        </div>
      ) : screens.length > 0 ? (
        <div className="space-y-4">
          {/* Botões de seleção em massa */}
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="flex items-center gap-2"
              >
                <Monitor className="w-4 h-4" />
                Selecionar Todas ({screens.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddPoints}
                disabled={tempSelectedScreens.length === 0}
                className="flex items-center gap-2"
              >
                Adicionar Ponto
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                className="flex items-center gap-2"
              >
                Limpar Seleção
              </Button>
            </div>
            <div className="text-sm text-gray-600">
              {tempSelectedScreens.length} de {screens.length} selecionadas
            </div>
          </div>

          {/* Grid de telas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {screens.map((screen) => {
              // Calcular métricas baseadas nos dados da tela
              const audience = screen.audience || Math.floor(Math.random() * 2000) + 500; // Alcance simulado
              const weeklyRate = screen.weekly_rate || Math.floor(Math.random() * 200) + 50; // Taxa semanal
              const cpm = screen.cpm || Math.floor((weeklyRate / audience) * 1000); // CPM calculado
              const hasDistance = screen.distance !== undefined && screen.distance !== null;
              
              return (
                <Card
                  key={screen.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    tempSelectedScreens.includes(screen.id) ? 'ring-2 ring-blue-600 bg-blue-50' : ''
                  }`}
                  onClick={() => toggleScreen(screen.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1 text-sm leading-tight">{screen.name}</h4>
                        <p className="text-xs text-gray-600 mb-2">{screen.venues?.name || screen.venue_name}
                          {data.selectedScreens.includes(screen.id) && (
                            <Badge variant="outline" className="ml-2">Já adicionado</Badge>
                          )}
                        </p>
                        <div className="text-xs text-gray-500">
                          <p>{screen.city}, {screen.state}</p>
                          {hasDistance && (
                            <p className="text-blue-600 font-medium mt-1">
                              📍 {screen.distance.toFixed(1)} km de distância
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200
                        ${tempSelectedScreens.includes(screen.id) 
                          ? 'bg-blue-600 border-blue-600' 
                          : 'border-gray-300'
                        }
                      `}>
                        {tempSelectedScreens.includes(screen.id) && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                    </div>

                    {/* Grid de métricas coloridas */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Alcance */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                        <div className="text-xs font-medium text-blue-900 mb-1">Alcance</div>
                        <div className="text-sm font-semibold text-blue-800">
                          {audience.toLocaleString()} pessoas/semana
                        </div>
                      </div>

                      {/* Investimento */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                        <div className="text-xs font-medium text-green-900 mb-1">Investimento</div>
                        <div className="text-sm font-semibold text-green-800">
                          R$ {weeklyRate.toLocaleString()}/semana
                        </div>
                      </div>

                      {/* CPM */}
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                        <div className="text-xs font-medium text-yellow-900 mb-1">CPM</div>
                        <div className="text-sm font-semibold text-yellow-800">
                          R$ {cpm.toFixed(2)}
                        </div>
                      </div>

                      {/* Classe */}
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                        <div className="text-xs font-medium text-purple-900 mb-1">Classe</div>
                        <div className="text-sm font-semibold text-purple-800">
                          {screen.class || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Resumo por praça/cidade dos pontos adicionados (com base nas telas carregadas) */}
          {data.selectedScreens.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Pontos adicionados por praça
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const selectedScreensByLocation: Record<string, any[]> = {};
                  screens.filter(s => data.selectedScreens.includes(s.id)).forEach(s => {
                    const key = `${s.city}, ${s.state}`;
                    if (!selectedScreensByLocation[key]) selectedScreensByLocation[key] = [];
                    selectedScreensByLocation[key].push(s);
                  });
                  const entries = Object.entries(selectedScreensByLocation);
                  if (entries.length === 0) {
                    return (
                      <p className="text-sm text-gray-600">Nenhum ponto adicionado nas telas atualmente carregadas.</p>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {entries.map(([location, locationScreens]) => (
                        <div key={location} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{location}</p>
                            <Badge variant="outline">{locationScreens.length} ponto(s)</Badge>
                          </div>
                          <div className="mt-2 text-xs text-gray-600">
                            {locationScreens.map(s => (
                              <span key={s.id} className="inline-block mr-2 mb-1">
                                • {s.display_name || s.name} (#{s.code || s.id})
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      ) : hasSearched ? (
        <div className="text-center py-12">
          <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma tela encontrada</h4>
          <p className="text-gray-600 mb-4">
            Não foram encontradas telas com os filtros aplicados.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-amber-700">
              <strong>Dica:</strong> Tente ajustar os filtros de busca ou limpar todos os filtros para ver mais opções.
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-6" />
          <h4 className="text-xl font-semibold text-gray-900 mb-4">Seleção de Telas</h4>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Use os filtros acima para buscar e encontrar as telas desejadas. 
            Após aplicar os filtros, você poderá selecionar as telas que melhor atendem à sua proposta.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-lg mx-auto">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Monitor className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h5 className="font-semibold text-blue-900 mb-2">Como funciona:</h5>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Ative a busca por raio ou use filtros tradicionais</li>
                  <li>• Para busca por raio: digite o endereço e ajuste o raio</li>
                  <li>• Clique em "Buscar Telas"</li>
                  <li>• Selecione as telas desejadas</li>
                  <li>• Use "Selecionar Todas" se necessário</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
};

// Step 5: Configuration
export const ConfigurationStep: React.FC<StepProps> = ({ data, onUpdate }) => {
  const [customDuration, setCustomDuration] = useState(data.custom_film_seconds || 0);
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);

  const handleDurationChange = (duration: number, checked: boolean) => {
    let newDurations = [...data.film_seconds];
    
    if (checked) {
      if (!newDurations.includes(duration)) {
        newDurations.push(duration);
      }
    } else {
      newDurations = newDurations.filter(d => d !== duration);
    }
    
    onUpdate({ film_seconds: newDurations });
  };

  const handleCustomDurationChange = (value: number) => {
    setCustomDuration(value);
    if (value > 0) {
      let newDurations = [...data.film_seconds];
      // Remove custom duration anterior se existir
      newDurations = newDurations.filter(d => d !== data.custom_film_seconds);
      // Adiciona nova custom duration
      newDurations.push(value);
      onUpdate({ 
        film_seconds: newDurations,
        custom_film_seconds: value
      });
    }
  };

  const handleCustomDurationConfirm = () => {
    if (customDuration > 0) {
      handleCustomDurationChange(customDuration);
      setIsCustomDialogOpen(false);
    }
  };

  const mergeValorInsercaoConfig = (patch: Partial<NonNullable<ProposalData['valor_insercao_config']>>) => {
    onUpdate({
      valor_insercao_config: {
        ...(data.valor_insercao_config ?? {}),
        ...patch,
      },
    });
  };

  const derivedPricingMode = data.cpm_mode === 'valor_insercao' ? 'insertion' : (data.pricing_mode ?? 'cpm');

  const pricingSummary = useMemo(() => {
    try {
      const metrics = calculateProposalMetrics({
        screens_count: data.selectedScreens?.length ?? 0,
        film_seconds: Array.isArray(data.film_seconds) ? data.film_seconds : [],
        custom_film_seconds: data.custom_film_seconds,
        insertions_per_hour: data.insertions_per_hour ?? 0,
        hours_per_day: data.horas_operacao_dia ?? 10,
        business_days_per_month: data.dias_uteis_mes_base ?? 22,
        period_unit: data.period_unit ?? 'months',
        months_period: data.months_period,
        days_period: data.days_period,
        pricing_mode: derivedPricingMode,
        pricing_variant: data.pricing_variant ?? 'avulsa',
        insertion_prices: data.insertion_prices,
        discounts_per_insertion: data.discounts_per_insertion,
        cpm_value: data.cpm_value,
        discount_pct: data.discount_pct,
        discount_fixed: data.discount_fixed,
        avg_audience_per_insertion: data.avg_audience_per_insertion,
      });

      const variant = data.pricing_variant ?? 'avulsa';
      const durations = Array.from(new Set([
        ...(Array.isArray(data.film_seconds) ? data.film_seconds : []),
        ...(data.custom_film_seconds ? [data.custom_film_seconds] : []),
      ]))
        .filter((sec): sec is number => typeof sec === 'number' && !Number.isNaN(sec) && sec > 0)
        .sort((a, b) => a - b);

      const breakdown = derivedPricingMode === 'insertion' && metrics
        ? durations.map((sec) => {
            const price = data.insertion_prices?.[variant]?.[sec];
            const discount = data.discounts_per_insertion?.[variant]?.[sec];
            const pct = discount?.pct ?? 0;
            const fixed = discount?.fixed ?? 0;
            const effective = typeof price === 'number'
              ? Math.max(price - (price * pct / 100) - fixed, 0)
              : undefined;
            const subtotal = typeof effective === 'number'
              ? effective * metrics.totalInsertions
              : undefined;
            return { duration: sec, unitPrice: effective, subtotal };
          })
        : [];

      return { metrics, breakdown };
    } catch (error) {
      console.warn('[ConfigurationStep] Falha ao calcular métricas da proposta:', error);
      return { metrics: null, breakdown: [] };
    }
  }, [data, derivedPricingMode]);

  const pricingMetrics = pricingSummary.metrics;
  const pricingBreakdown = pricingSummary.breakdown;
  const missingDurations = derivedPricingMode === 'insertion' ? (pricingMetrics?.missingPriceFor ?? []) : [];

  const formatCurrency = (value?: number | null) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value?: number | null) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '0';
    return value.toLocaleString('pt-BR');
  };

  return (
    <div className="space-y-8 pdf-dense-text">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2 pdf-compact-title--tight">Configurações da Campanha</h3>
        <p className="text-gray-600">Defina os parâmetros técnicos e comerciais</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configurações de Filme */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Configurações do Filme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Duração do Filme (segundos)</Label>
              <p className="text-sm text-gray-500 mb-3">Selecione uma ou mais durações para o filme</p>
              
              <div className="space-y-3">
                {[15, 30, 45, 60].map((duration) => (
                  <div key={duration} className="flex items-center space-x-3">
                    <Checkbox
                      id={`duration-${duration}`}
                      checked={data.film_seconds.includes(duration)}
                      onCheckedChange={(checked) => handleDurationChange(duration, checked as boolean)}
                    />
                    <Label htmlFor={`duration-${duration}`} className="text-base">
                      {duration} segundos
                    </Label>
                  </div>
                ))}
                
                {/* Opção customizada */}
                <div className="flex items-center space-x-3 pt-2 border-t">
                  <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        Duração Customizada
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Duração Customizada</DialogTitle>
                        <DialogDescription>
                          Insira a duração desejada em segundos. O valor deve ser um número inteiro positivo.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="custom-duration">Duração (segundos)</Label>
                          <Input
                            id="custom-duration"
                            type="number"
                            value={customDuration}
                            onChange={(e) => setCustomDuration(parseInt(e.target.value) || 0)}
                            min="1"
                            max="300"
                            placeholder="Ex: 90"
                            className="mt-2"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Digite o tempo em segundos (ex: 90 para 1 minuto e 30 segundos)
                          </p>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsCustomDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleCustomDurationConfirm} disabled={customDuration <= 0}>
                            Confirmar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {data.custom_film_seconds && (
                    <Badge variant="secondary" className="ml-2">
                      {data.custom_film_seconds}s selecionado
                    </Badge>
                  )}
                </div>
              </div>
              
              {data.film_seconds.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Durações selecionadas:</strong> {data.film_seconds.sort((a, b) => a - b).join('s, ')}s
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="insertions">Inserções por Hora</Label>
              <Input
                id="insertions"
                type="number"
                value={data.insertions_per_hour}
                onChange={(e) => onUpdate({ insertions_per_hour: parseInt(e.target.value) || 0 })}
                min="1"
                max="12"
                className="mt-2"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="operating-hours">Horas de Operação por Dia</Label>
                <Input
                  id="operating-hours"
                  type="number"
                  min="1"
                  max="24"
                  step="1"
                  value={data.horas_operacao_dia ?? ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    onUpdate({ horas_operacao_dia: isNaN(value) ? 0 : value });
                  }}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Informe quantas horas por dia a campanha estará ativa (ex.: 12 para operação 12h/dia).
                </p>
              </div>
              <div>
                <Label htmlFor="business-days">Dias Úteis / Mês Base</Label>
                <Input
                  id="business-days"
                  type="number"
                  min="1"
                  max="31"
                  step="1"
                  value={data.dias_uteis_mes_base ?? ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    onUpdate({ dias_uteis_mes_base: isNaN(value) ? 0 : value });
                  }}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Utilize a média de dias úteis que será considerada para os cálculos (ex.: 22 dias).
                </p>
              </div>
            </div>
            {/* Unidade do Período */}
            <div className="space-y-2 mt-4">
              <Label>Unidade do Período</Label>
              <RadioGroup
                value={data.period_unit ?? 'months'}
                onValueChange={(value) => onUpdate({ period_unit: value as 'months' | 'days' })}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="months" id="period-months" />
                  <Label htmlFor="period-months">Meses</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="days" id="period-days" />
                  <Label htmlFor="period-days">Dias</Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-gray-500">Selecione se o período da campanha será definido em meses ou dias.</p>
            </div>
            {/* Meses do Período */}
            <div className="space-y-2 mt-4">
              <Label htmlFor="months-period">Meses do Período (01–12)</Label>
              <Input
                id="months-period"
                type="number"
                min="1"
                max="12"
                value={data.months_period ?? 1}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  const clamped = isNaN(v) ? 1 : Math.max(1, Math.min(12, v));
                  onUpdate({ months_period: clamped });
                }}
                className="mt-2"
              />
              <p className="text-xs text-gray-500">
                Informe quantos meses o período da proposta irá contemplar. Ex.: 08 para 8 meses.
              </p>
            </div>
            {/* Dias do Período (mostra apenas quando unit = days) */}
            {(data.period_unit ?? 'months') === 'days' && (
              <div className="space-y-2 mt-2">
                <Label htmlFor="days-period">Dias do Período</Label>
                <Input
                  id="days-period"
                  type="number"
                  min="1"
                  max="365"
                  value={data.days_period ?? ''}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    const clamped = isNaN(v) ? 1 : Math.max(1, Math.min(365, v));
                    onUpdate({ days_period: clamped });
                  }}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500">
                  Informe o período em dias quando optar pela unidade de período "Dias" (ex.: 15, 30, 45).
                </p>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Configurações de CPM */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Configurações de Preço
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Modo de Cálculo</Label>
            <RadioGroup
              value={data.cpm_mode ?? 'manual'}
              onValueChange={(value) => {
                const mode = value as 'manual' | 'blended' | 'valor_insercao';
                onUpdate({
                  cpm_mode: mode,
                  pricing_mode: mode === 'valor_insercao' ? 'insertion' : 'cpm',
                });
              }}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="cpm-manual" />
                <Label htmlFor="cpm-manual">CPM Manual</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="blended" id="cpm-blended" />
                <Label htmlFor="cpm-blended">CPM Blended</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="valor_insercao" id="cpm-valor-insercao" />
                <Label htmlFor="cpm-valor-insercao">Valor por Inserção</Label>
              </div>
            </RadioGroup>
          </div>

          {data.cpm_mode === 'valor_insercao' ? (
            <>
              <div className="mt-2">
                <Label>Tipo de Serviço</Label>
                <RadioGroup
                  value={data.valor_insercao_config?.tipo_servico_proposta ?? 'Avulsa'}
                  onValueChange={(value) => {
                    const tipo = value as 'Avulsa' | 'Especial';
                    onUpdate({
                      pricing_variant: tipo === 'Especial' ? 'especial' : 'avulsa',
                      valor_insercao_config: {
                        ...(data.valor_insercao_config ?? {}),
                        tipo_servico_proposta: tipo,
                      },
                    });
                  }}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Avulsa" id="servico-avulsa" />
                    <Label htmlFor="servico-avulsa">Avulsa</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Especial" id="servico-especial" />
                    <Label htmlFor="servico-especial">Especial</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="audiencia-base">Audiência / Mês Base</Label>
                  <Input
                    id="audiencia-base"
                    type="number"
                    min="0"
                    step="1"
                    value={data.valor_insercao_config?.audiencia_mes_base ?? ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      mergeValorInsercaoConfig({ audiencia_mes_base: isNaN(value) ? undefined : value });
                    }}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="qtd-telas">Qtd. Telas (Linha)</Label>
                  <Input
                    id="qtd-telas"
                    type="number"
                    min="0"
                    step="1"
                    value={data.valor_insercao_config?.qtd_telas ?? ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      mergeValorInsercaoConfig({ qtd_telas: isNaN(value) ? undefined : value });
                    }}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="desconto-percentual-linha">Desconto % (Linha)</Label>
                  <Input
                    id="desconto-percentual-linha"
                    type="number"
                    min="0"
                    step="0.01"
                    value={data.valor_insercao_config?.desconto_percentual ?? ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      mergeValorInsercaoConfig({ desconto_percentual: isNaN(value) ? undefined : value });
                    }}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="valor-avulsa-linha">Valor Inserção Avulsa (R$)</Label>
                  <Input
                    id="valor-avulsa-linha"
                    type="number"
                    step="0.01"
                    min="0"
                    value={data.valor_insercao_config?.valor_manual_insercao_avulsa ?? ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      mergeValorInsercaoConfig({ valor_manual_insercao_avulsa: isNaN(value) ? undefined : value });
                    }}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="valor-especial-linha">Valor Inserção Especial (R$)</Label>
                  <Input
                    id="valor-especial-linha"
                    type="number"
                    step="0.01"
                    min="0"
                    value={data.valor_insercao_config?.valor_manual_insercao_especial ?? ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      mergeValorInsercaoConfig({ valor_manual_insercao_especial: isNaN(value) ? undefined : value });
                    }}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="insercoes-hora-linha">Inserções/Hora (Linha)</Label>
                  <Input
                    id="insercoes-hora-linha"
                    type="number"
                    step="0.01"
                    min="0"
                    value={data.valor_insercao_config?.insercoes_hora_linha ?? ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      mergeValorInsercaoConfig({ insercoes_hora_linha: isNaN(value) ? null : value });
                    }}
                    className="mt-2"
                    placeholder="Opcional - usa valor global se vazio"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {data.cpm_mode === 'manual' && (
                <div>
                  <Label htmlFor="cpm-value">Valor CPM (R$)</Label>
                  <Input
                    id="cpm-value"
                    type="number"
                    step="0.01"
                    value={data.cpm_value || ''}
                    onChange={(e) => onUpdate({ cpm_value: parseFloat(e.target.value) || 0 })}
                    className="mt-2"
                  />
                </div>
              )}
              {data.cpm_mode === 'blended' && (
                <p className="text-xs text-gray-500">
                  O modo Blended utiliza as métricas de inventário para calcular um CPM médio automaticamente.
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discount-pct">Desconto (%)</Label>
                  <Input
                    id="discount-pct"
                    type="number"
                    step="0.1"
                    value={data.discount_pct}
                    onChange={(e) => onUpdate({ discount_pct: parseFloat(e.target.value) || 0 })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="discount-fixed">Desconto Fixo (R$)</Label>
                  <Input
                    id="discount-fixed"
                    type="number"
                    step="0.01"
                    value={data.discount_fixed}
                    onChange={(e) => onUpdate({ discount_fixed: parseFloat(e.target.value) || 0 })}
                    className="mt-2"
                  />
                </div>
              </div>
            </>
          )}

          <div className="pt-2">
            <Label htmlFor="avg-audience">Audiência Média por Inserção</Label>
            <Input
              id="avg-audience"
              type="number"
              min="0"
              step="1"
              value={data.avg_audience_per_insertion ?? 0}
              onChange={(e) => onUpdate({ avg_audience_per_insertion: parseFloat(e.target.value) || 0 })}
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Informe a média de pessoas impactadas a cada inserção (ex.: 100).
            </p>
          </div>

          {/* Tabela de Preços por Inserção - valores manuais */}
          {data.cpm_mode === 'valor_insercao' && (
            <div className="space-y-3 mt-6">
              <Label className="font-semibold">Tabela de Preços por Inserção (valores manuais)</Label>
              <p className="text-xs text-gray-500">Preencha os valores por duração para Avulsa e Especial. Os valores serão usados nos cálculos.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Avulsa */}
              <div className="p-3 border rounded-lg">
                <div className="font-medium mb-2">Veiculação Avulsa</div>
                <div className="space-y-2">
                  {[...new Set([...(data.film_seconds || [])])]
                    .sort((a, b) => a - b)
                    .map((sec) => (
                      <div key={`avulsa-${sec}`} className="grid grid-cols-2 gap-2 items-center">
                        <Label className="text-sm">{sec}&quot;</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={data.insertion_prices?.avulsa?.[sec] ?? ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            const next = {
                              ...data.insertion_prices,
                              avulsa: { ...(data.insertion_prices?.avulsa || {}), [sec]: isNaN(val) ? 0 : val }
                            };
                            onUpdate({ insertion_prices: next });
                          }}
                        />
                      </div>
                    ))}
                </div>
              </div>
              {/* Especial */}
              <div className="p-3 border rounded-lg">
                <div className="font-medium mb-2">Projeto Especial de Conteúdo</div>
                <div className="space-y-2">
                  {[...new Set([...(data.film_seconds || [])])]
                    .sort((a, b) => a - b)
                    .map((sec) => (
                      <div key={`especial-${sec}`} className="grid grid-cols-2 gap-2 items-center">
                        <Label className="text-sm">{sec}&quot;</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={data.insertion_prices?.especial?.[sec] ?? ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            const next = {
                              ...data.insertion_prices,
                              especial: { ...(data.insertion_prices?.especial || {}), [sec]: isNaN(val) ? 0 : val }
                            };
                            onUpdate({ insertion_prices: next });
                          }}
                        />
                      </div>
                    ))}
                </div>
              </div>
            </div>
            </div>
          )}
        </CardContent>
      </Card>

      {pricingMetrics && (
        <div className="lg:col-span-2">
          <div className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-white/20 rounded-full">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Resumo Calculado</h3>
                <p className="text-sm text-orange-100">
                  Valores estimados com base nas configurações atuais da campanha
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-orange-100 text-xs uppercase tracking-wide">Total de Inserções</p>
                <p className="text-2xl font-bold">{formatNumber(pricingMetrics.totalInsertions)}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-orange-100 text-xs uppercase tracking-wide">Impactos Estimados</p>
                <p className="text-2xl font-bold">{formatNumber(pricingMetrics.impacts)}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-orange-100 text-xs uppercase tracking-wide">Valor Bruto</p>
                <p className="text-2xl font-bold">{formatCurrency(pricingMetrics.grossValue)}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-orange-100 text-xs uppercase tracking-wide">Valor Líquido</p>
                <p className="text-2xl font-bold">{formatCurrency(pricingMetrics.netValue)}</p>
              </div>
            </div>

            {derivedPricingMode === 'insertion' && pricingBreakdown.length > 0 && (
              <div className="mt-6 bg-white/15 rounded-lg p-4">
                <p className="font-semibold mb-3">Detalhamento por Duração</p>
                <div className="space-y-2 text-sm">
                  {pricingBreakdown.map((item) => (
                    <div key={item.duration} className="flex items-center justify-between">
                      <span className="text-orange-100">
                        {item.duration}" → {item.unitPrice !== undefined ? `${formatCurrency(item.unitPrice)} / inserção` : 'Preço não configurado'}
                      </span>
                      <span className="font-semibold">
                        {item.subtotal !== undefined ? formatCurrency(item.subtotal) : '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {missingDurations.length > 0 && (
              <div className="mt-6 flex items-center gap-2 bg-red-500/20 border border-red-200 rounded-lg p-3 text-sm">
                <AlertCircle className="h-4 w-4" />
                <p>
                  <strong>Atenção:</strong> Preencha os preços para as durações {missingDurations.map((sec) => `${sec}"`).join(', ')} para liberar o cálculo completo.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* Fórmula de Impacto */}
    <Card className="mb-6 pdf-tight-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 pdf-compact-title">
          <Target className="w-5 h-5" />
          Modelo de Impacto
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2 pdf-dense-text">
          Escolha o modelo de cálculo de impacto baseado no perfil de tráfego esperado para sua campanha.
        </p>
      </CardHeader>
      <CardContent className="pb-6 pdf-dense-text">
        <ImpactFormulaRadioGroup 
          value={data.impact_formula}
          onValueChange={(value) => onUpdate({ impact_formula: value })}
        />
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Como funciona o cálculo de impacto?</h4>
          <p className="text-sm text-gray-600">
            O modelo de impacto determina quantas pessoas serão expostas ao seu conteúdo baseado no perfil de tráfego do local. 
            Locais com maior tráfego geram mais impactos, enquanto locais com menor movimento geram impactos mais conservadores.
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
  );
};

// Step 6: Summary
export const SummaryStep: React.FC<{ data: ProposalData }> = ({ data }) => {
  const derivedPricingMode = data.cpm_mode === 'valor_insercao' ? 'insertion' : (data.pricing_mode ?? 'cpm');
  const calculateMetrics = () => {
    return calculateProposalMetrics({
      screens_count: data.selectedScreens.length,
      film_seconds: Array.isArray(data.film_seconds) ? data.film_seconds : [],
      custom_film_seconds: data.custom_film_seconds,
      insertions_per_hour: data.insertions_per_hour,
      hours_per_day: data.horas_operacao_dia,
      business_days_per_month: data.dias_uteis_mes_base,
      period_unit: data.period_unit,
      months_period: data.months_period,
      days_period: data.days_period,
      pricing_mode: derivedPricingMode,
      pricing_variant: data.pricing_variant,
      insertion_prices: data.insertion_prices,
      discounts_per_insertion: data.discounts_per_insertion,
      cpm_value: data.cpm_value,
      discount_pct: data.discount_pct,
      discount_fixed: data.discount_fixed,
      avg_audience_per_insertion: data.avg_audience_per_insertion,
    });
  };

  const metrics = calculateMetrics();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não informado';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-8 pdf-dense-text">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2 pdf-compact-title">Resumo da Proposta</h3>
        <p className="text-gray-600">Revise todos os dados antes de finalizar</p>
      </div>

      {/* Informações do Cliente e Projeto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="pdf-tight-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 pdf-compact-title">
              <User className="w-5 h-5" />
              Informações do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pdf-dense-text">
            <div className="flex justify-between">
              <span className="text-gray-600">Nome:</span>
              <span className="font-semibold">{data.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-semibold">{data.customer_email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Tipo:</span>
              <div className="flex gap-2 flex-wrap">
                {data.proposal_type.map(type => (
                  <Badge key={type}>
                    {type === 'avulsa' ? 'Veiculação Avulsa' : 'Projeto Especial'}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {data.selected_project && (
          <Card className="pdf-tight-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 pdf-compact-title">
                <Briefcase className="w-5 h-5" />
                Projeto Selecionado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pdf-dense-text">
            <div className="flex justify-between">
              <span className="text-gray-600">Nome:</span>
              <span className="font-semibold">{data.selected_project.nome_projeto}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cliente:</span>
              <span className="font-semibold">{data.selected_project.cliente_final}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Período:</span>
              <span className="font-semibold">
                {formatDate(data.start_date)} - {formatDate(data.end_date)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Orçamento:</span>
              <span className="font-semibold">
                {formatCurrency(data.selected_project.orcamento_projeto)}
              </span>
            </div>
            {data.selected_project.pessoas_projeto && (
              <div className="flex justify-between">
                <span className="text-gray-600">Responsável:</span>
                <span className="font-semibold">{data.selected_project.pessoas_projeto.nome}</span>
              </div>
            )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Configurações da Campanha */}
      <Card className="pdf-tight-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 pdf-compact-title">
            <Settings className="w-5 h-5" />
            Configurações da Campanha
          </CardTitle>
        </CardHeader>
        <CardContent className="pdf-dense-text">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{data.film_seconds[0]}s</div>
              <div className="text-sm text-gray-600">Duração do Filme</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{data.insertions_per_hour}</div>
              <div className="text-sm text-gray-600">Inserções/Hora</div>
            </div>
            {(((data as any).pricing_mode ?? 'cpm') === 'insertion') ? (
              <div className="text-center">
                <div className="text-sm font-semibold text-blue-600">Preço por Inserção</div>
                <div className="text-xs text-gray-600">Variante: {((data as any).pricing_variant ?? 'avulsa') === 'avulsa' ? 'Avulsa' : 'Especial'}</div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {data.cpm_value ? formatCurrency(data.cpm_value) : 'Blended'}
                </div>
                <div className="text-sm text-gray-600">CPM</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">Fórmula {data.impact_formula}</div>
              <div className="text-sm text-gray-600">Modelo de Impacto</div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
            <div className="text-center">
              <div className="text-sm font-semibold text-blue-600">Unidade do Período</div>
              <div className="text-sm text-gray-600">{(((data as any).period_unit ?? 'months') === 'days') ? 'Dias' : 'Meses'}</div>
            </div>
            <div className="text-center">
              {(((data as any).period_unit ?? 'months') === 'days') ? (
                <>
                  <div className="text-2xl font-bold text-blue-600">{(data as any).days_period ?? '-'}</div>
                  <div className="text-sm text-gray-600">Dias</div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-blue-600">{(data as any).months_period ?? '-'}</div>
                  <div className="text-sm text-gray-600">Meses</div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Calculadas */}
      <Card className="pdf-tight-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 pdf-compact-title">
            <BarChart3 className="w-5 h-5" />
            Métricas da Campanha
          </CardTitle>
        </CardHeader>
        <CardContent className="pdf-dense-text">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">
                {metrics.totalInsertions.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Inserções Totais</div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">
                {metrics.impacts.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Impactos Estimados</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Monitor className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">{metrics.screens}</div>
              <div className="text-sm text-gray-600">Telas Selecionadas</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo Financeiro */}
      <Card className="pdf-tight-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 pdf-compact-title">
            <DollarSign className="w-5 h-5" />
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent className="pdf-dense-text">
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Valor Bruto:</span>
              <span className="text-xl font-semibold">{formatCurrency(metrics.grossValue)}</span>
            </div>
            {(((data as any).pricing_mode ?? 'cpm') === 'cpm') && data.discount_pct > 0 && (
              <div className="flex justify-between items-center py-2 text-red-600">
                <span>Desconto ({data.discount_pct}%):</span>
                <span>-{formatCurrency(metrics.grossValue * data.discount_pct / 100)}</span>
              </div>
            )}
            {(((data as any).pricing_mode ?? 'cpm') === 'cpm') && data.discount_fixed > 0 && (
              <div className="flex justify-between items-center py-2 text-red-600">
                <span>Desconto Fixo:</span>
                <span>-{formatCurrency(data.discount_fixed)}</span>
              </div>
            )}

            {(((data as any).pricing_mode ?? 'cpm') === 'insertion') && Array.isArray((metrics as any).missingPriceFor) && (metrics as any).missingPriceFor.length > 0 && (
              <div className="flex justify-between items-center py-2 text-red-600">
                <span>Preços ausentes para: {((metrics as any).missingPriceFor as number[]).sort((a,b)=>a-b).map(s => `${s}"`).join(', ')}</span>
                <span className="text-sm">Preencha os valores por inserção para todas as durações.</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between items-center py-2">
              <span className="text-xl font-bold">Valor Líquido:</span>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics.netValue)}
              </span>
            </div>
            {(((data as any).pricing_mode ?? 'cpm') === 'insertion') && (
              <div className="text-xs text-gray-600">
                Cálculo com preço por inserção ({((data as any).pricing_variant ?? 'avulsa') === 'avulsa' ? 'Avulsa' : 'Especial'}),
                considerando unidade de período {(((data as any).period_unit ?? 'months') === 'days') ? 'Dias' : 'Meses'}.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-full">
            <BarChart3 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h4 className="font-semibold text-green-900">Proposta Pronta!</h4>
            <p className="text-sm text-green-700">
              Todos os dados foram configurados. Clique em "Finalizar Proposta" para criar e salvar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
