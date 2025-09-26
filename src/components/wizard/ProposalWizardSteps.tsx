import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FileText, 
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
  Play
} from 'lucide-react';
import { ProposalData } from '../NewProposalWizardImproved';
import { ScreenFilters, type ScreenFilters as IScreenFilters } from '../ScreenFilters';

interface StepProps {
  data: ProposalData;
  onUpdate: (updates: Partial<ProposalData>) => void;
}

// Step 1: Proposal Type Selection
export const ProposalTypeStep: React.FC<StepProps> = ({ data, onUpdate }) => {
  console.log('🎯 ProposalTypeStep render:', { proposal_type: data.proposal_type });

  const handleValueChange = (value: string) => {
    console.log('📝 Changing proposal type to:', value);
    onUpdate({ proposal_type: value as 'avulsa' | 'projeto' });
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Que tipo de proposta você deseja criar?</h3>
        <p className="text-gray-600">Selecione o tipo de campanha que melhor atende às necessidades do seu cliente</p>
      </div>

      <RadioGroup
        value={data.proposal_type}
        onValueChange={handleValueChange}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <Card className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
          data.proposal_type === 'avulsa' ? 'ring-2 ring-blue-500 border-blue-500' : ''
        }`}>
          <CardContent className="p-6">
            <RadioGroupItem value="avulsa" id="avulsa" className="mb-4" />
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

        <Card className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
          data.proposal_type === 'projeto' ? 'ring-2 ring-green-500 border-green-500' : ''
        }`}>
          <CardContent className="p-6">
            <RadioGroupItem value="projeto" id="projeto" className="mb-4" />
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
      </RadioGroup>

      {/* Debug info */}
      <div className="bg-gray-100 p-3 rounded text-xs">
        <strong>Debug:</strong> proposal_type = "{data.proposal_type}"
      </div>
    </div>
  );
};

