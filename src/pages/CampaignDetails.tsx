import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  DollarSign, 
  Monitor, 
  Plus, 
  Search, 
  MapPin,
  Zap,
  ZapOff,
  Trash2,
  Save
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Campaign {
  id: number;
  name: string;
  customer_name: string | null;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  notes: string | null;
  created_at: string;
}

interface CampaignScreen {
  id: number;
  campaign_id: number;
  screen_id: number;
  quantity: number;
  created_at: string;
  screen: {
    id: number;
    name: string;
    city: string;
    state: string;
    class: string;
    active: boolean;
    lat: number | null;
    lng: number | null;
  };
}

interface AvailableScreen {
  id: number;
  name: string;
  city: string;
  state: string;
  class: string;
  active: boolean;
  lat: number | null;
  lng: number | null;
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800'
};

const statusLabels = {
  draft: 'Rascunho',
  active: 'Ativa',
  paused: 'Pausada',
  completed: 'Concluída',
  cancelled: 'Cancelada'
};

export default function CampaignDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignScreens, setCampaignScreens] = useState<CampaignScreen[]>([]);
  const [availableScreens, setAvailableScreens] = useState<AvailableScreen[]>([]);
  const [selectedScreens, setSelectedScreens] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isAddScreensDialogOpen, setIsAddScreensDialogOpen] = useState(false);
  const [screenSearchTerm, setScreenSearchTerm] = useState('');
  const [screenCityFilter, setScreenCityFilter] = useState('all');
  const [screenStatusFilter, setScreenStatusFilter] = useState('all');
  const [screenClassFilter, setScreenClassFilter] = useState('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    status: 'draft' as Campaign['status'],
    notes: ''
  });

  useEffect(() => {
    if (id) {
      fetchCampaignDetails();
      fetchCampaignScreens();
    }
  }, [id]);

  const fetchCampaignDetails = async () => {
    try {
      console.log('🔍 Buscando detalhes da campanha...');
      
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Erro ao buscar campanha:', error);
        if (error.code === 'PGRST116') {
          toast.error('Campanha não encontrada');
          navigate('/campaigns');
          return;
        }
        throw error;
      }

      console.log('✅ Campanha carregada:', data);
      setCampaign(data);
      setEditData({
        status: data.status,
        notes: data.notes || ''
      });
    } catch (error: any) {
      console.error('💥 Erro ao buscar campanha:', error);
      toast.error(`Erro ao carregar campanha: ${error.message}`);
    }
  };

  const fetchCampaignScreens = async () => {
    try {
      console.log('🔍 Buscando telas da campanha...');
      
      const { data, error } = await supabase
        .from('campaign_screens')
        .select(`
          *,
          screen:screens(*)
        `)
        .eq('campaign_id', id);

      if (error) {
        console.error('❌ Erro ao buscar telas da campanha:', error);
        throw error;
      }

      console.log('✅ Telas da campanha carregadas:', data?.length || 0);
      setCampaignScreens(data || []);
    } catch (error: any) {
      console.error('💥 Erro ao buscar telas da campanha:', error);
      toast.error(`Erro ao carregar telas: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableScreens = async () => {
    try {
      console.log('🔍 Buscando telas disponíveis...');
      
      const { data, error } = await supabase
        .from('screens')
        .select('id, name, city, state, class, active, lat, lng')
        .order('name');

      if (error) {
        console.error('❌ Erro ao buscar telas disponíveis:', error);
        throw error;
      }

      // Filtrar telas que já estão na campanha
      const existingScreenIds = campaignScreens.map(cs => cs.screen_id);
      const available = data?.filter(screen => !existingScreenIds.includes(screen.id)) || [];

      console.log('✅ Telas disponíveis carregadas:', available.length);
      setAvailableScreens(available);
    } catch (error: any) {
      console.error('💥 Erro ao buscar telas disponíveis:', error);
      toast.error(`Erro ao carregar telas disponíveis: ${error.message}`);
    }
  };

  const handleUpdateCampaign = async () => {
    try {
      console.log('📝 Atualizando campanha...');
      
      const { data, error } = await supabase
        .from('campaigns')
        .update({
          status: editData.status,
          notes: editData.notes || null
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao atualizar campanha:', error);
        throw error;
      }

      console.log('✅ Campanha atualizada:', data);
      setCampaign(data);
      setIsEditing(false);
      toast.success('Campanha atualizada com sucesso!');
    } catch (error: any) {
      console.error('💥 Erro ao atualizar campanha:', error);
      toast.error(`Erro ao atualizar campanha: ${error.message}`);
    }
  };

  const handleAddScreens = async () => {
    if (selectedScreens.size === 0) {
      toast.error('Selecione pelo menos uma tela');
      return;
    }

    try {
      console.log('➕ Adicionando telas à campanha...');
      
      const screenData = Array.from(selectedScreens).map(screenId => ({
        campaign_id: parseInt(id!),
        screen_id: screenId,
        quantity: 1
      }));

      const { error } = await supabase
        .from('campaign_screens')
        .insert(screenData);

      if (error) {
        console.error('❌ Erro ao adicionar telas:', error);
        throw error;
      }

      console.log('✅ Telas adicionadas com sucesso');
      toast.success(`${selectedScreens.size} telas adicionadas à campanha`);
      
      setSelectedScreens(new Set());
      setIsAddScreensDialogOpen(false);
      fetchCampaignScreens();
    } catch (error: any) {
      console.error('💥 Erro ao adicionar telas:', error);
      toast.error(`Erro ao adicionar telas: ${error.message}`);
    }
  };

  const handleRemoveScreen = async (campaignScreenId: number, screenName: string) => {
    if (!confirm(`Remover "${screenName}" da campanha?`)) return;

    try {
      console.log('🗑️ Removendo tela da campanha...');
      
      const { error } = await supabase
        .from('campaign_screens')
        .delete()
        .eq('id', campaignScreenId);

      if (error) {
        console.error('❌ Erro ao remover tela:', error);
        throw error;
      }

      console.log('✅ Tela removida com sucesso');
      toast.success('Tela removida da campanha');
      fetchCampaignScreens();
    } catch (error: any) {
      console.error('💥 Erro ao remover tela:', error);
      toast.error(`Erro ao remover tela: ${error.message}`);
    }
  };

  const filteredAvailableScreens = availableScreens.filter(screen => {
    const matchesSearch = !screenSearchTerm || 
      screen.name.toLowerCase().includes(screenSearchTerm.toLowerCase()) ||
      screen.city.toLowerCase().includes(screenSearchTerm.toLowerCase());
    
    const matchesCity = screenCityFilter === 'all' || screen.city === screenCityFilter;
    const matchesStatus = screenStatusFilter === 'all' || 
      (screenStatusFilter === 'active' && screen.active) ||
      (screenStatusFilter === 'inactive' && !screen.active);
    const matchesClass = screenClassFilter === 'all' || screen.class === screenClassFilter;

    return matchesSearch && matchesCity && matchesStatus && matchesClass;
  });

  const availableCities = Array.from(new Set(availableScreens.map(s => s.city))).sort();
  const availableClasses = Array.from(new Set(availableScreens.map(s => s.class))).sort();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatBudget = (budget: number | null) => {
    if (!budget) return '—';
    return budget.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando detalhes...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">Campanha não encontrada</p>
            <Button className="mt-4" onClick={() => navigate('/campaigns')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Campanhas
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/campaigns')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{campaign.name}</h1>
                <Badge className={`${statusColors[campaign.status]}`}>
                  {statusLabels[campaign.status]}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {campaign.customer_name && `Cliente: ${campaign.customer_name}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateCampaign}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Editar Campanha
              </Button>
            )}
          </div>
        </div>

        {/* Campaign Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Período</p>
                  <p className="font-medium">
                    {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Orçamento</p>
                  <p className="font-medium">{formatBudget(campaign.budget)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Telas</p>
                  <p className="font-medium">{campaignScreens.length} telas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{campaign.customer_name || '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <Card>
            <CardHeader>
              <CardTitle>Editar Campanha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={editData.status} 
                    onValueChange={(value: any) => setEditData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="paused">Pausada</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={editData.notes}
                  onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observações sobre a campanha..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {campaign.notes && !isEditing && (
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{campaign.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="screens" className="space-y-4">
          <TabsList>
            <TabsTrigger value="screens">
              Telas ({campaignScreens.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="screens" className="space-y-4">
            {/* Add Screens Dialog */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Telas da Campanha</h3>
              <Dialog open={isAddScreensDialogOpen} onOpenChange={(open) => {
                setIsAddScreensDialogOpen(open);
                if (open) fetchAvailableScreens();
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Adicionar Telas
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Adicionar Telas à Campanha</DialogTitle>
                    <DialogDescription>
                      Selecione as telas que deseja adicionar à campanha
                    </DialogDescription>
                  </DialogHeader>

                  {/* Screen Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-4">
                    <div className="space-y-2">
                      <Label>Buscar</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Nome ou cidade..."
                          value={screenSearchTerm}
                          onChange={(e) => setScreenSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Select value={screenCityFilter} onValueChange={setScreenCityFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as cidades</SelectItem>
                          {availableCities.map(city => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={screenStatusFilter} onValueChange={setScreenStatusFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Classe</Label>
                      <Select value={screenClassFilter} onValueChange={setScreenClassFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as classes</SelectItem>
                          {availableClasses.map(cls => (
                            <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Screen List */}
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    {filteredAvailableScreens.map(screen => (
                      <div key={screen.id} className="flex items-center space-x-2 p-3 hover:bg-muted/50">
                        <Checkbox
                          id={`screen-${screen.id}`}
                          checked={selectedScreens.has(screen.id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedScreens);
                            if (checked) {
                              newSelected.add(screen.id);
                            } else {
                              newSelected.delete(screen.id);
                            }
                            setSelectedScreens(newSelected);
                          }}
                        />
                        <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="font-medium">{screen.name}</p>
                          </div>
                          <div>
                            <p>{screen.city}, {screen.state}</p>
                          </div>
                          <div>
                            <Badge variant={screen.active ? 'default' : 'secondary'}>
                              {screen.class}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            {screen.active ? (
                              <Zap className="w-4 h-4 text-green-600" />
                            ) : (
                              <ZapOff className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="text-xs">
                              {screen.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {filteredAvailableScreens.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground">
                        Nenhuma tela disponível encontrada
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    <p className="text-sm text-muted-foreground">
                      {selectedScreens.size} telas selecionadas
                    </p>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setIsAddScreensDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddScreens} disabled={selectedScreens.size === 0}>
                        Adicionar {selectedScreens.size} Telas
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Campaign Screens List */}
            <div className="grid gap-4">
              {campaignScreens.map(campaignScreen => (
                <Card key={campaignScreen.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {campaignScreen.screen.active ? (
                            <Zap className="w-5 h-5 text-green-600" />
                          ) : (
                            <ZapOff className="w-5 h-5 text-muted-foreground" />
                          )}
                          <div>
                            <h4 className="font-medium">{campaignScreen.screen.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {campaignScreen.screen.city}, {campaignScreen.screen.state}
                            </p>
                          </div>
                        </div>
                        <Badge variant={campaignScreen.screen.active ? 'default' : 'secondary'}>
                          {campaignScreen.screen.class}
                        </Badge>
                        {campaignScreen.screen.lat && campaignScreen.screen.lng && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>Coordenadas OK</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Qtd: {campaignScreen.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveScreen(campaignScreen.id, campaignScreen.screen.name)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {campaignScreens.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Monitor className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">Nenhuma tela adicionada</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Clique em "Adicionar Telas" para começar a selecionar telas para esta campanha
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
