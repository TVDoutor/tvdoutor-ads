// @ts-nocheck
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { NewProposalWizardImproved, type ProposalData } from "@/components/NewProposalWizardImproved";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import ExcelJS from "exceljs";
import { getScreensByIds } from "@/lib/screen-service";
import { getCapitalInterior, getExportEspaco } from "@/lib/proposal-export-fields";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { emailService } from "@/lib/email-service";
import { normalizeProposalPayload } from "@/lib/proposal-normalizer";
import { loadProposalForEdit } from "@/lib/proposal-loader";
import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  Calendar,
  DollarSign,
  Send
} from "lucide-react";

const NewProposal = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingProposal, setLoadingProposal] = useState(false);
  const [editingProposalId, setEditingProposalId] = useState<number | null>(null);
  const [initialData, setInitialData] = useState<ProposalData | null>(null);
  const [initialStep, setInitialStep] = useState<number>(1);
  const [existingCreatedBy, setExistingCreatedBy] = useState<string | null>(null);
  const [excelOpen, setExcelOpen] = useState(false);
  const [excelUrl, setExcelUrl] = useState<string | null>(null);
  const [excelName, setExcelName] = useState<string>("proposta.xlsx");
  const [currentStep, setCurrentStep] = useState(0);

  // Carregar proposta para edição quando edit=ID na URL
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId) return;
    const id = parseInt(editId, 10);
    if (isNaN(id)) return;
    (async () => {
      setLoadingProposal(true);
      try {
        const result = await loadProposalForEdit(id);
        if (result) {
          setEditingProposalId(id);
          setInitialData(result.data);
          setInitialStep(result.initialStep ?? 1);
          setExistingCreatedBy(result.proposal?.created_by ?? null);
        } else {
          toast.error('Proposta não encontrada ou sem permissão para editar');
          navigate('/propostas');
        }
      } catch (err: any) {
        console.error('Erro ao carregar proposta:', err);
        toast.error('Erro ao carregar proposta: ' + (err?.message || ''));
        navigate('/propostas');
      } finally {
        setLoadingProposal(false);
      }
    })();
  }, [searchParams, navigate]);

  const handleAutoSave = useCallback(async (data: ProposalData, currentStep: number = 1) => {
    if (!user) return;
    try {
      const payload = normalizeProposalPayload(data, user.id, {
        existingCreatedBy: editingProposalId && existingCreatedBy ? existingCreatedBy : undefined,
        status: 'rascunho',
        lastCompletedStep: currentStep,
      });
      if (editingProposalId) {
        const { error } = await supabase.from('proposals').update(payload).eq('id', editingProposalId);
        if (error) throw error;
        const selected = Array.isArray(data.selectedScreens) ? data.selectedScreens : [];
        const { error: delErr } = await supabase.from('proposal_screens').delete().eq('proposal_id', editingProposalId);
        if (delErr) throw delErr;
        if (selected.length > 0) {
          const rows = selected.map((sid: number | string) => ({
            proposal_id: editingProposalId,
            screen_id: typeof sid === 'string' ? parseInt(sid, 10) : sid,
          }));
          const { error: insErr } = await supabase.from('proposal_screens').insert(rows);
          if (insErr) throw insErr;
        }
      } else {
        const { data: inserted, error } = await supabase.from('proposals').insert(payload).select('id').single();
        if (error) throw error;
        const newId = (inserted as any)?.id;
        if (newId) {
          // Inserir vínculos antes do navigate para evitar corrida com recarga da página / efeitos.
          const selected = Array.isArray(data.selectedScreens) ? data.selectedScreens : [];
          if (selected.length > 0) {
            const rows = selected
              .map((sid: number | string) => {
                const screen_id = typeof sid === 'string' ? parseInt(sid, 10) : sid;
                return { proposal_id: newId, screen_id };
              })
              .filter((r) => Number.isFinite(r.screen_id) && r.screen_id > 0);
            if (rows.length > 0) {
              const { error: linkErr } = await supabase.from('proposal_screens').insert(rows);
              if (linkErr) throw linkErr;
            }
          }
          setEditingProposalId(newId);
          setExistingCreatedBy(user.id);
          navigate(`/nova-proposta?edit=${newId}`, { replace: true });
        }
      }
    } catch (err: any) {
      console.error('Erro no salvamento automático:', err);
      toast.error(err?.message || 'Erro ao salvar rascunho (telas ou dados da proposta).');
    }
  }, [user, editingProposalId, existingCreatedBy, navigate]);

  const handleComplete = async (data: ProposalData) => {
    setLoading(true);
    try {
      // Verificar se o usuário está autenticado
      if (!user) {
        toast.error('Você precisa estar logado para criar uma proposta');
        return;
      }

      console.log('🔍 Dados da proposta antes de inserir:', {
        customer_name: data.customer_name,
        selectedScreens: data.selectedScreens,
        film_seconds: data.film_seconds,
        insertions_per_hour: data.insertions_per_hour
      });

      // Centralizar normalização do payload
      const payload = normalizeProposalPayload(data, user.id, {
        existingCreatedBy: editingProposalId && existingCreatedBy ? existingCreatedBy : undefined,
        status: 'enviada',
      });

      console.log('✅ Payload pronto:', editingProposalId ? 'atualizar' : 'inserir', payload);

      let proposalId: number | undefined;
      if (editingProposalId) {
        const { error } = await supabase.from('proposals').update(payload).eq('id', editingProposalId);
        if (error) throw error;
        proposalId = editingProposalId;
        const { error: delErr } = await supabase.from('proposal_screens').delete().eq('proposal_id', editingProposalId);
        if (delErr) throw delErr;
      } else {
        const insertQuery = supabase.from('proposals').insert(payload).select('id');
        const { data: insertedRows, error } = await insertQuery;
        if (error) throw error;
        proposalId = Array.isArray(insertedRows) ? insertedRows[0]?.id : (insertedRows as any)?.id;
      }

      const selected = Array.isArray(data.selectedScreens) ? data.selectedScreens : [];
      if (proposalId && selected.length > 0) {
        const rows = selected.map((screenId: number | string) => ({
          proposal_id: proposalId,
          screen_id: typeof screenId === 'string' ? parseInt(screenId, 10) : screenId,
        }));
        const { error: linkError } = await supabase.from('proposal_screens').insert(rows);
        if (linkError) throw linkError;
      }

      toast.success(editingProposalId ? 'Proposta atualizada com sucesso!' : 'Proposta criada com sucesso!');
      
      // Enviar notificação por email e processar imediatamente
      if (proposalId) {
        try {
          await emailService.sendProposalNotification(proposalId, 'proposal_created');
          
          // Forçar processamento imediato
          setTimeout(async () => {
            try {
              const result = await emailService.processAllPendingEmails();
              if (result.successful > 0) {
                toast.success(`Proposta criada e ${result.successful} email(s) enviado(s)!`);
              }
            } catch (processError) {
              console.error('Erro ao processar emails:', processError);
            }
          }, 1000);
          
        } catch (emailError) {
          console.error('Erro ao criar notificações de email:', emailError);
          toast.error('Proposta criada, mas houve erro na configuração dos emails');
        }
      }
      
      if (proposalId) {
        try {
          const selectedIds = Array.isArray(selected) ? selected : [];
          const rows = await getScreensByIds(selectedIds as number[]);
          const extractScreenCode = (r: any): string => {
            const code = String(r?.code ?? '').trim();
            if (code) return code.toUpperCase();
            const name = String(r?.name ?? '').trim();
            if (/^P\d{4,5}(\.\d+)?$/i.test(name)) return name.toUpperCase();
            return '';
          };

          const wb = new ExcelJS.Workbook();
          const ws = wb.addWorksheet('Pontos');
          ws.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Código', key: 'code', width: 14 },
            { header: 'Nome', key: 'name', width: 32 },
            { header: 'Capital / interior', key: 'capital_interior', width: 18 },
            { header: 'Espaço', key: 'espaco', width: 20 },
            { header: 'Classe', key: 'class', width: 12 },
            { header: 'Ambiente', key: 'ambiente', width: 16 },
            { header: 'Restrições', key: 'restricoes', width: 24 },
            { header: 'Programática', key: 'programatica', width: 18 },
            { header: 'CEP', key: 'cep', width: 12 },
            { header: 'Tipo', key: 'type', width: 16 },
            { header: 'Endereço', key: 'address', width: 40 },
            { header: 'Cidade', key: 'city', width: 18 },
            { header: 'Estado', key: 'state', width: 10 },
            { header: 'Venue', key: 'venue_id', width: 12 },
          ];
          const list = (rows || []).map((r: any) => ({
            id: r.id,
            code: extractScreenCode(r),
            // Preferir o nome de exibição (Inventário) para o "Nome" do ponto
            name: r.display_name ?? r.venue_name ?? r.name ?? '',
            capital_interior: getCapitalInterior(r.city, r.state),
            espaco: getExportEspaco(r),
            class: r.class ?? '',
            ambiente: r.ambiente ?? '',
            restricoes: r.restricoes ?? '',
            programatica: r.programatica == null ? '' : (r.programatica ? 'Sim' : 'Não'),
            cep: r.cep ?? '',
            type: r.category ?? r.screen_type ?? '',
            address:
              r.address ??
              r.address_raw ??
              r.google_formatted_address ??
              r.formatted_address ??
              `${r.city ?? ''}${r.state ? ', ' + r.state : ''}`,
            city: r.city ?? '',
            state: r.state ?? '',
            venue_id: r.venue_id ?? '',
          }));
          if (Array.isArray(list)) ws.addRows(list);

          const ws2 = wb.addWorksheet('Resumo');
          const periodUnit = data.period_unit === 'days' ? 'days' : 'months';
          const isDaysPeriod = periodUnit === 'days';
          const rawPeriodValue = isDaysPeriod ? Number(data.days_period ?? 0) : Number(data.months_period ?? 1);
          const periodValue = rawPeriodValue > 0 ? rawPeriodValue : 1;
          const periodLabel = isDaysPeriod ? 'Dias' : 'Meses';
          const insertionsHeader = isDaysPeriod ? 'Inserções/dia' : 'Inserções/mês';
          const audienceHeader = isDaysPeriod ? 'Audi/dia' : 'Audi/mês';
          const impactHeader = isDaysPeriod ? 'Impact/dia' : 'Impact/mês';
          const investBrutoHeader = isDaysPeriod ? 'Invest Bruto/Dia' : 'Invest Bruto/Mês';
          const investAgHeader = isDaysPeriod ? 'Invest Ag. Bruto/Dia' : 'Invest Ag. Bruto/Mês';
          const investPerScreenHeader = isDaysPeriod ? 'Invest/tela/dia' : 'Invest/tela/mês';
          const cpmImpactHeader = isDaysPeriod ? 'CPM/Impact/Dia' : 'CPM/Impact/Mês';
          const negotiatedHeader = isDaysPeriod ? 'Invest.Negociado Diário' : 'Invest.Negociado Mensal';
          const screensCount = Number(data.valor_insercao_config?.qtd_telas ?? selectedIds.length) || 0;
          const insertionsPerHour = Number(data.insertions_per_hour ?? 0) || 0;
          const hoursPerDay = Number(data.horas_operacao_dia ?? 10) || 10;
          const businessDaysPerMonth = Number(data.dias_uteis_mes_base ?? 22) || 22;
          const insertionsPerUnit = Math.round(
            insertionsPerHour * hoursPerDay * screensCount * (isDaysPeriod ? 1 : businessDaysPerMonth)
          );
          const audienceBase = Number(data.valor_insercao_config?.audiencia_mes_base ?? 0);
          const avgAudiencePerInsertion = Number(data.avg_audience_per_insertion ?? 0);
          const audiencePerUnit = (audienceBase && audienceBase > 0)
            ? (isDaysPeriod ? Math.round(audienceBase / Math.max(businessDaysPerMonth, 1)) : audienceBase)
            : (avgAudiencePerInsertion > 0 ? Math.round(avgAudiencePerInsertion * insertionsPerUnit) : undefined);
          const currencyFmt = '"R$" #,##0.00';
          const percentFmt = '0.00%';
          const durations = (Array.isArray(data.film_seconds) ? data.film_seconds : [Number(data.film_seconds || 0)]).filter((sec) => Number(sec) > 0);
          const headerRowLabels = [
            'Filme',
            periodLabel,
            'Inserções/hora',
            insertionsHeader,
            audienceHeader,
            impactHeader,
            'Qtd telas',
            investBrutoHeader,
            investAgHeader,
            'Desc (%)',
            investPerScreenHeader,
            cpmImpactHeader,
            negotiatedHeader,
            'Total Negociado'
          ];

          const makeBold = (row: any) => row.eachCell({ includeEmpty: true }, (cell: any) => { cell.font = { bold: true }; });
          const titleAvRow = ws2.addRow(['Veiculação Avulsa']);
          makeBold(titleAvRow);
          const headerAvRow = ws2.addRow([...headerRowLabels]);
          makeBold(headerAvRow);
          const avulsaRowIdxs: number[] = [];
          durations.forEach((sec) => {
            const row = ws2.addRow([
              `${sec}"`, periodValue, insertionsPerHour, null, audiencePerUnit ?? '', null, screensCount, null, null, (Number(data.discount_pct_avulsa ?? data.discount_pct ?? 0) / 100) || 0, null, null, null, null,
            ]);
            avulsaRowIdxs.push(row.number);
            const r = row.number;
            const insertionsFormula = isDaysPeriod
              ? `C${r}*${hoursPerDay}*G${r}`
              : `C${r}*${hoursPerDay}*G${r}*${businessDaysPerMonth}`;
            row.getCell(4).value = { formula: insertionsFormula };
            row.getCell(6).value = { formula: `E${r}*C${r}` };
            row.getCell(9).value = { formula: `H${r}` };
            row.getCell(11).value = { formula: `M${r}/G${r}` };
            row.getCell(12).value = { formula: `(M${r}/F${r})*1000` };
            row.getCell(13).value = { formula: `I${r}-(I${r}*J${r})` };
            row.getCell(14).value = { formula: `M${r}*B${r}` };
            row.getCell(8).numFmt = currencyFmt;
            row.getCell(9).numFmt = currencyFmt;
            row.getCell(10).numFmt = percentFmt;
            row.getCell(11).numFmt = currencyFmt;
            row.getCell(12).numFmt = currencyFmt;
            row.getCell(13).numFmt = currencyFmt;
            row.getCell(14).numFmt = currencyFmt;
          });

          ws2.addRow([]);
          const titleEspRow = ws2.addRow(['Projeto Especial de Conteúdo']);
          makeBold(titleEspRow);
          const headerEspRow = ws2.addRow([...headerRowLabels]);
          makeBold(headerEspRow);
          const especialRowIdxs: number[] = [];
          durations.forEach((sec) => {
            const row = ws2.addRow([
              `${sec}"`, periodValue, insertionsPerHour, null, audiencePerUnit ?? '', null, screensCount, null, null, (Number(data.discount_pct_especial ?? data.discount_pct ?? 0) / 100) || 0, null, null, null, null,
            ]);
            especialRowIdxs.push(row.number);
            const r = row.number;
            const insertionsFormula = isDaysPeriod
              ? `C${r}*${hoursPerDay}*G${r}`
              : `C${r}*${hoursPerDay}*G${r}*${businessDaysPerMonth}`;
            row.getCell(4).value = { formula: insertionsFormula };
            row.getCell(6).value = { formula: `E${r}*C${r}` };
            row.getCell(9).value = { formula: `H${r}` };
            row.getCell(11).value = { formula: `M${r}/G${r}` };
            row.getCell(12).value = { formula: `(M${r}/F${r})*1000` };
            row.getCell(13).value = { formula: `I${r}-(I${r}*J${r})` };
            row.getCell(14).value = { formula: `M${r}*B${r}` };
            row.getCell(8).numFmt = currencyFmt;
            row.getCell(9).numFmt = currencyFmt;
            row.getCell(10).numFmt = percentFmt;
            row.getCell(11).numFmt = currencyFmt;
            row.getCell(12).numFmt = currencyFmt;
            row.getCell(13).numFmt = currencyFmt;
            row.getCell(14).numFmt = currencyFmt;
          });

          ws2.addRow([]);
          const headerTabela = ws2.addRow(['Veiculação', 'Tempo', 'Inserção Avulsa', 'Inserção Esp. Cont.']);
          makeBold(headerTabela);
          const linhaHorario = ws2.addRow(['2ª a 6ª Feira (5 d.u.)', '08h - 18h - 10h/dia', '', '']);
          const priceAvulsa = (data.insertion_prices?.avulsa ?? {}) as Record<number, number>;
          const priceEspecial = (data.insertion_prices?.especial ?? {}) as Record<number, number>;
          const priceDurations = durations.length ? durations : Object.keys({ ...priceAvulsa, ...priceEspecial }).map((k) => Number(k));
          priceDurations.forEach((sec) => {
            const row = ws2.addRow(['', `${sec}"`, priceAvulsa?.[sec] ?? 0, priceEspecial?.[sec] ?? 0]);
            row.getCell(3).numFmt = currencyFmt;
            row.getCell(4).numFmt = currencyFmt;
          });

          const firstPriceRow = linhaHorario.number + 1;
          avulsaRowIdxs.forEach((r, i) => {
            const priceRow = firstPriceRow + i;
            ws2.getCell(r, 8).value = { formula: `D${r}*C${priceRow}` };
          });
          especialRowIdxs.forEach((r, i) => {
            const priceRow = firstPriceRow + i;
            ws2.getCell(r, 8).value = { formula: `D${r}*D${priceRow}` };
          });

          // CPM base opcional (mantém compatibilidade com fórmulas antigas se necessário)
          ws2.getCell('L12').value = 0;
          ws2.getCell('L12').numFmt = currencyFmt;

          const buffer = await wb.xlsx.writeBuffer();
          const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = URL.createObjectURL(blob);
          setExcelUrl(url);
          setExcelName(`proposta_${proposalId}_pontos.xlsx`);
          setExcelOpen(true);
        } catch (excelError) {
          console.error('Erro ao gerar Excel de pontos:', excelError);
          navigate('/propostas');
        }
      } else {
        navigate('/propostas');
      }
    } catch (error: any) {
      console.error('Erro ao criar proposta:', error);
      toast.error('Erro ao criar proposta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/propostas');
  };

  const steps = [
    { id: 1, title: 'Tipo de Proposta', icon: FileText, description: 'Selecione o tipo de campanha' },
    { id: 2, title: 'Informações do Cliente', icon: Users, description: 'Dados do cliente' },
    { id: 3, title: 'Seleção de Projeto', icon: Calendar, description: 'Escolha o projeto' },
    { id: 4, title: 'Configurações', icon: DollarSign, description: 'Configure a campanha' },
    { id: 5, title: 'Resumo', icon: CheckCircle, description: 'Revise e finalize' },
  ];

  return (
    <DashboardLayout>
      {/* Wrapper ocupa 100% da viewport considerando sidebar fixo */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="flex items-center gap-2"
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <div className="h-8 border-l border-gray-200" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    {editingProposalId ? 'Continuar Proposta' : 'Nova Proposta Comercial'}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {editingProposalId
                      ? 'Continue de onde parou e finalize sua proposta'
                      : 'Crie e configure uma nova proposta para seus clientes'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Salvamento automático ativo
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-gray-700">
                Progresso da Proposta
              </div>
              <div className="text-sm text-gray-500">
                Passo {currentStep + 1} de {steps.length}
              </div>
            </div>
            <Progress value={(currentStep / (steps.length - 1)) * 100} className="h-2" />
            
            {/* Step Indicators */}
            <div className="mt-6 flex justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                
                return (
                  <div key={step.id} className="flex flex-col items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                        isCompleted
                          ? 'bg-primary border-primary text-white'
                          : isActive
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-gray-100 border-gray-300 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div className={`text-xs font-medium ${
                        isActive ? 'text-primary' : isCompleted ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-1 hidden sm:block max-w-24">
                        {step.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content - grid com 1fr para o wizard */}
        <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-0 flex-1 w-full grid grid-rows-[auto_auto_auto] min-h-screen">
          {loading ? (
            <Card>
              <CardContent className="p-12">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Criando Proposta
                    </h3>
                    <p className="text-sm text-gray-500">
                      Processando seus dados e configurando a proposta...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="contents">
              {/* Success Message */}
              <Alert className="border-green-200 bg-green-50 row-start-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Salvamento automático:</strong> Cada etapa preenchida é salva automaticamente. 
                  Você pode sair e voltar depois para continuar de onde parou.
                </AlertDescription>
              </Alert>

              {/* Wizard Component */}
              <Card className="shadow-lg border-0 overflow-visible row-start-2 relative z-10">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-blue-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <FileText className="h-5 w-5 text-primary" />
                    Assistente de Criação de Proposta
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingProposal ? (
                    <div className="p-12 flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
                      <p className="mt-4 text-sm text-gray-500">Carregando proposta...</p>
                    </div>
                  ) : (
                    <NewProposalWizardImproved
                      onComplete={handleComplete}
                      onCancel={handleCancel}
                      editingProposalId={editingProposalId ?? undefined}
                      initialData={initialData ?? undefined}
                      initialStep={initialStep}
                      onAutoSave={handleAutoSave}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Help Panel */}
              <Card className="bg-blue-50/50 border-blue-200 row-start-3 relative z-0 mt-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-blue-600" />
                    Dicas para uma Proposta Eficaz
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-blue-900">Informações Completas</div>
                        <div className="text-blue-700">
                          Preencha todos os dados do cliente para personalizar melhor a proposta.
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Calendar className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-green-900">Prazos Realistas</div>
                        <div className="text-green-700">
                          Defina datas de início e fim que sejam viáveis para execução.
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <DollarSign className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-purple-900">Valores Competitivos</div>
                        <div className="text-purple-700">
                          Ajuste os preços conforme o mercado e valor percebido pelo cliente.
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <Dialog open={excelOpen} onOpenChange={(o)=>{ 
          setExcelOpen(o); 
          if (!o) { if (excelUrl) { URL.revokeObjectURL(excelUrl); setExcelUrl(null); } navigate('/propostas'); }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Arquivo da Proposta</DialogTitle>
              <DialogDescription>Baixe a planilha com todos os pontos selecionados.</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-gray-600">{excelName}</div>
              {excelUrl && (
                <a href={excelUrl} download={excelName} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground">
                  Baixar .xlsx
                </a>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={()=>navigate('/propostas')}>Concluir</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default NewProposal;