// Step 2: Client Information
export const ClientInfoStep: React.FC<StepProps> = ({ data, onUpdate }) => (
  <div className="space-y-8">
    <div className="text-center">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Informações do Cliente</h3>
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

    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-100 rounded-full">
          <Briefcase className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h4 className="font-semibold text-blue-900 mb-1">Verificação de Projetos</h4>
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
  if (data.proposal_type === 'avulsa') {
    return (
      <div className="text-center space-y-6">
        <div className="p-8 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full">
              <Play className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-green-900 mb-2">Veiculação Avulsa Selecionada</h3>
              <p className="text-green-700">
                Esta proposta não requer um projeto específico. Prossiga para a seleção de telas.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Selecione um Projeto</h3>
        <p className="text-gray-600">Escolha o projeto relacionado a esta proposta comercial</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4 max-w-2xl mx-auto">
          <p className="text-sm text-blue-700">
            <strong>Todos os projetos ativos</strong> estão listados abaixo. 
            Selecione aquele que melhor se adequa à sua proposta comercial.
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
  console.log('🖥️ ScreenSelectionStep render:', { 
    screens: screens?.length || 0, 
    loading,
    selectedScreens: data.selectedScreens 
  });

  const [filters, setFilters] = useState<IScreenFilters>({
    nameOrCode: '',
    address: '',
    city: '',
    state: '',
    selectedClasses: [],
    selectedSpecialties: []
  });

  const [hasSearched, setHasSearched] = useState(false);

  const toggleScreen = (screenId: number) => {
    console.log('🔄 Toggling screen:', screenId);
    const isSelected = data.selectedScreens.includes(screenId);
    const newSelected = isSelected
      ? data.selectedScreens.filter(id => id !== screenId)
      : [...data.selectedScreens, screenId];
    
    console.log('✅ New selected screens:', newSelected);
    onUpdate({ selectedScreens: newSelected });
  };

  const handleFiltersChange = (newFilters: IScreenFilters) => {
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    console.log('🔍 Aplicando filtros:', filters);
    setHasSearched(true);
    if (onApplyFilters) {
      onApplyFilters(filters);
    }
  };

  const handleClearFilters = () => {
    const emptyFilters: IScreenFilters = {
      nameOrCode: '',
      address: '',
      city: '',
      state: '',
      selectedClasses: [],
      selectedSpecialties: []
    };
    setFilters(emptyFilters);
    setHasSearched(false);
    if (onApplyFilters) {
      onApplyFilters(emptyFilters);
    }
  };

  const handleSelectAll = () => {
    const allScreenIds = screens.map(screen => screen.id);
    onUpdate({ selectedScreens: allScreenIds });
  };

  const handleDeselectAll = () => {
    onUpdate({ selectedScreens: [] });
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

      {!hasSearched ? (
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
                  <li>• Preencha os filtros de busca</li>
                  <li>• Clique em "Buscar Telas"</li>
                  <li>• Selecione as telas desejadas</li>
                  <li>• Use "Selecionar Todas" se necessário</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : loading ? (
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
                onClick={handleDeselectAll}
                className="flex items-center gap-2"
              >
                Limpar Seleção
              </Button>
            </div>
            <div className="text-sm text-gray-600">
              {data.selectedScreens.length} de {screens.length} selecionadas
            </div>
          </div>

          {/* Grid de telas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {screens.map((screen) => (
              <Card
                key={screen.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  data.selectedScreens.includes(screen.id) ? 'ring-2 ring-blue-600 bg-blue-50' : ''
                }`}
                onClick={() => toggleScreen(screen.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{screen.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{screen.venues?.name}</p>
                      <div className="text-xs text-gray-500">
                        <p>{screen.city}, {screen.state}</p>
                        <Badge variant="outline" className="mt-1">
                          Classe {screen.class}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200
                      ${data.selectedScreens.includes(screen.id) 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'border-gray-300'
                      }
                    `}>
                      {data.selectedScreens.includes(screen.id) && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
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
      )}

      {/* Debug info */}
      <div className="bg-gray-100 p-3 rounded text-xs">
        <strong>Debug:</strong> {screens.length} telas disponíveis, {data.selectedScreens.length} selecionadas
        <br />
        <strong>Selecionadas:</strong> {JSON.stringify(data.selectedScreens)}
      </div>
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

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Configurações da Campanha</h3>
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
            <Label>Modo CPM</Label>
            <RadioGroup
              value={data.cpm_mode}
              onValueChange={(value) => onUpdate({ cpm_mode: value as 'manual' | 'blended' })}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="cpm-manual" />
                <Label htmlFor="cpm-manual">Manual</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="blended" id="cpm-blended" />
                <Label htmlFor="cpm-blended">Blended</Label>
              </div>
            </RadioGroup>
          </div>

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

          <div className="grid grid-cols-2 gap-4">
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
        </CardContent>
      </Card>
    </div>

    {/* Fórmula de Impacto */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Modelo de Impacto
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Escolha o modelo de cálculo de impacto baseado no perfil de tráfego esperado para sua campanha.
        </p>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={data.impact_formula}
          onValueChange={(value) => onUpdate({ impact_formula: value })}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {[
            {
              id: 'A',
              title: 'Fórmula A',
              subtitle: 'Tráfego Alto',
              description: 'Para locais com grande movimento de pessoas',
              details: [
                'Shopping centers movimentados',
                'Aeroportos e terminais',
                'Hospitais de grande porte',
                'Centros comerciais principais'
              ],
              color: 'from-green-500 to-emerald-600',
              bgColor: 'bg-green-50',
              borderColor: 'border-green-200',
              textColor: 'text-green-700'
            },
            {
              id: 'B',
              title: 'Fórmula B',
              subtitle: 'Tráfego Médio',
              description: 'Para locais com movimento moderado de pessoas',
              details: [
                'Farmácias de bairro',
                'Clínicas médicas',
                'Postos de saúde',
                'Centros comerciais menores'
              ],
              color: 'from-blue-500 to-cyan-600',
              bgColor: 'bg-blue-50',
              borderColor: 'border-blue-200',
              textColor: 'text-blue-700'
            },
            {
              id: 'C',
              title: 'Fórmula C',
              subtitle: 'Tráfego Baixo',
              description: 'Para locais com menor movimento de pessoas',
              details: [
                'Consultórios médicos',
                'Clínicas especializadas',
                'Locais de baixo movimento',
                'Ambientes corporativos'
              ],
              color: 'from-orange-500 to-red-500',
              bgColor: 'bg-orange-50',
              borderColor: 'border-orange-200',
              textColor: 'text-orange-700'
            }
          ].map((formula) => (
            <div key={formula.id}>
              <RadioGroupItem value={formula.id} id={`formula-${formula.id}`} className="peer sr-only" />
              <Label
                htmlFor={`formula-${formula.id}`}
                className={`
                  flex flex-col rounded-lg border-2 p-6 cursor-pointer transition-all duration-200 hover:shadow-lg
                  ${data.impact_formula === formula.id 
                    ? `border-blue-500 bg-blue-50 shadow-md` 
                    : `border-gray-200 bg-white hover:border-gray-300`
                  }
                `}
              >
                <div className="text-center mb-4">
                  <div className={`text-2xl font-bold mb-1 ${
                    data.impact_formula === formula.id ? 'text-blue-600' : 'text-gray-700'
                  }`}>
                    {formula.title}
                  </div>
                  <div className={`text-lg font-semibold ${
                    data.impact_formula === formula.id ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {formula.subtitle}
                  </div>
                </div>
                
                <div className="text-center mb-4">
                  <p className={`text-sm ${
                    data.impact_formula === formula.id ? 'text-blue-700' : 'text-gray-600'
                  }`}>
                    {formula.description}
                  </p>
                </div>
                
                <div className={`${formula.bgColor} ${formula.borderColor} border rounded-lg p-3`}>
                  <p className={`text-xs font-semibold ${formula.textColor} mb-2`}>
                    Exemplos de locais:
                  </p>
                  <ul className={`text-xs ${formula.textColor} space-y-1`}>
                    {formula.details.map((detail, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-1">•</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {data.impact_formula === formula.id && (
                  <div className="mt-4 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-blue-600">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="text-sm font-medium">Selecionado</span>
                    </div>
                  </div>
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>
        
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
  const calculateMetrics = () => {
    const screens = data.selectedScreens.length;
    const startDate = data.start_date ? new Date(data.start_date) : new Date();
    const endDate = data.end_date ? new Date(data.end_date) : new Date();
    const days = data.start_date && data.end_date ? 
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 30;
    
    const hoursPerDay = 10;
    const totalInsertions = data.insertions_per_hour * hoursPerDay * days * screens;
    const avgAudiencePerScreen = 100;
    const impacts = totalInsertions * avgAudiencePerScreen;
    const cpm = data.cpm_value || 25;
    const grossValue = (impacts / 1000) * cpm;
    const netValue = grossValue - (grossValue * data.discount_pct / 100) - data.discount_fixed;

    return {
      screens,
      days,
      totalInsertions,
      impacts,
      grossValue,
      netValue,
    };
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
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Resumo da Proposta</h3>
        <p className="text-gray-600">Revise todos os dados antes de finalizar</p>
      </div>

      {/* Informações do Cliente e Projeto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informações do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Nome:</span>
              <span className="font-semibold">{data.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-semibold">{data.customer_email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tipo:</span>
              <Badge>{data.proposal_type === 'avulsa' ? 'Veiculação Avulsa' : 'Projeto Especial'}</Badge>
            </div>
          </CardContent>
        </Card>

        {data.selected_project && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Projeto Selecionado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações da Campanha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{data.film_seconds[0]}s</div>
              <div className="text-sm text-gray-600">Duração do Filme</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{data.insertions_per_hour}</div>
              <div className="text-sm text-gray-600">Inserções/Hora</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {data.cpm_value ? formatCurrency(data.cpm_value) : 'Blended'}
              </div>
              <div className="text-sm text-gray-600">CPM</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">Fórmula {data.impact_formula}</div>
              <div className="text-sm text-gray-600">Modelo de Impacto</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Calculadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Métricas da Campanha
          </CardTitle>
        </CardHeader>
        <CardContent>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Valor Bruto:</span>
              <span className="text-xl font-semibold">{formatCurrency(metrics.grossValue)}</span>
            </div>
            
            {data.discount_pct > 0 && (
              <div className="flex justify-between items-center py-2 text-red-600">
                <span>Desconto ({data.discount_pct}%):</span>
                <span>-{formatCurrency(metrics.grossValue * data.discount_pct / 100)}</span>
              </div>
            )}
            
            {data.discount_fixed > 0 && (
              <div className="flex justify-between items-center py-2 text-red-600">
                <span>Desconto Fixo:</span>
                <span>-{formatCurrency(data.discount_fixed)}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between items-center py-2">
              <span className="text-xl font-bold">Valor Líquido:</span>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics.netValue)}
              </span>
            </div>
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
