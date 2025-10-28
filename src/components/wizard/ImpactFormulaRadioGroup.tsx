import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useImpactModels } from '@/hooks/useImpactModels';

interface ImpactFormulaRadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
}

export const ImpactFormulaRadioGroup: React.FC<ImpactFormulaRadioGroupProps> = ({ 
  value, 
  onValueChange 
}) => {
  const { models, loading, error } = useImpactModels();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Carregando fórmulas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <RadioGroup
      value={value}
      onValueChange={onValueChange}
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      {models.map((model) => (
        <div key={model.id}>
          <RadioGroupItem value={model.name} id={`formula-${model.id}`} className="peer sr-only" />
          <Label
            htmlFor={`formula-${model.id}`}
            className={`
              flex flex-col rounded-lg border-2 p-6 cursor-pointer transition-all duration-200 hover:shadow-lg
              ${value === model.name 
                ? `border-blue-500 bg-blue-50 shadow-md` 
                : `border-gray-200 bg-white hover:border-gray-300`
              }
            `}
          >
            <div className="text-center mb-4">
              <div className={`text-2xl font-bold mb-1 ${
                value === model.name ? 'text-blue-600' : 'text-gray-700'
              }`}>
                {model.name}
              </div>
              <div className={`text-lg font-semibold ${
                value === model.name ? 'text-blue-600' : 'text-gray-600'
              }`}>
                Tráfego {model.traffic_level}
              </div>
              <div className={`text-sm ${
                value === model.name ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {model.multiplier}x impacto
              </div>
            </div>
            
            <div className="text-center mb-4">
              <p className={`text-sm ${
                value === model.name ? 'text-blue-700' : 'text-gray-600'
              }`}>
                {model.description}
              </p>
            </div>
            
            <div className={`${model.color_scheme.bgColor} ${model.color_scheme.borderColor} border rounded-lg p-3`}>
              <p className={`text-xs font-semibold ${model.color_scheme.textColor} mb-2`}>
                Exemplos de locais:
              </p>
              <ul className={`text-xs ${model.color_scheme.textColor} space-y-1`}>
                {model.examples.map((example, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-1">•</span>
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {value === model.name && (
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
  );
};
