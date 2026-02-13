import { DashboardLayout } from '@/components/DashboardLayout';
import { ScreenForm } from '@/components/ScreenForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, Plus, List, Map } from 'lucide-react';

export default function ScreenManagement() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Telas</h1>
            <p className="text-muted-foreground">
              Cadastre e gerencie as telas do sistema
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Cadastrar
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Listar
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Mapa
            </TabsTrigger>
          </TabsList>

          {/* Tab: Cadastrar */}
          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Nova Tela
                </CardTitle>
                <CardDescription>
                  Preencha os dados da nova tela. O sistema irá automaticamente:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-6">
                  <li>Fazer upload da imagem para o Supabase Storage</li>
                  <li>Geocodificar o endereço usando a Google Maps API</li>
                  <li>Salvar coordenadas (lat/lng) e Google Place ID</li>
                  <li>Armazenar o link público da imagem</li>
                </ul>
                
                <ScreenForm />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Listar */}
          <TabsContent value="list" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Telas</CardTitle>
                <CardDescription>
                  Visualize todas as telas cadastradas no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Funcionalidade de listagem em desenvolvimento</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Mapa */}
          <TabsContent value="map" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Mapa Interativo</CardTitle>
                <CardDescription>
                  Visualize as telas em um mapa interativo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Map className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Mapa interativo em desenvolvimento</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
