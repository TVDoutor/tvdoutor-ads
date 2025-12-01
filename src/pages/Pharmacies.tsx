// @ts-nocheck
import { useState, useEffect, useMemo, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Plus, RefreshCw, FileSpreadsheet, Download, Building, MapPin, Crosshair, Trash2, Edit, Eye, Upload, Loader2 } from "lucide-react";
import { 
  fetchAllPharmacies, 
  createPharmacy, 
  updatePharmacyRecord, 
  deletePharmacyRecord, 
  bulkUpsertPharmacies, 
  type PharmacyRecord 
} from "@/lib/pharmacy-service";
import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";

interface PharmacyFormState {
  id?: number;
  nome: string;
  fantasia: string;
  cnpj: string;
  tipo_logradouro: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  grupo: string;
  lat: string;
  lng: string;
}

const emptyForm: PharmacyFormState = {
  id: undefined,
  nome: "",
  fantasia: "",
  cnpj: "",
  tipo_logradouro: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  cep: "",
  grupo: "",
  lat: "",
  lng: ""
};

const mapRecordToForm = (record: PharmacyRecord): PharmacyFormState => ({
  id: record.id,
  nome: record.nome ?? "",
  fantasia: record.fantasia ?? "",
  cnpj: record.cnpj ?? "",
  tipo_logradouro: record.tipo_logradouro ?? "",
  endereco: record.endereco ?? "",
  numero: record.numero ?? "",
  complemento: record.complemento ?? "",
  bairro: record.bairro ?? "",
  cidade: record.cidade ?? "",
  uf: record.uf ?? "",
  cep: record.cep ?? "",
  grupo: record.grupo ?? "",
  lat: record.lat != null ? String(record.lat) : "",
  lng: record.lng != null ? String(record.lng) : ""
});

const mapFormToPayload = (form: PharmacyFormState) => ({
  id: form.id,
  nome: form.nome,
  fantasia: form.fantasia,
  cnpj: form.cnpj,
  tipo_logradouro: form.tipo_logradouro,
  endereco: form.endereco,
  numero: form.numero,
  complemento: form.complemento,
  bairro: form.bairro,
  cidade: form.cidade,
  uf: form.uf,
  cep: form.cep,
  grupo: form.grupo,
  lat: form.lat ? Number(form.lat) : null,
  lng: form.lng ? Number(form.lng) : null
});

const COORDINATE_KEYS = {
  lat: ["lat", "latitude", "Latitude", "LATITUDE"],
  lng: ["lng", "longitude", "Longitude", "LONGITUDE"]
};

const parseCoordinateValue = (value: any): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const extractCoordinateValue = (record: PharmacyRecord, keys: string[]): number | null => {
  for (const key of keys) {
    const rawValue = (record as any)[key];
    const parsed = parseCoordinateValue(rawValue);
    if (parsed !== null) {
      return parsed;
    }
  }
  return null;
};

const normalizePharmacyRecord = (record: PharmacyRecord): PharmacyRecord => {
  const lat = extractCoordinateValue(record, COORDINATE_KEYS.lat);
  const lng = extractCoordinateValue(record, COORDINATE_KEYS.lng);
  return {
    ...record,
    lat,
    lng
  };
};

const hasCoordinates = (record: PharmacyRecord) => record.lat != null && record.lng != null;

