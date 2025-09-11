import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calculator, Users, Building2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const SPECIALTIES = [
  'Cardiologia', 'Dermatologia', 'Pediatria', 'Ginecologia', 'Ortopedia',
  'Neurologia', 'Oftalmologia', 'Psiquiatria', 'Urologia', 'Endocrinologia'
];

const CITIES = [
  'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador', 'Brasília',
  'Fortaleza', 'Recife', 'Porto Alegre', 'Manaus', 'Curitiba'
];

interface AudienceResult {
  clinic_count: number;
  estimated_patients_monthly: number;
}

export const AudienceCalculator = () => {
  const [specialty, setSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [result, setResult] = useState<AudienceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCalculate = async () => {
    if (!specialty || !city) {
      setError('Por favor, selecione uma especialidade e uma cidade');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Simulate API call with mock data for now
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockResult = {
        clinic_count: Math.floor(Math.random() * 20) + 5,
        estimated_patients_monthly: Math.floor(Math.random() * 50000) + 10000
      };
      
      setResult(mockResult);
    } catch (err) {
      setError('Erro ao calcular estimativa. Tente novamente.');
      console.error('Error calculating audience:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          <CardTitle>Calculadora de Alcance</CardTitle>
        </div>
        <CardDescription>
          Descubra quantos pacientes você pode alcançar com mídia digital segmentada
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Especialidade Médica</label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma especialidade" />
              </SelectTrigger>
              <SelectContent>
                {SPECIALTIES.map((spec) => (
                  <SelectItem key={spec} value={spec}>
                    {spec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Cidade</label>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma cidade" />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((cityOption) => (
                  <SelectItem key={cityOption} value={cityOption}>
                    {cityOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={handleCalculate} 
          disabled={loading || !specialty || !city}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Calculando...
            </>
          ) : (
            <>
              <Calculator className="w-4 h-4 mr-2" />
              Calcular Alcance
            </>
          )}
        </Button>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {result && (
          <div className="p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 rounded-lg">
            <h3 className="font-semibold text-lg mb-4">Resultado da Simulação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{result.clinic_count}</p>
                  <p className="text-sm text-muted-foreground">Clínicas de {specialty}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Users className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-secondary">
                    {result.estimated_patients_monthly.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-sm text-muted-foreground">Pacientes/mês estimados</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-accent/50 rounded-lg">
              <p className="text-sm">
                <Badge variant="secondary" className="mr-2">💡 Insight</Badge>
                Em {city}, você pode alcançar até <strong>{result.estimated_patients_monthly.toLocaleString('pt-BR')} pacientes</strong> por mês 
                através de telas estrategicamente posicionadas em {result.clinic_count} clínicas especializadas em {specialty}.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};