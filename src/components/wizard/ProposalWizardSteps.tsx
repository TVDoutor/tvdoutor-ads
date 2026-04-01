import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  AlertCircle,
  FileText,
  Layers3,
  X
} from 'lucide-react';
import { ProposalData } from '../NewProposalWizardImproved';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { ScreenFilters, type ScreenFilters as IScreenFilters } from '../ScreenFilters';
import { ImpactFormulaRadioGroup } from './ImpactFormulaRadioGroup';
import { toast } from 'sonner';
import { combineIds } from '@/utils/ids';
import { calculateProposalMetrics } from '@/lib/pricing';
import { supabase } from '@/integrations/supabase/client';
import { CategoryService } from '@/lib/category-service';
import { ProposalScreensMap } from './ProposalScreensMap';

// Labels centralizados para tipos de proposta
type ProposalType = 'avulsa' | 'projeto' | 'patrocinio_editorial';
const PROPOSAL_TYPE_LABELS: Record<ProposalType, string> = {
  avulsa: 'Veiculação Avulsa',
  projeto: 'Projeto Especial de Conteúdo',
  patrocinio_editorial: 'Patrocínio Editorial',
};

interface StepProps {
  data: ProposalData;
  onUpdate: (updates: Partial<ProposalData>) => void;
}