const formatAddress = (pharmacy: PharmacyRecord) => {
  const parts = [
    [pharmacy.tipo_logradouro, pharmacy.endereco].filter(Boolean).join(" ").trim(),
    pharmacy.numero,
    pharmacy.complemento
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "Endereço não informado";
};

const formatDigits = (value?: string | null, pattern?: RegExp, mask?: string) => {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (!pattern || !mask) return digits;
  return digits.replace(pattern, mask);
};

const normalizeUf = (value?: string | null) => (value || "").toUpperCase();

const parseBooleanString = (value: any) => {
  if (value === true || value === false) return value;
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  return ["true", "1", "sim", "ativo"].includes(normalized) ? true : ["false", "0", "não", "nao", "inativo"].includes(normalized) ? false : null;
};

const parsePharmacyRow = (row: Record<string, any>): PharmacyRecord => {
  const get = (...keys: string[]) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
        return row[key];
      }
    }
    return null;
  };

  return {
    id: row["ID"] ? Number(row["ID"]) : row["id"] ? Number(row["id"]) : undefined,
    nome: get("Nome", "nome", "Razão Social", "Razao Social"),
    fantasia: get("Fantasia", "Nome Fantasia", "fantasia"),
    cnpj: get("CNPJ", "cnpj"),
    tipo_logradouro: get("Tipo Logradouro", "tipo_logradouro", "Tipo_Logradouro"),
    endereco: get("Endereço", "Endereco", "endereco", "Logradouro", "logradouro"),
    numero: get("Número", "Numero", "numero"),
    complemento: get("Complemento", "complemento"),
    bairro: get("Bairro", "bairro"),
    cidade: get("Cidade", "cidade"),
    uf: normalizeUf(get("UF", "Estado", "uf", "estado")),
    cep: get("CEP", "cep"),
    grupo: get("Grupo", "Rede", "grupo", "rede"),
    lat: get("Latitude", "latitude", "lat") ? Number(get("Latitude", "latitude", "lat")) : null,
    lng: get("Longitude", "longitude", "lng") ? Number(get("Longitude", "longitude", "lng")) : null
  };
};

