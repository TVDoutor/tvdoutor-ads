import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, 
  ChevronRight, 
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ProposalTypeStep,
  ClientInfoStep,
  ProjectSelectionStep,
  ScreenSelectionStep,
  ConfigurationStep,
  SummaryStep,
} from './wizard/ProposalWizardSteps';
import { type ScreenFilters as IScreenFilters } from './ScreenFilters';

export interface ProposalData {
  proposal_type: 'avulsa' | 'projeto' | '';
  customer_name: string;
  customer_email: string;
  selected_project?: any;
  selectedScreens: number[];
  film_seconds: number[];
  custom_film_seconds?: number;
  insertions_per_hour: number;
  cpm_mode: 'manual' | 'blended';
  cpm_value?: number;
  impact_formula: string;
  discount_pct: number;
  discount_fixed: number;
  start_date?: string;
  end_date?: string;
}

interface NewProposalWizardProps {
  onComplete: (data: ProposalData) => void;
  onCancel: () => void;
}

const STEPS = [
  { id: 1, title: 'Tipo de Proposta', icon: FileText, description: 'Selecione o tipo de campanha' },
  { id: 2, title: 'Informações do Cliente', icon: User, description: 'Dados do cliente' },
  { id: 3, title: 'Seleção de Projeto', icon: Briefcase, description: 'Escolha o projeto' },
  { id: 4, title: 'Seleção de Telas', icon: Monitor, description: 'Escolha as mídias' },
  { id: 5, title: 'Configurações', icon: Settings, description: 'Configure a campanha' },
  { id: 6, title: 'Resumo', icon: BarChart3, description: 'Revise e finalize' },
];