// Step 1: Proposal Type Selection
export const ProposalTypeStep: React.FC<StepProps> = ({ data, onUpdate }) => {
  

  const handleTypeToggle = (type: ProposalType, checked: boolean) => {
    const currentTypes = data.proposal_type || [];
    let newTypes: ProposalType[];
    
    if (checked) {
      // Adiciona o tipo se não estiver presente
      newTypes = currentTypes.includes(type) ? currentTypes : [...currentTypes, type];
    } else {
      // Remove o tipo
      newTypes = currentTypes.filter(t => t !== type);
    }
    onUpdate({ proposal_type: newTypes });
  };

  const isTypeSelected = (type: ProposalType) => {
    return data.proposal_type?.includes(type) || false;
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Que tipo de proposta você deseja criar?</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="text-gray-500">
                <AlertCircle className="w-4 h-4" />
              </TooltipTrigger>
              <TooltipContent>
                Selecione os formatos que melhor se aplicam. Você pode escolher mais de um tipo.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-gray-600">Selecione um ou ambos os tipos de campanha que atendem às necessidades do seu cliente</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
            isTypeSelected('patrocinio_editorial') ? 'ring-2 ring-purple-500 border-purple-500' : ''
          }`}
          onClick={() => handleTypeToggle('patrocinio_editorial', !isTypeSelected('patrocinio_editorial'))}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <Checkbox
                id="patrocinio_editorial"
                checked={isTypeSelected('patrocinio_editorial')}
                onCheckedChange={(checked) => handleTypeToggle('patrocinio_editorial', checked as boolean)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <Label htmlFor="patrocinio_editorial" className="cursor-pointer">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <FileText className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg">Patrocínio Editorial</h4>
                  <p className="text-sm text-muted-foreground mt-2">
                    Esse formato de campanha abrange Anúncios + Quadros + VTs
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
export const ClientInfoStep: React.FC<StepProps> = ({ data, onUpdate }) => {
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const nameError = (data.customer_name || '').trim().length < 2;
  const emailError = !isValidEmail((data.customer_email || '').trim());

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Informações do Cliente</h3>
            <p className="text-sm text-gray-600">Preencha os dados essenciais. Extras são opcionais.</p>
          </div>
        </div>
      </div>

      <div className="w-full rounded-xl border bg-white shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          <div className="space-y-2">
            <Label htmlFor="customer_name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Nome do Cliente
            </Label>
            <Input
              id="customer_name"
              value={data.customer_name}
              onChange={(e) => onUpdate({ customer_name: e.target.value })}
              placeholder="Ex: Clínica Saúde Total"
              className={`h-12 ${nameError && (data.customer_name?.length ? 'border-red-500' : '')}`}
            />
            <div className="text-xs">
              {nameError && data.customer_name?.length ? (
                <span className="text-red-600">Informe pelo menos 2 caracteres</span>
              ) : (
                <span className="text-muted-foreground">Usado para identificar o cliente na proposta</span>
              )}
            </div>
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
              placeholder="contato@cliente.com"
              className={`h-12 ${emailError && (data.customer_email?.length ? 'border-red-500' : '')}`}
            />
            <div className="text-xs">
              {emailError && data.customer_email?.length ? (
                <span className="text-red-600">Email em formato inválido</span>
              ) : (
                <span className="text-muted-foreground">Usado para contato e envio da proposta</span>
              )}
            </div>
          </div>
        </div>

        <div className="border-t p-6">
          <Accordion type="single" collapsible>
            <AccordionItem value="extras">
              <AccordionTrigger>Informações adicionais (opcional)</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Empresa</Label>
                    <Input placeholder="Ex: Grupo Saúde Ltda" />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input placeholder="Ex: (11) 99999-9999" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>Observações</Label>
                    <Input placeholder="Notas internas (não obrigatórias)" />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-full">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <Briefcase className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Verificação de Projetos</h4>
            <p className="text-sm text-blue-700">Com base no nome do cliente, sugeriremos projetos relacionados na próxima etapa.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

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
    const types = data.proposal_type.map(type => PROPOSAL_TYPE_LABELS[type as keyof typeof PROPOSAL_TYPE_LABELS] || String(type));
    return types.join(' + ');
  };

  return (
    <div className="space-y-8 pdf-dense-text">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2 pdf-compact-title">Selecione um Projeto</h3>
        <p className="text-gray-600">Toda proposta deve estar vinculada a um projeto</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4 max-w-2xl mx-auto pdf-dense-text">
          <p className="text-sm text-blue-700">
            <strong>Todos os projetos disponíveis</strong> estão listados abaixo. 
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
                projeto_id: project.id,
                agencia_id: project.agencia_id,
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
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Nenhum projeto encontrado</h4>
          <p className="text-gray-600 mb-4">
            Não há projetos disponíveis no momento.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-amber-700">
              <strong>Dica:</strong> Verifique se existem projetos cadastrados no sistema e se você tem permissão para visualizá-los.
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
  /** Última busca por raio (centro + km) para desenhar o círculo no mapa */
  radiusSearchMapContext?: { lat: number; lng: number; radiusKm: number } | null;
}

export const ScreenSelectionStep: React.FC<ScreenSelectionStepProps> = ({ 
  data, 
  onUpdate, 
  screens, 
  loading,
  onApplyFilters,
  radiusSearchMapContext = null,
}) => {
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);
  const [categorySubmitting, setCategorySubmitting] = useState(false);

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
  /** Inventário completo (lat/lng) só para o mapa quando o usuário ainda não aplicou busca */
  const [inventoryMapScreens, setInventoryMapScreens] = useState<any[]>([]);
  const [loadingInventoryMap, setLoadingInventoryMap] = useState(false);
  // Seleção temporária para permitir múltiplas buscas e adicionar pontos incrementalmente
  const [tempSelectedScreens, setTempSelectedScreens] = useState<number[]>([]);
  // Cache local das telas já vistas/retornadas em buscas anteriores.
  // Isso garante que o "Mapa/Inventário" e o passo 04 consigam exibir o resumo completo
  // mesmo depois do usuário trocar de aba (Rápido/Raio/CEP/Avançado) e os `screens` mudarem.
  const [screenCache, setScreenCache] = useState<Map<number, any>>(() => new Map());

  // Mapa inicial: todas as telas ativas com coordenadas (visão Brasil / inventário)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingInventoryMap(true);
      try {
        const PAGE_SIZE = 1000;
        let from = 0;
        const all: any[] = [];
        while (true) {
          const { data, error } = await supabase
            .from('v_screens_enriched')
            .select('id, code, display_name, name, lat, lng, class, active')
            .eq('active', true as any)
            .not('lat', 'is', null)
            .not('lng', 'is', null)
            .order('id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);
          if (error) throw error;
          const chunk = (data ?? []) as any[];
          all.push(...chunk);
          if (chunk.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        if (!cancelled) setInventoryMapScreens(all);
      } catch {
        try {
          const PAGE_SIZE = 1000;
          let from = 0;
          const all: any[] = [];
          while (true) {
            const { data, error } = await supabase
              .from('screens')
              .select('id, code, display_name, name, lat, lng, class, active')
              .eq('active', true as any)
              .not('lat', 'is', null)
              .not('lng', 'is', null)
              .order('id', { ascending: true })
              .range(from, from + PAGE_SIZE - 1);
            if (error) throw error;
            const chunk = (data ?? []) as any[];
            all.push(...chunk);
            if (chunk.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
          }
          if (!cancelled) setInventoryMapScreens(all);
        } catch {
          if (!cancelled) setInventoryMapScreens([]);
        }
      } finally {
        if (!cancelled) setLoadingInventoryMap(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sempre que chegam novos resultados, merge no cache
  useEffect(() => {
    if (!Array.isArray(screens) || screens.length === 0) return;
    setScreenCache(prev => {
      const next = new Map(prev);
      for (const s of screens) {
        if (s?.id != null) next.set(Number(s.id), s);
      }
      return next;
    });
  }, [screens]);

  // Garantir que telas já adicionadas tenham dados no cache (para resumo por praça)
  useEffect(() => {
    const selectedIds = Array.isArray(data.selectedScreens) ? (data.selectedScreens as number[]) : [];
    if (selectedIds.length === 0) return;

    const missing = selectedIds.filter(id => !screenCache.has(Number(id)));
    if (missing.length === 0) return;

    const fetchMissing = async () => {
      try {
        // Tentar pela view primeiro (mesma base do Inventário)
        const { data: rows, error } = await supabase
          .from('v_screens_enriched')
          .select('id, name, display_name, code, city, state, class, active, venue_name, address, lat, lng')
          .in('id', missing as any);

        if (error) throw error;
        if (rows && rows.length > 0) {
          setScreenCache(prev => {
            const next = new Map(prev);
            for (const r of rows as any[]) next.set(Number(r.id), r);
            return next;
          });
        }
      } catch (e: any) {
        // fallback para tabela screens caso a view esteja indisponível
        try {
          const { data: rows2 } = await supabase
            .from('screens')
            .select('id, name, display_name, code, city, state, class, active, venue_id, address_raw, lat, lng')
            .in('id', missing as any);
          if (rows2 && rows2.length > 0) {
            setScreenCache(prev => {
              const next = new Map(prev);
              for (const r of rows2 as any[]) next.set(Number(r.id), r);
              return next;
            });
          }
        } catch {
          // silêncio: o resumo vai mostrar apenas o que estiver no cache
        }
      }
    };

    fetchMissing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.selectedScreens]);

  const combinedSelectedIds = useMemo(
    () => combineIds<number>(data.selectedScreens as number[], tempSelectedScreens),
    [data.selectedScreens, tempSelectedScreens]
  );

  const usingInventoryOverview = screens.length === 0 && !hasSearched;

  /**
   * Mapa: sem busca = inventário (+ opcionalmente pontos da proposta fora do lote via cache).
   * Com busca ativa e resultados = somente o retorno da busca (sem mesclar outras telas da proposta).
   */
  const mapScreens = useMemo(() => {
    const base: any[] =
      screens.length > 0 ? screens : usingInventoryOverview ? inventoryMapScreens : [];
    const byId = new Map<number, any>();
    for (const s of base) {
      if (s?.id != null) byId.set(Number(s.id), s);
    }
    if (usingInventoryOverview) {
      const selectedIds = Array.isArray(data.selectedScreens) ? data.selectedScreens : [];
      for (const rawId of selectedIds) {
        const id = Number(rawId);
        if (!byId.has(id) && screenCache.has(id)) {
          byId.set(id, screenCache.get(id));
        }
      }
    }
    return Array.from(byId.values());
  }, [screens, usingInventoryOverview, inventoryMapScreens, data.selectedScreens, screenCache]);

  const selectedCategories = useMemo(
    () => CategoryService.getCategoriesByIds(data.selectedCategories ?? []),
    [data.selectedCategories]
  );
  const categorySpecialties = data.categorySpecialties ?? {};

  type ScreenOriginEntry = NonNullable<ProposalData['screenSelectionOrigins']>[string];
  type NormalizedScreenOrigin = {
    manual: boolean;
    categoryIds: string[];
    categoryLabels: string[];
  };

  const normalizeScreenOrigin = (origin?: ScreenOriginEntry): NormalizedScreenOrigin => {
    if (!origin) {
      return { manual: false, categoryIds: [], categoryLabels: [] };
    }

    const categoryIds = Array.isArray(origin.categoryIds)
      ? origin.categoryIds.filter((value): value is string => typeof value === 'string')
      : origin.categoryId
        ? [origin.categoryId]
        : [];

    const categoryLabels = Array.isArray(origin.categoryLabels)
      ? origin.categoryLabels.filter((value): value is string => typeof value === 'string')
      : origin.categoryLabel
        ? [origin.categoryLabel]
        : [];

    return {
      manual: origin.manual ?? origin.source === 'manual',
      categoryIds,
      categoryLabels,
    };
  };

  const denormalizeScreenOrigin = (origin: NormalizedScreenOrigin): ScreenOriginEntry | undefined => {
    if (!origin.manual && origin.categoryIds.length === 0) {
      return undefined;
    }

    if (origin.manual && origin.categoryIds.length === 0) {
      return {
        source: 'manual',
        manual: true,
      };
    }

    const categoryIds = Array.from(new Set(origin.categoryIds));
    const categoryLabels = Array.from(new Set(origin.categoryLabels));

    return {
      source: 'category',
      manual: origin.manual,
      categoryId: categoryIds[0],
      categoryLabel: categoryLabels[0],
      categoryIds,
      categoryLabels,
    };
  };

  const getScreenOrigins = () => data.screenSelectionOrigins ?? {};

  const mergeManualOrigins = (
    currentOrigins: ProposalData['screenSelectionOrigins'],
    screenIds: number[]
  ) => {
    const next = { ...(currentOrigins ?? {}) };
    for (const screenId of screenIds) {
      const key = String(screenId);
      const normalized = normalizeScreenOrigin(next[key]);
      normalized.manual = true;
      next[key] = denormalizeScreenOrigin(normalized);
    }
    return next;
  };

  const mergeCategoryOrigins = (
    currentOrigins: ProposalData['screenSelectionOrigins'],
    screenIds: number[],
    categoryId: string,
    categoryLabel: string
  ) => {
    const next = { ...(currentOrigins ?? {}) };
    for (const screenId of screenIds) {
      const key = String(screenId);
      const normalized = normalizeScreenOrigin(next[key]);
      normalized.categoryIds = Array.from(new Set([...normalized.categoryIds, categoryId]));
      normalized.categoryLabels = Array.from(new Set([...normalized.categoryLabels, categoryLabel]));
      next[key] = denormalizeScreenOrigin(normalized);
    }
    return next;
  };

  const computeSelectedCategoriesFromOrigins = (
    origins: ProposalData['screenSelectionOrigins'] | undefined,
    selectedScreens: number[]
  ) => {
    const categoryIds = new Set<string>();
    const map = origins ?? {};
    for (const screenId of selectedScreens) {
      const origin = normalizeScreenOrigin(map[String(screenId)]);
      for (const categoryId of origin.categoryIds) {
        categoryIds.add(categoryId);
      }
    }
    return Array.from(categoryIds);
  };

  const getCategoryCoverageCount = (categoryId: string) => {
    let count = 0;
    for (const screenId of data.selectedScreens as number[]) {
      const origin = normalizeScreenOrigin(getScreenOrigins()[String(screenId)]);
      if (origin.categoryIds.includes(categoryId)) {
        count += 1;
      }
    }
    return count;
  };

  const getCategorySpecialties = (categoryId: string) => {
    const configured = categorySpecialties[categoryId];
    if (Array.isArray(configured) && configured.length > 0) return configured;
    return CategoryService.getCategoryById(categoryId)?.specialties ?? [];
  };

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

  const handleCategorySelectionChange = (categoryId: string, checked: boolean) => {
    if (!checked) {
      const currentSelectedScreens = data.selectedScreens as number[];
      const currentOrigins = getScreenOrigins();
      const nextOrigins: NonNullable<ProposalData['screenSelectionOrigins']> = {};
      const updatedScreens: number[] = [];
      let removedPoints = 0;

      for (const screenId of currentSelectedScreens) {
        const normalized = normalizeScreenOrigin(currentOrigins[String(screenId)]);
        const nextCategoryIds = normalized.categoryIds.filter((id) => id !== categoryId);
        const nextCategoryLabels = nextCategoryIds
          .map((id) => CategoryService.getCategoryById(id)?.label)
          .filter((value): value is string => Boolean(value));

        const nextOrigin = denormalizeScreenOrigin({
          manual: normalized.manual,
          categoryIds: nextCategoryIds,
          categoryLabels: nextCategoryLabels,
        });

        if (!nextOrigin) {
          removedPoints += 1;
          continue;
        }

        updatedScreens.push(screenId);
        nextOrigins[String(screenId)] = nextOrigin;
      }

      onUpdate({
        selectedScreens: updatedScreens,
        selectedCategories: (data.selectedCategories ?? []).filter((id) => id !== categoryId),
        categorySpecialties: Object.fromEntries(
          Object.entries(categorySpecialties).filter(([key]) => key !== categoryId)
        ),
        screenSelectionOrigins: nextOrigins,
        valor_insercao_config: {
          ...(data.valor_insercao_config ?? {}),
          qtd_telas: updatedScreens.length,
        },
      });

      const categoryLabel = CategoryService.getCategoryById(categoryId)?.label ?? categoryId;
      if (removedPoints > 0) {
        toast.info(`Categoria "${categoryLabel}" removida. ${removedPoints} ponto(s) foram retirados da proposta.`);
      } else {
        toast.info(`Categoria "${categoryLabel}" removida. Nenhum ponto precisou ser excluído.`);
      }
      return;
    }

    setPendingCategoryId(categoryId);
  };

  const handleCategorySpecialtiesChange = async (categoryId: string, specialties: string[]) => {
    const dedupedSpecialties = Array.from(new Set(specialties));
    const nextCategorySpecialties = {
      ...categorySpecialties,
      [categoryId]: dedupedSpecialties,
    };

    if (!(data.selectedCategories ?? []).includes(categoryId)) {
      onUpdate({ categorySpecialties: nextCategorySpecialties });
      return;
    }

    try {
      const category = CategoryService.getCategoryById(categoryId);
      if (!category) {
        toast.error('Categoria não encontrada.');
        return;
      }

      const categoryScreens = await CategoryService.getScreensByCategory(categoryId, dedupedSpecialties);
      const nextCategoryScreenIds = new Set(categoryScreens.map((screen) => screen.id));
      const currentSelectedScreens = data.selectedScreens as number[];
      const currentOrigins = getScreenOrigins();
      const nextOrigins: NonNullable<ProposalData['screenSelectionOrigins']> = {};
      const updatedScreens: number[] = [];
      let removedPoints = 0;

      setScreenCache((prev) => {
        const next = new Map(prev);
        for (const screen of categoryScreens) {
          next.set(Number(screen.id), screen);
        }
        return next;
      });

      for (const screenId of currentSelectedScreens) {
        const normalized = normalizeScreenOrigin(currentOrigins[String(screenId)]);
        const hasCategory = normalized.categoryIds.includes(categoryId);

        if (!hasCategory) {
          updatedScreens.push(screenId);
          const persisted = denormalizeScreenOrigin(normalized);
          if (persisted) nextOrigins[String(screenId)] = persisted;
          continue;
        }

        if (!nextCategoryScreenIds.has(screenId)) {
          const remainingCategoryIds = normalized.categoryIds.filter((id) => id !== categoryId);
          const remainingCategoryLabels = remainingCategoryIds
            .map((id) => CategoryService.getCategoryById(id)?.label)
            .filter((value): value is string => Boolean(value));
          const persisted = denormalizeScreenOrigin({
            manual: normalized.manual,
            categoryIds: remainingCategoryIds,
            categoryLabels: remainingCategoryLabels,
          });

          if (persisted) {
            updatedScreens.push(screenId);
            nextOrigins[String(screenId)] = persisted;
          } else {
            removedPoints += 1;
          }

          continue;
        }

        updatedScreens.push(screenId);
        const nextNormalized = {
          manual: normalized.manual,
          categoryIds: normalized.categoryIds,
          categoryLabels: normalized.categoryIds.map((id) => CategoryService.getCategoryById(id)?.label).filter((value): value is string => Boolean(value)),
        };
        const persisted = denormalizeScreenOrigin(nextNormalized);
        if (persisted) nextOrigins[String(screenId)] = persisted;
      }

      onUpdate({
        selectedScreens: updatedScreens,
        selectedCategories: computeSelectedCategoriesFromOrigins(nextOrigins, updatedScreens),
        categorySpecialties: nextCategorySpecialties,
        screenSelectionOrigins: nextOrigins,
        valor_insercao_config: {
          ...(data.valor_insercao_config ?? {}),
          qtd_telas: updatedScreens.length,
        },
      });

      if (removedPoints > 0) {
        toast.info(`Especialidades da categoria "${category.label}" atualizadas. ${removedPoints} ponto(s) foram removidos.`);
      } else {
        toast.success(`Especialidades da categoria "${category.label}" atualizadas.`);
      }
    } catch (error) {
      console.error('Erro ao atualizar especialidades da categoria:', error);
      toast.error('Não foi possível atualizar as especialidades da categoria.');
    }
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
    // Atualiza cache com os itens visíveis na busca atual que foram selecionados
    setScreenCache(prev => {
      const next = new Map(prev);
      for (const id of tempSelectedScreens) {
        const found = screens.find((s: any) => Number(s?.id) === Number(id));
        if (found) next.set(Number(id), found);
      }
      return next;
    });

    onUpdate({ 
      selectedScreens: combined,
      screenSelectionOrigins: mergeManualOrigins(getScreenOrigins(), tempSelectedScreens),
      valor_insercao_config: {
        ...(data.valor_insercao_config ?? {}),
        qtd_telas: combined.length,
      }
    });
    // Limpar a seleção temporária para permitir nova busca/seleção
    setTempSelectedScreens([]);
    toast.success(`${tempSelectedScreens.length} ponto(s) adicionado(s) à proposta!`);
  };

  const handleRemoveAddedPoint = (screenId: number) => {
    const updatedScreens = (data.selectedScreens as number[]).filter((id) => id !== screenId);
    const nextOrigins = { ...getScreenOrigins() };
    delete nextOrigins[String(screenId)];

    onUpdate({
      selectedScreens: updatedScreens,
      selectedCategories: computeSelectedCategoriesFromOrigins(nextOrigins, updatedScreens),
      screenSelectionOrigins: nextOrigins,
      valor_insercao_config: {
        ...(data.valor_insercao_config ?? {}),
        qtd_telas: updatedScreens.length,
      },
    });

    toast.info('Ponto removido da proposta');
  };

  const handleClearAddedPoints = () => {
    onUpdate({
      selectedScreens: [],
      selectedCategories: [],
      screenSelectionOrigins: {},
      valor_insercao_config: {
        ...(data.valor_insercao_config ?? {}),
        qtd_telas: 0,
      },
    });
    toast.success('Todos os pontos foram removidos da proposta');
  };

  const handleConfirmCategorySelection = async () => {
    if (!pendingCategoryId) return;

    const category = CategoryService.getCategoryById(pendingCategoryId);
    if (!category) {
      toast.error('Categoria não encontrada.');
      setPendingCategoryId(null);
      return;
    }

    try {
      setCategorySubmitting(true);
      const categoryScreens = await CategoryService.getScreensByCategory(
        pendingCategoryId,
        getCategorySpecialties(pendingCategoryId)
      );
      const categoryScreenIds = categoryScreens.map((screen) => screen.id);
      const currentSelected = data.selectedScreens as number[];
      const currentSet = new Set(currentSelected);
      const combined = combineIds<number>(currentSelected, categoryScreenIds);
      const addedCount = combined.length - currentSelected.length;
      const alreadySelectedCount = categoryScreenIds.filter((id) => currentSet.has(id)).length;

      setScreenCache((prev) => {
        const next = new Map(prev);
        for (const screen of categoryScreens) {
          next.set(Number(screen.id), screen);
        }
        return next;
      });

      const nextOrigins = mergeCategoryOrigins(getScreenOrigins(), categoryScreenIds, category.id, category.label);

      onUpdate({
        selectedScreens: combined,
        selectedCategories: combineIds<string>(data.selectedCategories ?? [], [category.id]),
        categorySpecialties: {
          ...categorySpecialties,
          [category.id]: getCategorySpecialties(category.id),
        },
        screenSelectionOrigins: nextOrigins,
        valor_insercao_config: {
          ...(data.valor_insercao_config ?? {}),
          qtd_telas: combined.length,
        },
      });

      if (addedCount === 0) {
        if (categoryScreenIds.length === 0) {
          toast.info(`Nenhum ponto disponível foi encontrado para a categoria "${category.label}".`);
        } else {
          toast.info(`Todos os pontos da categoria "${category.label}" já estavam na proposta.`);
        }
      } else if (alreadySelectedCount > 0) {
        toast.success(`${addedCount} ponto(s) da categoria "${category.label}" adicionado(s). ${alreadySelectedCount} já estavam selecionados.`);
      } else {
        toast.success(`${addedCount} ponto(s) da categoria "${category.label}" adicionado(s) à proposta.`);
      }

      setPendingCategoryId(null);
    } catch (error) {
      console.error('Erro ao adicionar categoria:', error);
      toast.error('Não foi possível adicionar os pontos da categoria.');
    } finally {
      setCategorySubmitting(false);
    }
  };

  const getUniqueLocations = (selectedIds: number[]) => {
    const selectedScreensData = selectedIds
      .map((id) => screenCache.get(Number(id)))
      .filter(Boolean);
    const locations = (selectedScreensData as any[]).map(s => `${s.city}, ${s.state}`);
    return [...new Set(locations)];
  };

  const renderSelectedPointsSummary = () => {
    const selectedScreensByLocation: Record<string, any[]> = {};
    const selectedFromCache = (data.selectedScreens as number[])
      .map((id) => screenCache.get(Number(id)))
      .filter(Boolean) as any[];

    selectedFromCache.forEach((screen) => {
      const key = `${screen.city}, ${screen.state}`;
      if (!selectedScreensByLocation[key]) selectedScreensByLocation[key] = [];
      selectedScreensByLocation[key].push(screen);
    });

    const entries = Object.entries(selectedScreensByLocation);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Pontos adicionados por praça
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-gray-600">
              Nenhum ponto encontrado no cache local. Tente clicar em "Atualizar/Buscar Telas" e adicionar novamente.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  {data.selectedScreens.length} ponto(s) adicionados na proposta
                </div>
                <Button variant="outline" size="sm" onClick={handleClearAddedPoints}>
                  <X className="w-4 h-4 mr-1" />
                  Limpar todos
                </Button>
              </div>
              {entries.map(([location, locationScreens]) => (
                <div key={location} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{location}</p>
                    <Badge variant="outline">{locationScreens.length} ponto(s)</Badge>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    {locationScreens.map((screen) => {
                      const origin = getScreenOrigins()[String(screen.id)];
                      return (
                        <span key={screen.id} className="inline-flex items-center gap-2 mr-2 mb-1 rounded-md border bg-white px-2 py-1">
                          <span>• {screen.display_name || screen.name} (#{screen.code || screen.id})</span>
                          {origin?.source === 'category' && origin.categoryLabel ? (
                            <Badge variant="outline" className="text-[10px]">
                              {origin.categoryLabel}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              Manual
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => handleRemoveAddedPoint(Number(screen.id))}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderSelectedCategoriesSummary = () => {
    if (selectedCategories.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers3 className="w-5 h-5" />
            Categorias adicionadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {selectedCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2"
              >
                <div>
                  <div className="text-sm font-medium">{category.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {getCategoryCoverageCount(category.id)} ponto(s) atualmente vinculados
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCategorySelectionChange(category.id, false)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Remover categoria
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
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
              {combinedSelectedIds.length} Selecionadas
            </Badge>
            <Badge variant="outline" className="text-lg px-3 py-1">
              <MapPin className="w-4 h-4 mr-2" />
              {getUniqueLocations(combinedSelectedIds).length} Praças
            </Badge>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {screens.length > 0
                ? screens.length
                : usingInventoryOverview
                  ? inventoryMapScreens.length
                  : 0}{' '}
              Disponíveis
            </Badge>
          </div>
      </div>

      {/* Filtros */}
      <ScreenFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        selectedCategoryIds={data.selectedCategories ?? []}
        onCategorySelectChange={handleCategorySelectionChange}
        categorySpecialties={categorySpecialties}
        onCategorySpecialtiesChange={handleCategorySpecialtiesChange}
        loading={loading}
      />

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Mapa das telas
          </CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            {usingInventoryOverview
              ? 'Visão geral: todas as telas ativas com coordenadas. Verde = já na proposta; âmbar = seleção temporária (após usar Buscar Telas); ciano = demais pontos.'
              : 'Somente o resultado da busca atual no mapa. Verde = já na proposta; âmbar = seleção temporária; ciano = demais no resultado.'}
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {hasSearched && screens.length === 0 && loading ? (
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-muted/20 text-sm text-muted-foreground"
              style={{ minHeight: 400 }}
            >
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              Buscando telas…
            </div>
          ) : hasSearched && screens.length === 0 ? (
            <div
              className="flex items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground px-4 text-center"
              style={{ minHeight: 400 }}
            >
              Nenhuma tela encontrada com os filtros atuais. Ajuste os filtros e use Buscar Telas de novo.
            </div>
          ) : loadingInventoryMap && mapScreens.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-muted/20 text-sm text-muted-foreground"
              style={{ minHeight: 400 }}
            >
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              Carregando mapa do inventário…
            </div>
          ) : (
            <ProposalScreensMap
              screens={mapScreens}
              addedToProposalIds={data.selectedScreens as number[]}
              tempSelectedIds={tempSelectedScreens}
              centerCircle={radiusSearchMapContext}
              height={400}
              overviewMode={usingInventoryOverview}
            />
          )}
        </CardContent>
      </Card>

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
              {combinedSelectedIds.length} de {screens.length} selecionadas
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

      {data.selectedScreens.length > 0 && renderSelectedCategoriesSummary()}
      {data.selectedScreens.length > 0 && renderSelectedPointsSummary()}
      
      <AlertDialog
        open={!!pendingCategoryId}
        onOpenChange={(open) => {
          if (!open) setPendingCategoryId(null);
        }}
      >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Adicionar pontos por categoria</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>
                    Deseja adicionar todos os pontos da categoria{' '}
                    <span className="font-semibold text-foreground">
                      "{CategoryService.getCategoryById(pendingCategoryId ?? '')?.label ?? pendingCategoryId}"
                    </span>
                    ?
                  </div>
                  <div>
                    Pontos já selecionados não serão duplicados. Os novos pontos ficarão marcados
                    com a origem da categoria no resumo da proposta.
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingCategoryId(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmCategorySelection();
              }}
              disabled={categorySubmitting}
            >
              {categorySubmitting ? 'Adicionando...' : 'Adicionar pontos'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      
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

  const isDaysPeriod = (data.period_unit ?? 'months') === 'days';

  const handlePeriodUnitChange = (unit: 'months' | 'days') => {
    if (unit === 'days' && (!data.days_period || data.days_period <= 0)) {
      onUpdate({
        period_unit: 'days',
        days_period: 1,
      });
      return;
    }

    if (unit === 'months' && (!data.months_period || data.months_period <= 0)) {
      onUpdate({
        period_unit: 'months',
        months_period: 1,
      });
      return;
    }

    onUpdate({ period_unit: unit });
  };

  const derivedPricingMode = data.cpm_mode === 'valor_insercao' ? 'insertion' : (data.pricing_mode ?? 'cpm');
  const derivedPricingVariant: 'avulsa' | 'especial' | 'ambos' = (() => {
    const types = data.proposal_type || [];
    const hasAvulsa = types.includes('avulsa');
    const hasEspecial = types.includes('projeto') || types.includes('patrocinio_editorial');
    if (hasAvulsa && hasEspecial) return 'ambos';
    if (hasAvulsa) return 'avulsa';
    if (hasEspecial) return 'especial';
    return data.pricing_variant ?? 'avulsa';
  })();
  const audienceMonthlyTotal = Number(
    data.audience_base_monthly ??
    data.valor_insercao_config?.audiencia_mes_base ??
    0
  ) || 0;
  const audiencePeriodLabel = isDaysPeriod ? 'Audiência/Dia' : 'Audiência/Mês';
  const impactsPeriodLabel = isDaysPeriod ? 'Impactos Estimados/Dia' : 'Impactos Estimados/Mês';

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
        audience_monthly_total: audienceMonthlyTotal,
      });

      const variant = derivedPricingVariant;
      const durations = Array.from(new Set([
        ...(Array.isArray(data.film_seconds) ? data.film_seconds : []),
        ...(data.custom_film_seconds ? [data.custom_film_seconds] : []),
      ]))
        .filter((sec): sec is number => typeof sec === 'number' && !Number.isNaN(sec) && sec > 0)
        .sort((a, b) => a - b);

      const breakdown = derivedPricingMode === 'insertion' && metrics
        ? durations.flatMap((sec) => {
            const variantsForBreakdown: Array<'avulsa' | 'especial'> =
              variant === 'ambos' ? ['avulsa', 'especial'] : [variant as 'avulsa' | 'especial'];

            return variantsForBreakdown.map((v) => {
              const price = data.insertion_prices?.[v]?.[sec];
              const discount = data.discounts_per_insertion?.[v]?.[sec];
              const pct = discount?.pct ?? 0;
              const fixed = discount?.fixed ?? 0;
              const effective = typeof price === 'number'
                ? Math.max(price - (price * pct / 100) - fixed, 0)
                : undefined;
              const subtotal = typeof effective === 'number'
                ? effective * metrics.totalInsertions
                : undefined;
              return { duration: sec, unitPrice: effective, subtotal, variant: v };
            });
          })
        : [];

      return { metrics, breakdown };
    } catch (error) {
      console.warn('[ConfigurationStep] Falha ao calcular métricas da proposta:', error);
      return { metrics: null, breakdown: [] };
    }
  }, [data, derivedPricingMode, audienceMonthlyTotal]);

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
                value={isDaysPeriod ? 'days' : 'months'}
                onValueChange={(value) => handlePeriodUnitChange(value as 'months' | 'days')}
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
            {!isDaysPeriod && (
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
            )}
            {/* Dias do Período (mostra apenas quando unit = days) */}
            {isDaysPeriod && (
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
                <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                  <span>Variante:</span>
                  <span className="font-semibold">{derivedPricingVariant === 'avulsa' ? 'Avulsa' : derivedPricingVariant === 'especial' ? 'Especial' : 'Ambos'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <Label htmlFor="avg-audience">{audiencePeriodLabel}</Label>
            <Input
              id="avg-audience"
              type="number"
              min="0"
              step="1"
              value={pricingMetrics?.audiencePerPeriod ?? audienceMonthlyTotal ?? 0}
              readOnly
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Valor calculado automaticamente a partir da audiência das telas selecionadas no inventário.
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
                <p className="text-orange-100 text-xs uppercase tracking-wide">{impactsPeriodLabel}</p>
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
                    <div key={`${item.duration}-${item.variant ?? 'single'}`} className="flex items-center justify-between">
                      <span className="text-orange-100">
                        {item.duration}" {item.variant ? `(${item.variant === 'avulsa' ? 'Avulsa' : 'Especial'})` : ''} → {item.unitPrice !== undefined ? `${formatCurrency(item.unitPrice)} / inserção` : 'Preço não configurado'}
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
  const types = data.proposal_type || [];
  const hasAvulsa = Array.isArray(types) && types.includes('avulsa');
  const hasEspecial = Array.isArray(types) && (types.includes('projeto') || types.includes('patrocinio_editorial'));
  const derivedPricingVariant: 'avulsa' | 'especial' | 'ambos' = hasAvulsa && hasEspecial
    ? 'ambos'
    : hasAvulsa
      ? 'avulsa'
      : hasEspecial
        ? 'especial'
        : ((data.pricing_variant ?? 'avulsa') as 'avulsa' | 'especial' | 'ambos');
  const derivedPricingMode = data.cpm_mode === 'valor_insercao' ? 'insertion' : (data.pricing_mode ?? 'cpm');

  const audienceMonthlyTotal =
    Number(
      data.audience_base_monthly ??
        data.valor_insercao_config?.audiencia_mes_base ??
        0
    ) || 0;

  const isDaysPeriod = (data.period_unit ?? 'months') === 'days';
  const impactsPeriodLabel = isDaysPeriod ? 'Impactos Estimados/Dia' : 'Impactos Estimados/Mês';

  const [locationStats, setLocationStats] = useState<{ states: number; cities: number; pracas: number; total: number }>({ states: 0, cities: 0, pracas: 0, total: 0 });
  const [summaryMapScreens, setSummaryMapScreens] = useState<{ id: number; code?: string; display_name?: string; name?: string; lat?: number | null; lng?: number | null }[]>([]);

  useEffect(() => {
    const run = async () => {
      if (!Array.isArray(data.selectedScreens) || data.selectedScreens.length === 0) return;
      const { data: rows } = await supabase
        .from('screens')
        .select('id, city, state')
        .in('id', data.selectedScreens as number[]);
      const total = (rows || []).length;
      const cities = new Set((rows || []).map(r => `${r.city}`)).size;
      const states = new Set((rows || []).map(r => `${r.state}`)).size;
      const pracas = new Set((rows || []).map(r => `${r.city},${r.state}`)).size;
      setLocationStats({ states, cities, pracas, total });
    };
    run();
  }, [data.selectedScreens]);

  useEffect(() => {
    const ids = data.selectedScreens;
    if (!Array.isArray(ids) || ids.length === 0) {
      setSummaryMapScreens([]);
      return;
    }
    (async () => {
      const { data: rows, error } = await supabase
        .from('v_screens_enriched')
        .select('id, code, display_name, name, lat, lng')
        .in('id', ids as number[]);
      if (error) {
        const { data: fallback } = await supabase
          .from('screens')
          .select('id, code, display_name, name, lat, lng')
          .in('id', ids as number[]);
        setSummaryMapScreens((fallback as any[]) || []);
        return;
      }
      setSummaryMapScreens((rows as any[]) || []);
    })();
  }, [data.selectedScreens]);
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
      audience_monthly_total: audienceMonthlyTotal,
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
                    {PROPOSAL_TYPE_LABELS[type as keyof typeof PROPOSAL_TYPE_LABELS] || String(type)}
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
                <div className="text-xs text-gray-600">Variante: {((data as any).pricing_variant ?? 'avulsa') === 'avulsa' ? 'Avulsa' : ((data as any).pricing_variant === 'especial' ? 'Especial' : 'Ambos')}</div>
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

      {/* Praças e Locais */}
      <Card className="pdf-tight-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 pdf-compact-title">
            <MapPin className="w-5 h-5" /> Praças e Locais
          </CardTitle>
        </CardHeader>
        <CardContent className="pdf-dense-text">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{locationStats.total}</div>
              <div className="text-sm text-gray-600">Telas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{locationStats.pracas}</div>
              <div className="text-sm text-gray-600">Praças</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{locationStats.cities}</div>
              <div className="text-sm text-gray-600">Cidades</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{locationStats.states}</div>
              <div className="text-sm text-gray-600">Estados</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {summaryMapScreens.length > 0 && (
        <Card className="pdf-tight-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 pdf-compact-title">
              <MapPin className="w-5 h-5" />
              Mapa das telas selecionadas
            </CardTitle>
          </CardHeader>
          <CardContent className="pdf-dense-text">
            <ProposalScreensMap
              screens={summaryMapScreens}
              addedToProposalIds={data.selectedScreens as number[]}
              tempSelectedIds={[]}
              allSelectedStyle
              height={380}
            />
          </CardContent>
        </Card>
      )}

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
              <div className="text-sm text-gray-600">{impactsPeriodLabel}</div>
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
                Cálculo com preço por inserção ({derivedPricingVariant === 'avulsa' ? 'Avulsa' : derivedPricingVariant === 'especial' ? 'Especial' : 'Ambos'}),
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
