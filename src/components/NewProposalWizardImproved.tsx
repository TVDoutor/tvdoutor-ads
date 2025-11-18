import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  User, 
  Briefcase, 
  Monitor, 
  Settings, 
  BarChart3
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
import { geocodeAddress } from '@/lib/geocoding';
import { searchScreensNearLocation } from '@/lib/search-service';
import { parseCepText, batchFindScreensByCEPs } from '@/lib/cep-batch';
import { validateWizardStep } from '@/utils/validations/proposal-wizard';

export interface ProposalData {
  proposal_type: ('avulsa' | 'projeto' | 'patrocinio_editorial')[];
  customer_name: string;
  customer_email: string;
  selected_project?: any;
  selectedScreens: number[];
  film_seconds: number[];
  custom_film_seconds?: number;
  insertions_per_hour: number;
  cpm_mode: 'manual' | 'blended' | 'valor_insercao';
  cpm_value?: number;
  impact_formula: string;
  discount_pct: number;
  discount_fixed: number;
  avg_audience_per_insertion?: number;
  start_date?: string;
  end_date?: string;
  // --- Novos campos para cálculos solicitados ---
  horas_operacao_dia: number; // horas_por_dia
  dias_uteis_mes_base: number; // dias_uteis_por_mes
  months_period?: number; // meses_periodo da proposta
  days_period?: number; // dias_periodo quando unidade for 'days'
  pricing_mode?: 'cpm' | 'insertion';
  pricing_variant?: 'avulsa' | 'especial' | 'ambos';
  period_unit?: 'months' | 'days';
  // tabela de preços por inserção (avulsa/especial) por duração (chave: segundos)
  insertion_prices: {
    avulsa: Record<number, number>;
    especial: Record<number, number>;
  };
  // descontos por inserção por duração (pct/fixo), separados por variante
  discounts_per_insertion?: {
    avulsa: Record<number, { pct?: number; fixed?: number }>;
    especial: Record<number, { pct?: number; fixed?: number }>;
  };
  // desconto percentual por linha de produto
  discount_pct_avulsa?: number;
  discount_pct_especial?: number;
  // fator de quadros/regra específica do especial
  fator_quadros?: number;
  // audiência base mensal (override global opcional)
  audience_base_monthly?: number;
  valor_insercao_config?: {
    tipo_servico_proposta?: 'Avulsa' | 'Especial' | 'Ambos';
    audiencia_mes_base?: number;
    qtd_telas?: number;
    desconto_percentual?: number;
    valor_manual_insercao_avulsa?: number;
    valor_manual_insercao_especial?: number;
    insercoes_hora_linha?: number | null;
  };
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
    proposal_type: [],
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
    avg_audience_per_insertion: 100,
    // Defaults seguros (não alteram comportamento atual)
    horas_operacao_dia: 10,
    dias_uteis_mes_base: 22,
    months_period: 8,
    days_period: undefined,
    pricing_mode: 'cpm',
    pricing_variant: 'avulsa',
    period_unit: 'months',
    insertion_prices: {
      avulsa: { 15: 0.39, 30: 0.55, 45: 0.71 },
      especial: { 15: 0.62, 30: 0.76, 45: 0.88 },
    },
    discounts_per_insertion: {
      avulsa: {},
      especial: {},
    },
    discount_pct_avulsa: 0,
    discount_pct_especial: 0,
    fator_quadros: 6,
    audience_base_monthly: 0,
    valor_insercao_config: {
      tipo_servico_proposta: 'Avulsa',
      audiencia_mes_base: 0,
      qtd_telas: 0,
      desconto_percentual: 0,
      valor_manual_insercao_avulsa: 0,
      valor_manual_insercao_especial: 0,
      insercoes_hora_linha: null,
    },
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