export const NewProposalWizardImproved: React.FC<NewProposalWizardProps> = ({
  onComplete,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<ProposalData>({
    proposal_type: '',
    customer_name: '',
    customer_email: '',
    selectedScreens: [],
    film_seconds: [15],
    insertions_per_hour: 6,
    cpm_mode: 'manual',
    cpm_value: 25,
    impact_formula: 'A',
    discount_pct: 0,
    discount_fixed: 0,
  });

  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [availableScreens, setAvailableScreens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const progress = (currentStep / STEPS.length) * 100;

  const updateData = (updates: Partial<ProposalData>) => {
    console.log('📝 Updating proposal data:', { updates, currentData: data });
    setData(prev => {
      const newData = { ...prev, ...updates };
      console.log('✅ New proposal data:', newData);
      return newData;
    });
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const canProceed = () => {
    const result = (() => {
      switch (currentStep) {
        case 1: return data.proposal_type !== '';
        case 2: return data.customer_name.trim() !== '' && data.customer_email.trim() !== '';
        case 3: return data.selected_project; // Sempre exigir projeto selecionado
        case 4: return data.selectedScreens.length > 0;
        case 5: return data.film_seconds.length > 0 && data.insertions_per_hour > 0;
        default: return true;
      }
    })();
    
    console.log(`🔍 Step ${currentStep} validation:`, {
      canProceed: result,
      proposal_type: data.proposal_type,
      currentData: data
    });
    
    return result;
  };

  // Buscar projetos baseado no cliente
  const searchProjects = async () => {
    if (!data.customer_name.trim()) return;
    
    setLoading(true);
    console.log('🔍 Buscando projetos para cliente:', data.customer_name);
    
    try {
      // Primeira busca: projetos básicos
      const { data: projects, error } = await supabase
        .from('agencia_projetos')
        .select(`
          id,
          nome_projeto,
          descricao,
          data_inicio,
          data_fim,
          orcamento_projeto,
          status_projeto,
          cliente_final,
          responsavel_projeto
        `)
        .or(`cliente_final.ilike.%${data.customer_name.trim()}%,nome_projeto.ilike.%${data.customer_name.trim()}%`)
        .eq('status_projeto', 'ativo')
        .limit(20);

      console.log('📊 Projetos encontrados:', projects);
      console.log('❌ Erro na busca:', error);

      if (error) {
        console.error('Erro detalhado:', error);
        toast.error('Erro ao buscar projetos: ' + error.message);
      } else if (projects && projects.length > 0) {
        // Segunda busca: enriquecer com dados dos responsáveis
        const projectsWithResponsaveis = await Promise.all(
          projects.map(async (project) => {
            if (project.responsavel_projeto) {
              const { data: responsavel } = await supabase
                .from('pessoas_projeto')
                .select('id, nome, email')
                .eq('id', project.responsavel_projeto)
                .single();
              
              return { ...project, pessoas_projeto: responsavel };
            }
            return project;
          })
        );
        
        console.log('📊 Projetos enriquecidos:', projectsWithResponsaveis);
        setAvailableProjects(projectsWithResponsaveis);
      } else {
        setAvailableProjects([]);
      }
    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
      toast.error('Erro ao conectar com o banco de dados');
    } finally {
      setLoading(false);
    }
  };

  // Buscar todos os projetos ativos
  const fetchAllProjects = async () => {
    setLoading(true);
    console.log('🔍 Buscando todos os projetos ativos...');
    
    try {
      // Buscar todos os projetos ativos
      const { data: projects, error } = await supabase
        .from('agencia_projetos')
        .select(`
          id,
          nome_projeto,
          descricao,
          data_inicio,
          data_fim,
          orcamento_projeto,
          status_projeto,
          cliente_final,
          responsavel_projeto,
          agencias (
            id,
            nome_agencia
          )
        `)
        .eq('status_projeto', 'ativo')
        .order('created_at', { ascending: false })
        .limit(50);

      console.log('📊 Projetos encontrados:', projects);
      console.log('❌ Erro na busca:', error);

      if (error) {
        console.error('Erro detalhado:', error);
        toast.error('Erro ao buscar projetos: ' + error.message);
      } else if (projects && projects.length > 0) {
        // Enriquecer com dados dos responsáveis
        const projectsWithResponsaveis = await Promise.all(
          projects.map(async (project) => {
            if (project.responsavel_projeto) {
              const { data: responsavel } = await supabase
                .from('pessoas_projeto')
                .select('id, nome, email')
                .eq('id', project.responsavel_projeto)
                .single();
              
              return { ...project, pessoas_projeto: responsavel };
            }
            return project;
          })
        );
        
        console.log('📊 Projetos enriquecidos:', projectsWithResponsaveis);
        setAvailableProjects(projectsWithResponsaveis);
      } else {
        setAvailableProjects([]);
      }
    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
      toast.error('Erro ao conectar com o banco de dados');
    } finally {
      setLoading(false);
    }
  };

  // Buscar telas disponíveis
  const fetchScreens = async () => {
    setLoading(true);
    console.log('🔍 Buscando telas do inventário...');
    
    try {
      // Tentar primeiro com a view enriquecida
      let { data: screens, error } = await supabase
        .from('v_screens_enriched')
        .select(`
          id,
          name,
          city,
          state,
          class,
          venue_name
        `)
        .eq('active', true)
        .limit(100);

      // Se a view não existir, fazer fallback para a tabela screens
      if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
        console.log('⚠️ View v_screens_enriched indisponível, usando tabela screens');
        const fallback = await supabase
          .from('screens')
          .select(`
            id,
            name,
            city,
            state,
            class,
            venues (name, type)
          `)
          .eq('active', true)
          .limit(100);
        
        screens = fallback.data;
        error = fallback.error;
      }

      console.log('📊 Telas encontradas:', screens);
      console.log('❌ Erro na busca de telas:', error);

      if (error) {
        console.error('Erro detalhado:', error);
        toast.error('Erro ao buscar telas: ' + error.message);
      } else if (screens) {
        // Normalizar dados para compatibilidade
        const normalizedScreens = screens.map((screen: any) => ({
          ...screen,
          venues: screen.venues || { name: screen.venue_name, type: null }
        }));
        
        setAvailableScreens(normalizedScreens);
        console.log('✅ Telas carregadas:', normalizedScreens.length);
      } else {
        setAvailableScreens([]);
        console.log('⚠️ Nenhuma tela encontrada');
      }
    } catch (error) {
      console.error('Erro ao buscar telas:', error);
      toast.error('Erro ao conectar com o banco de dados');
    } finally {
      setLoading(false);
    }
  };

  // Buscar telas com filtros
  const fetchScreensWithFilters = async (filters: IScreenFilters) => {
    setLoading(true);
    console.log('🔍 Buscando telas com filtros:', filters);
    
    try {
      let query = supabase.from('v_screens_enriched');
      
      // Construir query baseada nos filtros
      let selectQuery = query.select(`
        id,
        name,
        display_name,
        code,
        city,
        state,
        class,
        specialty,
        venue_name,
        address
      `);

      // Filtros de texto
      if (filters.nameOrCode.trim()) {
        const searchTerm = filters.nameOrCode.trim();
        selectQuery = selectQuery.or(`name.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);
      }

      if (filters.address.trim()) {
        selectQuery = selectQuery.ilike('address', `%${filters.address.trim()}%`);
      }

      if (filters.city.trim()) {
        selectQuery = selectQuery.ilike('city', `%${filters.city.trim()}%`);
      }

      if (filters.state.trim()) {
        selectQuery = selectQuery.ilike('state', `%${filters.state.trim()}%`);
      }

      // Filtro por classe
      if (filters.selectedClasses.length > 0) {
        selectQuery = selectQuery.in('class', filters.selectedClasses);
      }

      // Filtro por especialidade
      if (filters.selectedSpecialties.length > 0) {
        selectQuery = selectQuery.overlaps('specialty', filters.selectedSpecialties);
      }

      // Sempre filtrar apenas telas ativas
      selectQuery = selectQuery.eq('active', true);

      const { data: screens, error } = await selectQuery.limit(500);

      // Fallback para tabela screens se a view não existir
      if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
        console.log('⚠️ View v_screens_enriched indisponível, usando tabela screens');
        await fetchScreensWithFallback(filters);
        return;
      }

      console.log('📊 Telas encontradas com filtros:', screens);
      console.log('❌ Erro na busca:', error);

      if (error) {
        console.error('Erro detalhado:', error);
        toast.error('Erro ao buscar telas: ' + error.message);
      } else if (screens) {
        // Normalizar dados
        const normalizedScreens = screens.map((screen: any) => ({
          ...screen,
          venues: { name: screen.venue_name, type: null }
        }));
        
        setAvailableScreens(normalizedScreens);
        console.log('✅ Telas carregadas com filtros:', normalizedScreens.length);
        
        if (normalizedScreens.length === 0) {
          toast.info('Nenhuma tela encontrada com os filtros aplicados');
        }
      } else {
        setAvailableScreens([]);
        console.log('⚠️ Nenhuma tela encontrada com filtros');
      }
    } catch (error) {
      console.error('Erro ao buscar telas com filtros:', error);
      toast.error('Erro ao conectar com o banco de dados');
    } finally {
      setLoading(false);
    }
  };

  // Fallback para busca com filtros na tabela screens
  const fetchScreensWithFallback = async (filters: IScreenFilters) => {
    try {
      let query = supabase.from('screens');
      
      let selectQuery = query.select(`
        id,
        name,
        display_name,
        code,
        city,
        state,
        class,
        specialty,
        venues (name, type)
      `);

      // Aplicar os mesmos filtros
      if (filters.nameOrCode.trim()) {
        const searchTerm = filters.nameOrCode.trim();
        selectQuery = selectQuery.or(`name.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);
      }

      if (filters.city.trim()) {
        selectQuery = selectQuery.ilike('city', `%${filters.city.trim()}%`);
      }

      if (filters.state.trim()) {
        selectQuery = selectQuery.ilike('state', `%${filters.state.trim()}%`);
      }

      if (filters.selectedClasses.length > 0) {
        selectQuery = selectQuery.in('class', filters.selectedClasses);
      }

      if (filters.selectedSpecialties.length > 0) {
        selectQuery = selectQuery.overlaps('specialty', filters.selectedSpecialties);
      }

      selectQuery = selectQuery.eq('active', true);

      const { data: screens, error } = await selectQuery.limit(500);

      if (error) {
        console.error('Erro detalhado:', error);
        toast.error('Erro ao buscar telas: ' + error.message);
      } else if (screens) {
        setAvailableScreens(screens);
        console.log('✅ Telas carregadas (fallback) com filtros:', screens.length);
      } else {
        setAvailableScreens([]);
      }
    } catch (error) {
      console.error('Erro na busca fallback:', error);
      toast.error('Erro ao conectar com o banco de dados');
    }
  };

  useEffect(() => {
    if (currentStep === 3) {
      // Sempre buscar projetos quando chegar no passo 3, independente do tipo de proposta
      fetchAllProjects();
    }
    // Removido o fetchScreens automático - agora só busca quando o usuário aplicar filtros
  }, [currentStep]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return <ProposalTypeStep data={data} onUpdate={updateData} />;
      case 2: return <ClientInfoStep data={data} onUpdate={updateData} />;
      case 3: return <ProjectSelectionStep data={data} onUpdate={updateData} projects={availableProjects} loading={loading} />;
      case 4: return <ScreenSelectionStep data={data} onUpdate={updateData} screens={availableScreens} loading={loading} onApplyFilters={fetchScreensWithFilters} />;
      case 5: return <ConfigurationStep data={data} onUpdate={updateData} />;
      case 6: return <SummaryStep data={data} />;
      default: return null;
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Nova Proposta</h1>
          <p className="text-gray-600">Crie uma nova proposta comercial seguindo os passos abaixo</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">Passo {currentStep} de {STEPS.length}</span>
            <span className="text-sm text-gray-500">{Math.round(progress)}% concluído</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4 overflow-x-auto pb-4">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200
                  ${currentStep >= step.id 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-400'
                  }
                `}>
                  {React.createElement(step.icon, { className: "w-5 h-5" })}
                </div>
                <div className="ml-3 hidden sm:block">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-400">{step.description}</p>
                </div>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-gray-300 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              {React.createElement(STEPS[currentStep - 1].icon, { className: "w-6 h-6" })}
              {STEPS[currentStep - 1].title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? onCancel : prevStep}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {currentStep === 1 ? 'Cancelar' : 'Anterior'}
          </Button>

          <Button
            onClick={currentStep === STEPS.length ? () => onComplete(data) : nextStep}
            disabled={!canProceed()}
            className="flex items-center gap-2"
          >
            {currentStep === STEPS.length ? 'Finalizar Proposta' : 'Próximo'}
            {currentStep !== STEPS.length && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

