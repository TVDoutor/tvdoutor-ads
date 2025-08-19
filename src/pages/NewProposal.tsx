import React, { useState, useEffect } from "react";
import { ArrowLeft, Save, FileText, Target, Info, ChevronRight, MapPin, Monitor } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProposalProgressBar } from "@/components/ProposalProgressBar";
import { LocationSelection } from "@/components/LocationSelection";
import { useNavigate, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface Screen {
  id: number;
  name: string;
  address: string;
  class: "A" | "B" | "C";
  cpm: number;
  audience: number;
  monthlyRate: number;
  specialties: string[];
  availability: string;
}

interface ProposalData {
  // Cliente
  companyName: string;
  email: string;
  phone: string;
  cnpj: string;
  
  // Campanha
  campaignName: string;
  startDate: string;
  endDate: string;
  estimatedBudget: string;
  segment: string;
  objectives: string;
  
  // Telas selecionadas
  selectedScreens: Screen[];
}

const NewProposal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [proposalData, setProposalData] = useState<ProposalData>({
    companyName: "",
    email: "",
    phone: "",
    cnpj: "",
    campaignName: "",
    startDate: "",
    endDate: "",
    estimatedBudget: "",
    segment: "",
    objectives: "",
    selectedScreens: []
  });

  // Mock user
  const mockUser = {
    name: "João Silva",
    email: "joao@tvdoutorada.com",
    role: "Admin"
  };

  // Verificar se há dados de telas selecionadas vindos do mapa
  useEffect(() => {
    if (location.state?.selectedScreens) {
      setProposalData(prev => ({
        ...prev,
        selectedScreens: location.state.selectedScreens
      }));
      // Se há telas selecionadas, ir direto para o passo 2
      setCurrentStep(2);
    }
  }, [location.state]);

  const handleInputChange = (field: keyof ProposalData, value: string | Screen[]) => {
    setProposalData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Finalizar proposta
      console.log("Proposta finalizada:", proposalData);
      alert("Proposta criada com sucesso!");
      navigate("/");
    }
  };

  const handleSaveDraft = () => {
    console.log("Salvando rascunho:", proposalData);
    alert("Rascunho salvo com sucesso!");
  };

  const handleSelectScreensFromMap = () => {
    navigate("/mapa-interativo", { 
      state: { 
        returnTo: "/nova-proposta",
        selectMode: true 
      } 
    });
  };

  const calculateTotalValue = () => {
    return proposalData.selectedScreens.reduce((sum, screen) => sum + screen.monthlyRate, 0);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Informações da Proposta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Dados do Cliente */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-medium">Dados do Cliente</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="companyName">Nome da Empresa *</Label>
                        <Input
                          id="companyName"
                          placeholder="Ex: Empresa ABC Ltda"
                          value={proposalData.companyName}
                          onChange={(e) => handleInputChange('companyName', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="email">Email de Contato *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="contato@empresa.com"
                          value={proposalData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="(11) 99999-9999"
                          value={proposalData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="cnpj">CNPJ</Label>
                        <Input
                          id="cnpj"
                          placeholder="00.000.000/0000-00"
                          value={proposalData.cnpj}
                          onChange={(e) => handleInputChange('cnpj', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dados da Campanha */}
                  <div className="border-t pt-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-medium">Dados da Campanha</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <Label htmlFor="campaignName">Nome da Campanha *</Label>
                        <Input
                          id="campaignName"
                          placeholder="Ex: Campanha Black Friday 2024"
                          value={proposalData.campaignName}
                          onChange={(e) => handleInputChange('campaignName', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="startDate">Data de Início *</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={proposalData.startDate}
                          onChange={(e) => handleInputChange('startDate', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="endDate">Data de Fim *</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={proposalData.endDate}
                          onChange={(e) => handleInputChange('endDate', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="estimatedBudget">Orçamento Estimado</Label>
                        <Input
                          id="estimatedBudget"
                          placeholder="R$ 50.000"
                          value={proposalData.estimatedBudget}
                          onChange={(e) => handleInputChange('estimatedBudget', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="segment">Segmento</Label>
                        <Select value={proposalData.segment} onValueChange={(value) => handleInputChange('segment', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um segmento" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="varejo">Varejo</SelectItem>
                            <SelectItem value="alimentacao">Alimentação</SelectItem>
                            <SelectItem value="automobilistico">Automobilístico</SelectItem>
                            <SelectItem value="imobiliario">Imobiliário</SelectItem>
                            <SelectItem value="educacao">Educação</SelectItem>
                            <SelectItem value="outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="md:col-span-2">
                        <Label htmlFor="objectives">Objetivos da Campanha</Label>
                        <Textarea
                          id="objectives"
                          rows={3}
                          placeholder="Descreva os objetivos e metas desta campanha..."
                          value={proposalData.objectives}
                          onChange={(e) => handleInputChange('objectives', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Progresso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                    <span>Informações básicas</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-muted rounded-full mr-3"></div>
                    <span>Seleção de locais</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-muted rounded-full mr-3"></div>
                    <span>Configuração da campanha</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-muted rounded-full mr-3"></div>
                    <span>Revisão e finalização</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-600 mt-1" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-2">Dica</h4>
                      <p className="text-sm text-blue-700">
                        Preencha todas as informações básicas para facilitar o cálculo da proposta nas próximas etapas.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Propostas Salvas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Campanha Shopping</p>
                    <p className="text-xs text-muted-foreground">Salvo em 15/12</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Black Friday Mall</p>
                    <p className="text-xs text-muted-foreground">Salvo em 14/12</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Seleção de Locais
                </CardTitle>
              </CardHeader>
              <CardContent>
                {proposalData.selectedScreens.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">
                        Telas Selecionadas ({proposalData.selectedScreens.length})
                      </h3>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleSelectScreensFromMap}
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Selecionar Mais
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {proposalData.selectedScreens.map((screen) => (
                        <Card key={screen.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{screen.name}</h4>
                                <p className="text-xs text-muted-foreground mt-1">{screen.address}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    Classe {screen.class}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    R$ {screen.monthlyRate.toLocaleString('pt-BR')}/mês
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-red-500 hover:text-red-700"
                                onClick={() => {
                                  const updatedScreens = proposalData.selectedScreens.filter(s => s.id !== screen.id);
                                  handleInputChange('selectedScreens', updatedScreens);
                                }}
                              >
                                ×
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    <Card className="bg-primary-soft border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Valor Total Estimado:</span>
                          <span className="text-xl font-bold text-primary">
                            R$ {calculateTotalValue().toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma tela selecionada</h3>
                    <p className="text-muted-foreground mb-6">
                      Selecione as telas no mapa interativo para criar sua proposta
                    </p>
                    <Button onClick={handleSelectScreensFromMap} className="gap-2">
                      <MapPin className="h-4 w-4" />
                      Selecionar Telas no Mapa
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">Configuração da Campanha</h2>
            <p className="text-muted-foreground">Esta etapa será implementada em breve...</p>
          </div>
        );

      case 4:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">Revisão e Finalização</h2>
            <p className="text-muted-foreground">Esta etapa será implementada em breve...</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DashboardLayout user={mockUser}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">Nova Proposta</h1>
              <p className="text-muted-foreground">Crie uma nova proposta comercial</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleSaveDraft}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Rascunho
            </Button>
            <Button onClick={handleNextStep}>
              {currentStep === 4 ? "Finalizar" : "Próximo"}
              {currentStep < 4 && <ChevronRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <ProposalProgressBar currentStep={currentStep} />

        {/* Step Content */}
        <div className="pb-6">
          {renderStepContent()}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewProposal;

