import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Shield, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type NamedOption = { id: number; name: string };

export default function VenueCatalogsAdmin() {
  const { hasRole } = useAuth();
  const [restrictions, setRestrictions] = useState<NamedOption[]>([]);
  const [networks, setNetworks] = useState<NamedOption[]>([]);
  const [newRestriction, setNewRestriction] = useState("");
  const [newNetwork, setNewNetwork] = useState("");
  const [loading, setLoading] = useState(true);

  const canManage = hasRole("admin") || hasRole("super_admin");

  const loadAll = async () => {
    setLoading(true);
    const [rRes, nRes] = await Promise.all([
      supabase.from("venue_restrictions").select("id,name").order("name", { ascending: true }),
      supabase.from("venue_networks").select("id,name").order("name", { ascending: true }),
    ]);

    if (rRes.error || nRes.error) {
      toast.error("Erro ao carregar catálogos de venues");
      setLoading(false);
      return;
    }
    setRestrictions((rRes.data ?? []) as NamedOption[]);
    setNetworks((nRes.data ?? []) as NamedOption[]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const addRestriction = async () => {
    const name = newRestriction.trim();
    if (!name) return;
    const { error } = await supabase.from("venue_restrictions").insert({ name });
    if (error) return toast.error(`Erro ao criar restrição: ${error.message}`);
    setNewRestriction("");
    toast.success("Restrição criada");
    loadAll();
  };

  const addNetwork = async () => {
    const name = newNetwork.trim();
    if (!name) return;
    const { error } = await supabase.from("venue_networks").insert({ name });
    if (error) return toast.error(`Erro ao criar rede: ${error.message}`);
    setNewNetwork("");
    toast.success("Rede criada");
    loadAll();
  };

  const removeRestriction = async (id: number) => {
    const { error } = await supabase.from("venue_restrictions").delete().eq("id", id);
    if (error) return toast.error(`Erro ao excluir restrição: ${error.message}`);
    toast.success("Restrição removida");
    loadAll();
  };

  const removeNetwork = async (id: number) => {
    const { error } = await supabase.from("venue_networks").delete().eq("id", id);
    if (error) return toast.error(`Erro ao excluir rede: ${error.message}`);
    toast.success("Rede removida");
    loadAll();
  };

  if (!canManage) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>Apenas admin/super_admin podem gerenciar catálogos de venues.</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        <PageHeader
          title="Catálogos de Venues"
          subtitle="Gerencie opções de Restrição e Rede"
          icon={ListChecks}
          badges={[{ label: `${restrictions.length + networks.length} opções`, variant: "default" }]}
        />
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Restrições</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="newRestriction">Nova restrição</Label>
                  <Input id="newRestriction" value={newRestriction} onChange={(e) => setNewRestriction(e.target.value)} />
                </div>
                <Button className="self-end" onClick={addRestriction}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {loading ? "Carregando..." : restrictions.map((item) => (
                  <Badge key={item.id} variant="outline" className="py-1 px-2 gap-1">
                    {item.name}
                    {item.name !== "Livre" && (
                      <button type="button" onClick={() => removeRestriction(item.id)}><Trash2 className="h-3 w-3" /></button>
                    )}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Redes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="newNetwork">Nova rede</Label>
                  <Input id="newNetwork" value={newNetwork} onChange={(e) => setNewNetwork(e.target.value)} />
                </div>
                <Button className="self-end" onClick={addNetwork}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {loading ? "Carregando..." : networks.map((item) => (
                  <Badge key={item.id} variant="outline" className="py-1 px-2 gap-1">
                    {item.name}
                    <button type="button" onClick={() => removeNetwork(item.id)}><Trash2 className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
