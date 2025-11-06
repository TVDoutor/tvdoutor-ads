import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Briefcase } from "lucide-react";
import type { ProposalData, ProposalType } from "../NewProposalWizard";

interface ProposalInfoStepProps {
  data: ProposalData;
  onUpdate: (updates: Partial<ProposalData>) => void;
}

export const ProposalInfoStep = ({ data, onUpdate }: ProposalInfoStepProps) => {
  const handleTypeSelect = (type: ProposalType) => {
    onUpdate({ proposal_type: type });
  };

  return (
    <div className="space-y-6">
      {/* Tipo de Proposta */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">Tipo de Proposta</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md pdf-tight-card ${
              data.proposal_type === 'avulsa' 
                ? 'ring-2 ring-primary border-primary' 
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => handleTypeSelect('avulsa')}
          >
            <CardContent className="p-6 pdf-dense-text">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold pdf-compact-title">Veiculação Avulsa</h3>
                  {data.proposal_type === 'avulsa' && (
                    <Badge variant="default" className="mt-1">Selecionado</Badge>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Proposta para veiculação padrão de publicidade em telas digitais. 
                Ideal para campanhas tradicionais de marketing e comunicação.
              </p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md pdf-tight-card ${
              data.proposal_type === 'projeto' 
                ? 'ring-2 ring-primary border-primary' 
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => handleTypeSelect('projeto')}
          >
            <CardContent className="p-6 pdf-dense-text">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold pdf-compact-title">Projeto Especial de Conteúdo</h3>
                  {data.proposal_type === 'projeto' && (
                    <Badge variant="secondary" className="mt-1">Selecionado</Badge>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Projeto customizado com conteúdo especial, interatividade ou 
                integração com outras mídias. Requer planejamento específico.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Informações do Cliente */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">Informações do Cliente</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customer_name">Nome do Cliente *</Label>
            <Input
              id="customer_name"
              placeholder="Digite o nome do cliente"
              value={data.customer_name}
              onChange={(e) => onUpdate({ customer_name: e.target.value })}
              className={data.customer_name ? 'border-green-500' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_email">Email do Cliente</Label>
            <Input
              id="customer_email"
              type="email"
              placeholder="cliente@empresa.com.br"
              value={data.customer_email || ''}
              onChange={(e) => onUpdate({ customer_email: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Informações adicionais baseadas no tipo */}
      {data.proposal_type === 'projeto' && (
        <Card className="bg-secondary/5 border-secondary/20 pdf-tight-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 pdf-compact-title">
              <Briefcase className="w-5 h-5 text-secondary" />
              Projeto Especial de Conteúdo
            </CardTitle>
          </CardHeader>
          <CardContent className="pdf-dense-text">
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                <strong>Você selecionou um projeto especial.</strong> Este tipo de proposta permite:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Conteúdo interativo e customizado</li>
                <li>Integração com outras mídias e plataformas</li>
                <li>Experiências imersivas para o público</li>
                <li>Métricas avançadas de engajamento</li>
                <li>Suporte técnico especializado</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {data.customer_name && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">
            ✓ Informações básicas preenchidas. Clique em "Próximo" para selecionar as telas.
          </p>
        </div>
      )}
    </div>
  );
};
