import { useState, useEffect } from 'react';
import { ImpactModelsService, ImpactModel } from '@/lib/impact-models-service';

export function useImpactModels() {
  const [models, setModels] = useState<ImpactModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await ImpactModelsService.getActiveModels();
        setModels(data);
      } catch (err) {
        setError('Erro ao carregar fórmulas de impacto');
        console.error('Erro ao buscar fórmulas:', err);
        // Fallback para fórmulas estáticas em caso de erro
        setModels([
          {
            id: 1,
            name: 'Fórmula A',
            description: 'Para locais com grande movimento de pessoas',
            traffic_level: 'Alto',
            multiplier: 1.5,
            examples: ['Shopping centers movimentados', 'Aeroportos e terminais', 'Hospitais de grande porte'],
            color_scheme: {
              gradient: 'from-green-500 to-emerald-600',
              bgColor: 'bg-green-50',
              borderColor: 'border-green-200',
              textColor: 'text-green-700'
            },
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 2,
            name: 'Fórmula B',
            description: 'Para locais com movimento moderado de pessoas',
            traffic_level: 'Médio',
            multiplier: 1.0,
            examples: ['Farmácias de bairro', 'Clínicas médicas', 'Postos de saúde'],
            color_scheme: {
              gradient: 'from-blue-500 to-cyan-600',
              bgColor: 'bg-blue-50',
              borderColor: 'border-blue-200',
              textColor: 'text-blue-700'
            },
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 3,
            name: 'Fórmula C',
            description: 'Para locais com menor movimento de pessoas',
            traffic_level: 'Baixo',
            multiplier: 0.7,
            examples: ['Consultórios médicos', 'Clínicas especializadas', 'Ambientes corporativos'],
            color_scheme: {
              gradient: 'from-orange-500 to-red-500',
              bgColor: 'bg-orange-50',
              borderColor: 'border-orange-200',
              textColor: 'text-orange-700'
            },
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  return { models, loading, error };
}
