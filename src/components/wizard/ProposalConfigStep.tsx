import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, DollarSign, Play, Target } from "lucide-react";
import type { ProposalData } from "../NewProposalWizard";

interface ProposalConfigStepProps {
  data: ProposalData;
  onUpdate: (updates: Partial<ProposalData>) => void;
}

const FILM_DURATIONS = [
  { value: 15, label: '15 segundos' },
  { value: 30, label: '30 segundos' },
  { value: 45, label: '45 segundos' },
  { value: 60, label: '60 segundos' },
];

const INSERTION_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}x por hora`
}));

export const ProposalConfigStep = ({ data, onUpdate }: ProposalConfigStepProps) => {
  const [customFilmDuration, setCustomFilmDuration] = useState<string>('');
  const [isCustomDuration, setIsCustomDuration] = useState(false);

  const handleFilmDurationChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomDuration(true);
      setCustomFilmDuration('');
    } else {
      setIsCustomDuration(false);
      onUpdate({ film_seconds: parseInt(value) });
    }
  };

  const handleCustomDurationChange = (value: string) => {
    setCustomFilmDuration(value);
    const seconds = parseInt(value);
    if (!isNaN(seconds) && seconds > 0) {
      onUpdate({ film_seconds: seconds });
    }
  };

  const calculateMonthlyInsertions = () => {
    if (!data.start_date || !data.end_date) return 0;
    
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Assumindo 10 horas por dia de funcionamento médio
    const hoursPerDay = 10;
    return data.insertions_per_hour * hoursPerDay * days;
  };

  const calculateImpacts = () => {
    // Cálculo simplificado de impactos
    // Assumindo uma audiência média de 100 pessoas por tela por dia
    const avgAudiencePerScreen = 100;
    const totalInsertions = calculateMonthlyInsertions();
    return data.selectedScreens.length * avgAudiencePerScreen * totalInsertions;
  };

  const isConfigValid = () => {
    return data.start_date && 
           data.end_date && 
           data.film_seconds > 0 &&
           data.insertions_per_hour > 0 &&
           (data.cpm_mode === 'blended' || (data.cpm_mode === 'manual' && data.cpm_value && data.cpm_value > 0));
  };

  return (
    <div className="space-y-6">
      {/* Período da Campanha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Período da Campanha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Data de Início *</Label>
              <Input
                id="start_date"
                type="date"
                value={data.start_date || ''}
                onChange={(e) => onUpdate({ start_date: e.target.value })}
                className={data.start_date ? 'border-green-500' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Data de Fim *</Label>
              <Input
                id="end_date"
                type="date"
                value={data.end_date || ''}
                onChange={(e) => onUpdate({ end_date: e.target.value })}
                min={data.start_date}
                className={data.end_date ? 'border-green-500' : ''}
              />
            </div>
          </div>

          {data.start_date && data.end_date && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-sm">
                📅 Duração: {Math.ceil((new Date(data.end_date).getTime() - new Date(data.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} dias
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configurações do Filme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-secondary" />
            Configurações do Filme
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Duração do Filme</Label>
            <Select
              value={isCustomDuration ? 'custom' : data.film_seconds.toString()}
              onValueChange={handleFilmDurationChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILM_DURATIONS.map(duration => (
                  <SelectItem key={duration.value} value={duration.value.toString()}>
                    {duration.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isCustomDuration && (
            <div className="space-y-2">
              <Label htmlFor="custom_duration">Duração Personalizada (segundos)</Label>
              <Input
                id="custom_duration"
                type="number"
                min="1"
                max="300"
                placeholder="Ex: 90"
                value={customFilmDuration}
                onChange={(e) => handleCustomDurationChange(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configurações de Inserção */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            Configurações de Inserção
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Inserções por Hora</Label>
            <Select
              value={data.insertions_per_hour.toString()}
              onValueChange={(value) => onUpdate({ insertions_per_hour: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INSERTION_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {data.start_date && data.end_date && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">Inserções Totais Estimadas</p>
                <p className="text-lg font-bold text-primary">
                  {calculateMonthlyInsertions().toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Impactos Estimados</p>
                <p className="text-lg font-bold text-secondary">
                  {calculateImpacts().toLocaleString()}
                </p>
              </div>
            </div>
          )}
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
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Modo de CPM</Label>
            <Select
              value={data.cpm_mode}
              onValueChange={(value: 'manual' | 'blended') => onUpdate({ cpm_mode: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blended">CPM Blended (Automático)</SelectItem>
                <SelectItem value="manual">CPM Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {data.cpm_mode === 'manual' && (
            <div className="space-y-2">
              <Label htmlFor="cpm_value">Valor do CPM (R$)</Label>
              <Input
                id="cpm_value"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ex: 25.00"
                value={data.cpm_value || ''}
                onChange={(e) => onUpdate({ cpm_value: parseFloat(e.target.value) || 0 })}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount_pct">Desconto (%)</Label>
              <Input
                id="discount_pct"
                type="number"
                min="0"
                max="100"
                placeholder="Ex: 10"
                value={data.discount_pct}
                onChange={(e) => onUpdate({ discount_pct: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_fixed">Desconto Fixo (R$)</Label>
              <Input
                id="discount_fixed"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ex: 500.00"
                value={data.discount_fixed}
                onChange={(e) => onUpdate({ discount_fixed: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fórmula de Impactos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Fórmula de Impactos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card 
              className={`cursor-pointer transition-all ${
                data.impact_formula === 'A' 
                  ? 'ring-2 ring-primary border-primary' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => onUpdate({ impact_formula: 'A' })}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={data.impact_formula === 'A' ? 'default' : 'outline'}>
                    Fórmula A
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Audiência × Inserções/hora × 1
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cálculo padrão de impactos
                </p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${
                data.impact_formula === 'B' 
                  ? 'ring-2 ring-primary border-primary' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => onUpdate({ impact_formula: 'B' })}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={data.impact_formula === 'B' ? 'default' : 'outline'}>
                    Fórmula B
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Audiência × Inserções/hora × Horas ligada
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Considera tempo de funcionamento
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {!isConfigValid() && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-700 text-sm">
            ⚠️ Complete todas as configurações obrigatórias para continuar.
          </p>
        </div>
      )}
    </div>
  );
};