  // Helper para verificar preços ausentes por inserção
  const getMissingInsertionPrices = () => {
    const types = data.proposal_type || [];
    const hasAvulsa = types.includes('avulsa');
    const hasEspecial = types.includes('projeto') || types.includes('patrocinio_editorial');
    const variant = hasAvulsa && hasEspecial ? 'ambos' : hasAvulsa ? 'avulsa' : hasEspecial ? 'especial' : (data.pricing_variant ?? 'avulsa');
    const durations = Array.from(new Set([...(data.film_seconds || []), ...(data.custom_film_seconds ? [data.custom_film_seconds] : [])]))
      .filter((sec) => typeof sec === 'number' && sec > 0)
      .sort((a, b) => a - b);
    if (variant === 'ambos') {
      const tableAvulsa = data.insertion_prices?.avulsa || {};
      const tableEspecial = data.insertion_prices?.especial || {};
      const missingUnion = durations.filter((sec) => {
        const pA = tableAvulsa[sec];
        const pE = tableEspecial[sec];
        const missingA = pA === undefined || pA === null || isNaN(pA) || pA <= 0;
        const missingE = pE === undefined || pE === null || isNaN(pE) || pE <= 0;
        return missingA || missingE;
      });
      return missingUnion;
    } else {
      const table = (data.insertion_prices as any)?.[variant] || {};
      const missing = durations.filter((sec) => {
        const price = table[sec];
        return price === undefined || price === null || isNaN(price) || price <= 0;
      });
      return missing;
    }
  };

