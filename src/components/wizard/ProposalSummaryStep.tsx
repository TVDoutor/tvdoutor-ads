import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, MapPin, Monitor, Calendar, Clock, DollarSign, Target, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ProposalData } from "../NewProposalWizard";

interface Screen {
  id: number;
  name: string;
  city: string;
  state: string;
  class: string;
}

interface ProposalSummaryStepProps {
  data: ProposalData;
  onUpdate: (updates: Partial<ProposalData>) => void;
}

export const ProposalSummaryStep = ({ data }: ProposalSummaryStepProps) => {
  const [selectedScreens, setSelectedScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSelectedScreens();
  }, [data.selectedScreens]);

  const fetchSelectedScreens = async () => {
    if (data.selectedScreens.length === 0) {
      setSelectedScreens([]);
      setLoading(false);
      return;
    }

    try {
      const { data: screens, error } = await supabase
        .from('screens')
        .select('id, name, city, state, class')
        .in('id', data.selectedScreens);

      if (error) throw error;
      setSelectedScreens(screens || []);
    } catch (error) {
      console.error('Erro ao buscar telas selecionadas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUniqueLocations = () => {
    const locations = selectedScreens.map(screen => `${screen.city}, ${screen.state}`);
    return [...new Set(locations)];
  };

  const calculateDuration = () => {
    if (!data.start_date || !data.end_date) return 0;
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const calculateTotalInsertions = () => {
    const duration = calculateDuration();
    const hoursPerDay = 10; // Assumindo 10 horas por dia
    return data.insertions_per_hour * hoursPerDay * duration * data.selectedScreens.length;
  };

  const calculateEstimatedImpacts = () => {
    const totalInsertions = calculateTotalInsertions();
    const avgAudiencePerScreen = 100; // Audiência média estimada
    return totalInsertions * avgAudiencePerScreen;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const estimatedValue = () => {
    const baseCPM = data.cpm_value || 25; // CPM padrão se não especificado
    const impacts = calculateEstimatedImpacts();
    const grossValue = (impacts / 1000) * baseCPM;
    const discountAmount = (grossValue * data.discount_pct / 100) + data.discount_fixed;
    return grossValue - discountAmount;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando resumo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Informações da Proposta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Informações da Proposta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cliente</p>
              <p className="font-semibold">{data.customer_name}</p>
              {data.customer_email && (
                <p className="text-sm text-muted-foreground">{data.customer_email}</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tipo de Proposta</p>
              <Badge variant={data.proposal_type === 'projeto' ? 'secondary' : 'default'}>
                {data.proposal_type === 'avulsa' ? 'Veiculação Avulsa' : 'Projeto Especial de Conteúdo'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Telas e Localizações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-secondary" />
            Telas e Localizações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Monitor className="w-4 w-4 text-primary" />
                <p className="font-medium">Telas Selecionadas ({data.selectedScreens.length})</p>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedScreens.map(screen => (
                  <div key={screen.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <span className="text-sm">{screen.name}</span>
                    <Badge variant="outline" className="text-xs">
                      Classe {screen.class}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-secondary" />
                <p className="font-medium">Praças ({getUniqueLocations().length})</p>
              </div>
              <div className="space-y-2">
                {getUniqueLocations().map(location => {
                  const screensInLocation = selectedScreens.filter(s => `${s.city}, ${s.state}` === location);
                  return (
                    <div key={location} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm">{location}</span>
                      <Badge variant="secondary" className="text-xs">
                        {screensInLocation.length} telas
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações da Campanha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" />
            Configurações da Campanha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Período</p>
              <p className="font-semibold">
                {data.start_date && data.end_date ? (
                  <>
                    {new Date(data.start_date).toLocaleDateString('pt-BR')} - {new Date(data.end_date).toLocaleDateString('pt-BR')}
                    <span className="block text-sm text-muted-foreground">
                      {calculateDuration()} dias
                    </span>
                  </>
                ) : 'Não definido'}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Filme</p>
              <p className="font-semibold">{data.film_seconds} segundos</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Inserções/Hora</p>
              <p className="font-semibold">{data.insertions_per_hour}x</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Fórmula de Impactos</p>
              <Badge variant="outline">Fórmula {data.impact_formula}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Preço */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Configurações de Preço
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Modo CPM</p>
              <Badge variant={data.cpm_mode === 'manual' ? 'default' : 'secondary'}>
                {data.cpm_mode === 'manual' ? 'Manual' : 'Blended'}
              </Badge>
              {data.cpm_mode === 'manual' && data.cpm_value && (
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(data.cpm_value)}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Desconto %</p>
              <p className="font-semibold">{data.discount_pct}%</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Desconto Fixo</p>
              <p className="font-semibold">{formatCurrency(data.discount_fixed)}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Valor Estimado</p>
              <p className="font-bold text-green-600 text-lg">{formatCurrency(estimatedValue())}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Estimadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Métricas Estimadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-primary">
                {calculateTotalInsertions().toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Inserções Totais</p>
            </div>

            <div className="text-center p-4 bg-secondary/5 rounded-lg">
              <Users className="w-8 h-8 text-secondary mx-auto mb-2" />
              <p className="text-2xl font-bold text-secondary">
                {calculateEstimatedImpacts().toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Impactos Estimados</p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">
                {((calculateEstimatedImpacts() / 1000) * (data.cpm_value || 25)).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </p>
              <p className="text-sm text-muted-foreground">Valor Bruto Estimado</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-green-700 text-sm">
          ✓ Proposta configurada com sucesso! Clique em "Finalizar Proposta" para criar a proposta no sistema.
        </p>
      </div>
    </div>
  );
};