const Pharmacies = () => {
  const { toast } = useToast();
  const { isAdmin, isManager } = useAuth();

  const [pharmacies, setPharmacies] = useState<PharmacyRecord[]>([]);
  const [filteredPharmacies, setFilteredPharmacies] = useState<PharmacyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [ufFilter, setUfFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [coordFilter, setCoordFilter] = useState("all");
const [appliedFilters, setAppliedFilters] = useState({
  searchTerm: "",
  uf: "all",
  city: "all",
  group: "all",
  coord: "all"
});

  const [formData, setFormData] = useState<PharmacyFormState>(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState<PharmacyRecord | null>(null);
  const [pharmacyToDelete, setPharmacyToDelete] = useState<PharmacyRecord | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [exporting, setExporting] = useState(false);

  const canEdit = isAdmin() || isManager();
  const canDelete = isAdmin();

  const stats = useMemo(() => {
    const total = pharmacies.length;
    const withCoordinates = pharmacies.filter(hasCoordinates).length;
    const withoutCoordinates = total - withCoordinates;
    const totalGroups = new Set(pharmacies.map(p => p.grupo).filter(Boolean)).size;
    return { total, withCoordinates, withoutCoordinates, totalGroups };
  }, [pharmacies]);

  const ufOptions = useMemo(() => {
    const ufs = new Set<string>();
    pharmacies.forEach(p => {
      if (p.uf) ufs.add(p.uf);
    });
    return Array.from(ufs).sort();
  }, [pharmacies]);

  const cityOptions = useMemo(() => {
    const cities = new Set<string>();
    pharmacies.forEach(p => {
      if (p.cidade && (ufFilter === "all" || p.uf === ufFilter)) {
        cities.add(p.cidade);
      }
    });
    return Array.from(cities).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [pharmacies, ufFilter]);

  const groupOptions = useMemo(() => {
    const groups = new Set<string>();
    pharmacies.forEach(p => {
      if (p.grupo) groups.add(p.grupo);
    });
    return Array.from(groups).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [pharmacies]);

const applyFilters = useCallback(() => {
    let data = [...pharmacies];

  const term = appliedFilters.searchTerm.trim().toLowerCase();
  if (term) {
      data = data.filter(p => {
        const values = [
          p.nome,
          p.fantasia,
          p.cidade,
          p.uf,
          p.grupo,
          p.cnpj,
          p.cep,
          p.endereco,
          p.bairro
        ].map(value => (value ?? "").toString().toLowerCase());
        return values.some(value => value.includes(term));
      });
    }

  if (appliedFilters.uf !== "all") {
    data = data.filter(p => p.uf === appliedFilters.uf);
    }

  if (appliedFilters.city !== "all") {
    data = data.filter(p => (p.cidade ?? "").toLowerCase() === appliedFilters.city.toLowerCase());
    }

  if (appliedFilters.group !== "all") {
    data = data.filter(p => p.grupo === appliedFilters.group);
    }

  if (appliedFilters.coord === "with") {
      data = data.filter(hasCoordinates);
  } else if (appliedFilters.coord === "without") {
      data = data.filter(p => !hasCoordinates(p));
    }

    setFilteredPharmacies(data);
}, [pharmacies, appliedFilters]);

  const loadPharmacies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await fetchAllPharmacies();
      const normalized = records.map(normalizePharmacyRecord);
      setPharmacies(normalized);
      setFilteredPharmacies(normalized);
    } catch (err: any) {
      console.error("Erro ao carregar farmácias:", err);
      setError(err.message ?? "Erro ao carregar farmácias");
      toast({
        title: "Erro ao carregar",
        description: err.message ?? "Não foi possível carregar as farmácias. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadPharmacies();
  }, [loadPharmacies]);

useEffect(() => {
  applyFilters();
}, [applyFilters]);

const handleApplyFilters = useCallback(() => {
  setAppliedFilters({
    searchTerm,
    uf: ufFilter,
    city: cityFilter,
    group: groupFilter,
    coord: coordFilter
  });
}, [searchTerm, ufFilter, cityFilter, groupFilter, coordFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadPharmacies();
      toast({
        title: "Dados atualizados",
        description: "Farmácias atualizadas com sucesso."
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenForm = (mode: "create" | "edit", pharmacy?: PharmacyRecord) => {
    if (mode === "create") {
      setFormData(emptyForm);
      setSelectedPharmacy(null);
    } else if (pharmacy) {
      setSelectedPharmacy(pharmacy);
      setFormData(mapRecordToForm(pharmacy));
    }
    setIsViewing(false);
    setIsFormOpen(true);
  };

  const handleViewPharmacy = (pharmacy: PharmacyRecord) => {
    setSelectedPharmacy(pharmacy);
    setIsViewing(true);
    setIsFormOpen(true);
  };

  const handleSavePharmacy = async () => {
    if (!canEdit) {
      toast({
        title: "Permissão negada",
        description: "Você não tem permissão para editar farmácias.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.nome && !formData.fantasia) {
      toast({
        title: "Dados incompletos",
        description: "Informe pelo menos o nome ou fantasia da farmácia.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const payload = mapFormToPayload(formData);
      if (formData.id) {
        await updatePharmacyRecord(formData.id, payload);
        toast({
          title: "Farmácia atualizada",
          description: "Os dados da farmácia foram atualizados com sucesso."
        });
      } else {
        await createPharmacy(payload);
        toast({
          title: "Farmácia criada",
          description: "Nova farmácia adicionada com sucesso."
        });
      }
      setIsFormOpen(false);
      await loadPharmacies();
    } catch (err: any) {
      console.error("Erro ao salvar farmácia:", err);
      toast({
        title: "Erro ao salvar",
        description: err.message ?? "Não foi possível salvar a farmácia.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePharmacy = async () => {
    if (!pharmacyToDelete || !canDelete) {
      setPharmacyToDelete(null);
      return;
    }

    try {
      await deletePharmacyRecord(Number(pharmacyToDelete.id));
      toast({
        title: "Farmácia removida",
        description: "A farmácia foi removida com sucesso."
      });
      setPharmacyToDelete(null);
      await loadPharmacies();
    } catch (err: any) {
      console.error("Erro ao remover farmácia:", err);
      toast({
        title: "Erro ao remover",
        description: err.message ?? "Não foi possível remover a farmácia.",
        variant: "destructive"
      });
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Farmacias");

      worksheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Nome", key: "nome", width: 32 },
        { header: "Fantasia", key: "fantasia", width: 32 },
        { header: "CNPJ", key: "cnpj", width: 20 },
        { header: "Grupo", key: "grupo", width: 24 },
        { header: "Tipo Logradouro", key: "tipo_logradouro", width: 18 },
        { header: "Endereço", key: "endereco", width: 32 },
        { header: "Número", key: "numero", width: 12 },
        { header: "Complemento", key: "complemento", width: 20 },
        { header: "Bairro", key: "bairro", width: 24 },
        { header: "Cidade", key: "cidade", width: 24 },
        { header: "UF", key: "uf", width: 6 },
        { header: "CEP", key: "cep", width: 14 },
        { header: "Latitude", key: "lat", width: 14 },
        { header: "Longitude", key: "lng", width: 14 }
      ];

      pharmacies.forEach(pharmacy => {
        worksheet.addRow({
          id: pharmacy.id,
          nome: pharmacy.nome,
          fantasia: pharmacy.fantasia,
          cnpj: formatDigits(pharmacy.cnpj, /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"),
          grupo: pharmacy.grupo,
          tipo_logradouro: pharmacy.tipo_logradouro,
          endereco: pharmacy.endereco,
          numero: pharmacy.numero,
          complemento: pharmacy.complemento,
          bairro: pharmacy.bairro,
          cidade: pharmacy.cidade,
          uf: pharmacy.uf,
          cep: formatDigits(pharmacy.cep, /^(\d{5})(\d{3})$/, "$1-$2"),
          lat: pharmacy.lat,
          lng: pharmacy.lng
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const fileName = `farmacias_tvdoutor_${new Date().toISOString().split("T")[0]}.xlsx`;
      saveAs(blob, fileName);

      toast({
        title: "Exportação concluída",
        description: `${pharmacies.length} farmácias exportadas com sucesso.`
      });
    } catch (err: any) {
      console.error("Erro ao exportar farmácias:", err);
      toast({
        title: "Erro na exportação",
        description: err.message ?? "Não foi possível exportar os dados.",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const processCSVFile = async (file: File): Promise<any[]> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const lines = text.split(/\r?\n/).filter(line => line.trim());
          if (lines.length < 2) throw new Error("Arquivo CSV deve conter cabeçalho e pelo menos uma linha de dados.");

          const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
          const data: any[] = [];

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(",").map(v => v.trim().replace(/"/g, ""));
            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index] ?? "";
            });
            data.push(row);
          }

          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Erro ao ler arquivo CSV"));
      reader.readAsText(file, "UTF-8");
    });

  const parseFileToPharmacies = async (file: File): Promise<PharmacyRecord[]> => {
    let rows: any[] = [];

    if (file.type === "text/csv" || file.name.endsWith(".csv")) {
      rows = await processCSVFile(file);
    } else {
      const data = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(data);
      const worksheet = workbook.getWorksheet(1);
      if (worksheet) {
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const rowData: any = {};
          row.eachCell((cell, colNumber) => {
            const headerCell = worksheet.getCell(1, colNumber);
            const header = headerCell.text || headerCell.value?.toString() || `col${colNumber}`;
            rowData[header] = cell.text ?? cell.value;
          });
          rows.push(rowData);
        });
      }
    }

    if (!rows.length) throw new Error("Arquivo está vazio ou sem dados válidos.");
    return rows.map(parsePharmacyRow);
  };

  const handleImport = async () => {
    if (!uploadFile) {
      toast({
        title: "Selecione um arquivo",
        description: "Escolha um arquivo CSV ou Excel para importar.",
        variant: "destructive"
      });
      return;
    }

    if (!isAdmin()) {
      toast({
        title: "Permissão negada",
        description: "Apenas administradores podem importar dados.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      setUploadProgress(10);
      toast({
        title: "Importando dados",
        description: "Lendo o arquivo selecionado..."
      });

      const records = await parseFileToPharmacies(uploadFile);
      setUploadProgress(60);
      toast({
        title: "Validando dados",
        description: `${records.length} registros processados. Salvando no banco...`
      });

      const processed = records.map(record => ({
        ...record,
        lat: record.lat ?? null,
        lng: record.lng ?? null
      }));

      const count = await bulkUpsertPharmacies(processed);
      setUploadProgress(100);

      toast({
        title: "Importação concluída",
        description: `${count} registros inseridos ou atualizados com sucesso.`
      });

      setUploadFile(null);
      await loadPharmacies();
    } catch (err: any) {
      console.error("Erro na importação:", err);
      toast({
        title: "Erro na importação",
        description: err.message ?? "Não foi possível importar os dados.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Crosshair className="h-6 w-6 text-red-500" />
              </div>
              Gerenciamento de Farmácias
            </h1>
            <p className="text-muted-foreground mt-1">
              Cadastre, atualize e mantenha o inventário de farmácias integradas ao mapa interativo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Atualizando..." : "Atualizar"}
            </Button>

            {canEdit && (
              <Button onClick={() => handleOpenForm("create")} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Farmácia
              </Button>
            )}

            {isAdmin() && (
              <label className="inline-flex items-center">
                <Input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                  disabled={uploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  disabled={uploading}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel";
                    input.onchange = (event: any) => {
                      if (event.target?.files?.[0]) {
                        setUploadFile(event.target.files[0]);
                      }
                    };
                    input.click();
                  }}
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? `Importando ${uploadProgress}%` : "Importar"}
                </Button>
              </label>
            )}

            {isAdmin() && uploadFile && (
              <Button
                variant="default"
                onClick={handleImport}
                disabled={uploading}
                className="gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {uploading ? "Processando..." : "Enviar Arquivo"}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting || loading}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exportando..." : "Exportar"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.total.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-sm text-muted-foreground">Total de Farmácias</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Building className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.withCoordinates.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-sm text-muted-foreground">Com Coordenadas</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-amber-600">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.withoutCoordinates.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-sm text-muted-foreground">Sem Coordenadas</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Crosshair className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalGroups.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-sm text-muted-foreground">Redes/Grupos</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filtros e Busca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col lg:flex-row items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, cidade, CNPJ, CEP..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={event => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleApplyFilters();
                    }
                  }}
                  className="pl-10"
                />
              </div>

              <Select value={ufFilter} onValueChange={setUfFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as UFs</SelectItem>
                  {ufOptions.map(uf => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Cidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as cidades</SelectItem>
                  {cityOptions.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Rede" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as redes</SelectItem>
                  {groupOptions.map(group => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={coordFilter} onValueChange={setCoordFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Coordenadas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="with">Com coordenadas</SelectItem>
                  <SelectItem value="without">Sem coordenadas</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={handleApplyFilters} className="gap-2">
                <Search className="h-4 w-4" />
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Lista de Farmácias</CardTitle>
              <p className="text-sm text-muted-foreground">
                {loading ? "Carregando..." : `${filteredPharmacies.length.toLocaleString("pt-BR")} farmácias encontradas`}
              </p>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>CEP</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Coordenadas</TableHead>
                  <TableHead className="text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Carregando farmácias...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredPharmacies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Nenhuma farmácia encontrada com os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPharmacies.map(pharmacy => (
                    <TableRow key={pharmacy.id ?? `${pharmacy.nome}-${pharmacy.cnpj}`}>
                      <TableCell className="max-w-[240px]">
                        <div className="font-medium">{pharmacy.nome || pharmacy.fantasia || "Sem nome"}</div>
                        {pharmacy.fantasia && (
                          <div className="text-xs text-muted-foreground">{pharmacy.fantasia}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {pharmacy.grupo ? (
                          <Badge variant="secondary" className="text-xs">{pharmacy.grupo}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem rede</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{pharmacy.cidade}, {pharmacy.uf}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                          {formatAddress(pharmacy)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {formatDigits(pharmacy.cep, /^(\d{5})(\d{3})$/, "$1-$2") || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono">
                          {formatDigits(pharmacy.cnpj, /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {pharmacy.lat != null && pharmacy.lng != null ? (
                          <div className="text-xs text-green-600">
                            {pharmacy.lat.toFixed(4)}, {pharmacy.lng.toFixed(4)}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem coordenadas</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewPharmacy(pharmacy)}
                            title="Visualizar detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenForm("edit", pharmacy)}
                              title="Editar farmácia"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}

                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => setPharmacyToDelete(pharmacy)}
                              title="Excluir farmácia"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={open => { setIsFormOpen(open); if (!open) setIsViewing(false); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {isViewing ? "Detalhes da Farmácia" : formData.id ? "Editar Farmácia" : "Nova Farmácia"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                disabled={isViewing}
                placeholder="Nome oficial"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fantasia">Nome Fantasia</Label>
              <Input
                id="fantasia"
                value={formData.fantasia}
                onChange={e => setFormData(prev => ({ ...prev, fantasia: e.target.value }))}
                disabled={isViewing}
                placeholder="Nome fantasia"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={e => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                disabled={isViewing}
                placeholder="Somente números"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grupo">Rede/Grupo</Label>
              <Input
                id="grupo"
                value={formData.grupo}
                onChange={e => setFormData(prev => ({ ...prev, grupo: e.target.value }))}
                disabled={isViewing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_logradouro">Tipo de Logradouro</Label>
              <Input
                id="tipo_logradouro"
                value={formData.tipo_logradouro}
                onChange={e => setFormData(prev => ({ ...prev, tipo_logradouro: e.target.value }))}
                disabled={isViewing}
                placeholder="Rua, Avenida, Alameda..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                value={formData.endereco}
                onChange={e => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                disabled={isViewing}
                placeholder="Nome da rua/avenida"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                value={formData.numero}
                onChange={e => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                disabled={isViewing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="complemento">Complemento</Label>
              <Input
                id="complemento"
                value={formData.complemento}
                onChange={e => setFormData(prev => ({ ...prev, complemento: e.target.value }))}
                disabled={isViewing}
                placeholder="Sala, conjunto, loja..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={formData.bairro}
                onChange={e => setFormData(prev => ({ ...prev, bairro: e.target.value }))}
                disabled={isViewing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={formData.cidade}
                onChange={e => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                disabled={isViewing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="uf">UF</Label>
              <Input
                id="uf"
                maxLength={2}
                value={formData.uf}
                onChange={e => setFormData(prev => ({ ...prev, uf: e.target.value.toUpperCase() }))}
                disabled={isViewing}
                placeholder="UF"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                value={formData.cep}
                onChange={e => setFormData(prev => ({ ...prev, cep: e.target.value }))}
                disabled={isViewing}
                placeholder="Somente números"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                value={formData.lat}
                onChange={e => setFormData(prev => ({ ...prev, lat: e.target.value }))}
                disabled={isViewing}
                placeholder="-23.5505"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                value={formData.lng}
                onChange={e => setFormData(prev => ({ ...prev, lng: e.target.value }))}
                disabled={isViewing}
                placeholder="-46.6333"
              />
            </div>
          </div>

          {!isViewing && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSavePharmacy} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

  <AlertDialog open={!!pharmacyToDelete} onOpenChange={open => !open && setPharmacyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover farmácia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Deseja remover a farmácia{" "}
              <strong>{pharmacyToDelete?.nome ?? pharmacyToDelete?.fantasia}</strong> permanentemente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePharmacy} className="bg-destructive hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Pharmacies;