  const nextStep = () => {
    // Validação via Zod por etapa
    const validation = validateWizardStep(currentStep, data);
    if (!validation.success) {
      const msg = validation.errors?.join('\n') || 'Verifique os campos desta etapa.';
      toast.warning(msg);
      return;
    }
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
    const result = validateWizardStep(currentStep, data).success;
    
    console.log(`🔍 Step ${currentStep} validation:`, {
      canProceed: result,
      proposal_type: data.proposal_type,
      currentData: data
    });
    
    return result;
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
        .eq('status_projeto', 'ativo' as any)
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
          projects.map(async (project: any) => {
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

  // Buscar telas com filtros
  const fetchScreensWithFilters = async (filters: IScreenFilters) => {
    setLoading(true);
    console.log('🔍 Buscando telas com filtros:', filters);
    
    try {
      // Prioridade: lista de CEPs
      if (filters.cepListText && filters.cepListText.trim()) {
        toast.info('Processando lista de CEPs...');
        const parsed = parseCepText(filters.cepListText);
        if (parsed.errors.length) {
          toast.warning(`${parsed.errors.length} cep(s) inválido(s) ignorado(s)`);
        }
        if (parsed.ceps.length === 0) {
          toast.error('Nenhum CEP válido informado');
          setAvailableScreens([]);
          setLoading(false);
          return;
        }
        const { screens } = await batchFindScreensByCEPs(parsed.ceps, filters.radiusKm, '2');
        let processedScreens = screens.map((screen: any) => ({
          id: parseInt(screen.id),
          name: screen.name || screen.display_name,
          display_name: screen.display_name || screen.name,
          code: screen.code,
          city: screen.city,
          state: screen.state,
          class: screen.class,
          active: screen.active,
          venues: { name: screen.venue_name || screen.name, type: null },
          distance: screen.distance,
          venue_name: screen.venue_name || screen.name,
          address: screen.address_raw || `${screen.city}, ${screen.state}`
        }));
        // Filtros adicionais
        if (filters.selectedClasses.length > 0) {
          processedScreens = processedScreens.filter((s: any) => filters.selectedClasses.includes(s.class));
        }
        setAvailableScreens(processedScreens);
        toast.success(`${processedScreens.length} tela(s) encontradas via CEPs`);
      } else if (filters.radiusSearchAddress.trim()) {
        console.log('📍 Iniciando busca por raio...');
        
        try {
          // Geocodificar o endereço
          toast.info('Geocodificando endereço...');
          const geocodeResult = await geocodeAddress(filters.radiusSearchAddress);
          console.log('✅ Endereço geocodificado:', geocodeResult);
          
          // Buscar telas próximas
          toast.info(`Buscando telas em um raio de ${filters.radiusKm}km...`);
          const searchResults = await searchScreensNearLocation({
            lat: geocodeResult.lat,
            lng: geocodeResult.lng,
            startDate: new Date().toISOString(),
            durationWeeks: "2",
            addressName: filters.radiusSearchAddress,
            formattedAddress: geocodeResult.google_formatted_address,
            placeId: geocodeResult.google_place_id,
            radiusKm: filters.radiusKm
          });
          
          console.log('📊 Telas encontradas por raio:', searchResults.length);
          
          // Converter os resultados para o formato esperado (mesmo formato do InteractiveMap)
          let processedScreens = searchResults.map((screen: any) => ({
            id: parseInt(screen.id),
            name: screen.name || screen.display_name,
            display_name: screen.display_name || screen.name,
            code: screen.code,
            city: screen.city,
            state: screen.state,
            class: screen.class,
            active: screen.active,
            venues: { name: screen.venue_name || screen.name, type: null },
            distance: screen.distance,
            // Campos adicionais para renderização
            venue_name: screen.venue_name || screen.name,
            address: screen.address_raw || `${screen.city}, ${screen.state}`
          }));
          
          console.log('📋 Telas processadas (primeiras 3):', processedScreens.slice(0, 3));
          
          // Aplicar filtros adicionais (classe, especialidade) se especificados
          if (filters.selectedClasses.length > 0) {
            processedScreens = processedScreens.filter((screen: any) => 
              filters.selectedClasses.includes(screen.class)
            );
          }
          
          // Para especialidades, precisamos buscar na base
          if (filters.selectedSpecialties.length > 0) {
            const screenIds = processedScreens.map((s: any) => s.id);
            const { data: screensWithSpecialties } = await supabase
              .from('screens')
              .select('id, specialty')
              .in('id', screenIds);
            
            if (screensWithSpecialties) {
              processedScreens = processedScreens.filter((screen: any) => {
                const screenData = screensWithSpecialties.find((s: any) => s.id === screen.id);
                if (!screenData || !screenData.specialty) return false;
                return filters.selectedSpecialties.some((spec: string) => 
                  screenData.specialty.some((s: string) => s.toLowerCase().includes(spec.toLowerCase()))
                );
              });
            }
          }
          
          setAvailableScreens(processedScreens);
          console.log('✅ Telas carregadas com busca por raio:', processedScreens.length);
          
          if (processedScreens.length === 0) {
            toast.warning(`Nenhuma tela encontrada em um raio de ${filters.radiusKm}km`);
          } else {
            toast.success(`${processedScreens.length} tela(s) encontrada(s) próxima(s) ao endereço!`);
          }
          
        } catch (geocodeError: any) {
          console.error('❌ Erro na busca por raio:', geocodeError);
          toast.error(geocodeError.message || 'Erro ao buscar telas por raio');
          setAvailableScreens([]);
        }
        
      } else {
        // Busca tradicional por filtros
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
          selectQuery = selectQuery.in('class', filters.selectedClasses as any);
        }

        // Filtro por especialidade
        if (filters.selectedSpecialties.length > 0) {
          selectQuery = selectQuery.overlaps('specialty', filters.selectedSpecialties);
        }

        // Sempre filtrar apenas telas ativas
        selectQuery = selectQuery.eq('active', true as any);

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
          const normalizedScreens = (screens as any[]).map((screen: any) => ({
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
        selectQuery = selectQuery.in('class', filters.selectedClasses as any);
      }

      if (filters.selectedSpecialties.length > 0) {
        selectQuery = selectQuery.overlaps('specialty', filters.selectedSpecialties);
      }

      selectQuery = selectQuery.eq('active', true as any);

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

  // Atualizar audiência base mensal a partir das telas selecionadas (dados do banco)
  useEffect(() => {
    const refreshAudienceFromSelectedScreens = async () => {
      try {
        const selectedIds = Array.isArray(data.selectedScreens) ? data.selectedScreens : [];
        if (selectedIds.length === 0) {
          updateData({
            valor_insercao_config: {
              ...(data.valor_insercao_config ?? {}),
              audiencia_mes_base: 0,
              qtd_telas: 0,
            },
          });
          return;
        }

        const { data: screensRows } = await supabase
          .from('screens')
          .select('id, venue_id')
          .in('id', selectedIds);

        const venueIds = Array.from(new Set((screensRows || []).map((r: any) => r.venue_id).filter(Boolean)));

        let totalMonthlyAudience = 0;
        if (venueIds.length > 0) {
          const { data: audienceRows } = await supabase
            .from('venue_audience_monthly')
            .select('venue_id, audience')
            .in('venue_id', venueIds);
          totalMonthlyAudience = (audienceRows || []).reduce((sum: number, row: any) => sum + (Number(row.audience) || 0), 0);
        }

        updateData({
          valor_insercao_config: {
            ...(data.valor_insercao_config ?? {}),
            audiencia_mes_base: totalMonthlyAudience,
            qtd_telas: selectedIds.length,
          },
        });
      } catch (err) {
        console.warn('[Wizard] Falha ao atualizar audiência mensal de venues selecionados:', err);
      }
    };

    refreshAudienceFromSelectedScreens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.selectedScreens]);

  return (
    <div className="px-6 pt-6 pb-4 h-full min-h-0 flex flex-col">
      <div className="w-full flex-1 flex flex-col">
        <div className="relative mb-8 rounded-2xl border bg-gradient-to-r from-primary/10 via-blue-50 to-indigo-100 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Nova Proposta</h1>
              <p className="text-gray-600">Crie uma proposta comercial com fluxo guiado e moderno</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:block w-52">
                <Progress value={progress} className="h-2" />
              </div>
              <div className="px-3 py-1 rounded-full text-sm font-medium bg-white border text-gray-700">{Math.round(progress)}% concluído</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 xl:col-span-3">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-700">Etapas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-2">
                  {STEPS.map((step) => {
                    const Icon = step.icon;
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;
                    return (
                      <button
                        key={step.id}
                        onClick={() => { if (step.id <= currentStep) setCurrentStep(step.id); }}
                        className={`w-full flex items-center gap-3 rounded-lg border px-3 py-3 transition-all ${
                          isActive ? 'border-blue-600 bg-blue-50' : isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className={`flex items-center justify-center w-9 h-9 rounded-full ${
                          isActive ? 'bg-blue-600 text-white' : isCompleted ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className={`text-sm font-semibold ${isActive ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-gray-800'}`}>{step.title}</div>
                          <div className="text-xs text-gray-500">{step.description}</div>
                        </div>
                        <div className={`text-xs font-medium ${isCompleted ? 'text-green-700' : isActive ? 'text-blue-700' : 'text-gray-400'}`}>#{step.id}</div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8 xl:col-span-9 flex flex-col">
            <Card className="shadow-lg border w-full">
              <CardContent className="px-8 pt-8 pb-12 overflow-visible bg-white">
                {renderStepContent()}
                <div className="bg-white border-t mt-6 py-4 px-2 w-full">
                  <div className="flex justify-between items-center">
                    <Button
                      variant="outline"
                      onClick={currentStep === 1 ? onCancel : prevStep}
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {currentStep === 1 ? 'Cancelar' : 'Anterior'}
                    </Button>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={() => toast.success('Rascunho salvo')}
                        className="flex items-center gap-2"
                      >
                        Salvar Rascunho
                      </Button>
                      <Button
                        onClick={() => {
                          if (currentStep === STEPS.length) {
                            if (data.cpm_mode === 'valor_insercao') {
                              const missing = getMissingInsertionPrices();
                              if (missing.length > 0) {
                                toast.warning(`Preencha o preço por inserção para: ${missing.join('s, ')}s (variante ${data.pricing_variant ?? 'avulsa'}).`);
                                return;
                              }
                            }
                            onComplete(data);
                          } else {
                            nextStep();
                          }
                        }}
                        disabled={!canProceed()}
                        className="flex items-center gap-2"
                      >
                        {currentStep === STEPS.length ? 'Finalizar Proposta' : 'Próximo'}
                        {currentStep !== STEPS.length && <ChevronRight className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
