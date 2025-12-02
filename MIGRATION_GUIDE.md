# 🚀 Guia de Migração Rápida - Novo Design System

## ✅ Página Exemplo: Settings.tsx (COMPLETA)

A página **Settings.tsx** foi completamente redesenhada e serve como referência para todas as outras.

---

## 📋 Checklist de Migração por Página

### Para CADA página, siga estes passos:

### **1. Imports Novos**
Adicionar no topo do arquivo:
```tsx
import { PageHeader } from "@/components/PageHeader";
import { StatsGrid } from "@/components/StatsGrid"; // se tiver stats
```

### **2. Substituir Header Antigo**
**ANTES:**
```tsx
<div className="p-6 space-y-6">
  <div className="flex items-center gap-3">
    <IconeQualquer className="h-8 w-8 text-primary" />
    <div>
      <h1 className="text-3xl font-bold">Título</h1>
      <p className="text-muted-foreground">Descrição</p>
    </div>
  </div>
  {/* Botões de ação */}
</div>
```

**DEPOIS:**
```tsx
<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
  <PageHeader
    icon={IconeQualquer}
    title="Título"
    description="Descrição"
    actions={
      <>
        <Button variant="outline" className="bg-white/10 text-white border-white/30">
          Ação Secundária
        </Button>
        <Button className="bg-white text-[#f48220] hover:bg-white/90 shadow-2xl hover:scale-105 transition-all group">
          <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform" />
          Ação Principal
        </Button>
      </>
    }
  />
  
  <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-12 space-y-8">
    {/* Conteúdo */}
  </div>
</div>
```

### **3. Substituir Stats Cards (se houver)**
**ANTES:**
```tsx
<div className="grid grid-cols-4 gap-4">
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Total</p>
          <h3 className="text-2xl font-bold">{value}</h3>
        </div>
        <Icon className="h-6 w-6" />
      </div>
    </CardContent>
  </Card>
</div>
```

**DEPOIS:**
```tsx
<StatsGrid
  columns={4}
  stats={[
    {
      title: "Total",
      value: "150",
      subtitle: "itens",
      icon: FileText,
      gradient: "bg-gradient-to-br from-[#f48220] to-[#e67516]",
      badge: { label: "+12%", icon: TrendingUp }
    }
  ]}
/>
```

### **4. Atualizar Cards Comuns**
**ANTES:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>
    {/* conteúdo */}
  </CardContent>
</Card>
```

**DEPOIS:**
```tsx
<Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
  <div className="absolute inset-0 bg-gradient-to-br from-[#f48220]/5 to-[#ff9d4d]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
  <CardHeader className="relative z-10">
    <CardTitle className="flex items-center gap-2 text-xl">
      <div className="p-2 bg-[#f48220]/10 rounded-lg group-hover:scale-110 transition-transform">
        <Icon className="h-5 w-5 text-[#f48220]" />
      </div>
      Título
    </CardTitle>
  </CardHeader>
  <CardContent className="relative z-10">
    {/* conteúdo */}
  </CardContent>
</Card>
```

### **5. Atualizar Botões**
**Primário (em background branco):**
```tsx
<Button className="bg-[#f48220] hover:bg-[#e67516] shadow-xl hover:shadow-2xl hover:scale-105 transition-all group">
  <Icon className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" />
  Texto
</Button>
```

**Secundário (outline):**
```tsx
<Button 
  variant="outline"
  className="border-2 hover:bg-[#f48220]/10 hover:border-[#f48220] hover:text-[#f48220] transition-all group"
>
  <Icon className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
  Texto
</Button>
```

**Em Header (sobre fundo laranja):**
```tsx
<Button className="bg-white text-[#f48220] hover:bg-white/90 shadow-2xl hover:shadow-white/50 hover:scale-105 transition-all group">
  <Icon className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform" />
  Texto
</Button>
```

### **6. Atualizar Inputs**
```tsx
<Input 
  className="border-2 border-slate-200 hover:border-[#f48220]/50 focus:border-[#f48220] transition-all"
/>
```

### **7. Atualizar Selects**
```tsx
<Select>
  <SelectTrigger className="h-12 bg-white border-2 border-slate-200 hover:border-[#f48220]/50 focus:border-[#f48220] transition-all">
    <SelectValue />
  </SelectTrigger>
</Select>
```

### **8. Atualizar Badges**
```tsx
<Badge className="bg-[#f48220]/10 text-[#f48220] border-[#f48220]/20 hover:bg-[#f48220]/20">
  Texto
</Badge>
```

### **9. Atualizar Tabs**
```tsx
<TabsList className="grid w-full max-w-[400px] grid-cols-2 h-12 bg-white border-2 border-slate-200 shadow-lg">
  <TabsTrigger 
    value="tab1" 
    className="gap-2 data-[state=active]:bg-[#f48220] data-[state=active]:text-white transition-all"
  >
    <Icon className="h-4 w-4" />
    Nome
  </TabsTrigger>
</TabsList>
```

---

## 🎯 Páginas Específicas

### **Inventário (Inventory.tsx)**
Localizar linha ~1247 e substituir header por:
```tsx
<PageHeader
  icon={Monitor}
  title="Inventário de Telas"
  description="Gerencie e visualize todas as telas do sistema TV Doutor"
  badges={[
    { label: `${stats.total} telas`, variant: "default" },
    { label: `${stats.active} ativas`, variant: "success" }
  ]}
  actions={
    <>
      <Button variant="outline" onClick={handleRefresh}>
        <RefreshCw className="h-5 w-5 mr-2" />
        Atualizar
      </Button>
      <Button variant="outline">
        <Upload className="h-5 w-5 mr-2" />
        Upload CSV
      </Button>
      <Button onClick={handleAddScreen}>
        <Plus className="h-5 w-5 mr-2" />
        Adicionar Tela
      </Button>
    </>
  }
/>
```

Localizar cards de stats (linha ~1291) e substituir por:
```tsx
<StatsGrid
  columns={4}
  stats={[
    {
      title: "Total de Telas",
      value: stats.total,
      icon: Monitor,
      gradient: "bg-gradient-to-br from-[#f48220] to-[#e67516]",
      badge: { label: "Todas", icon: BarChart3 }
    },
    {
      title: "Telas Ativas",
      value: stats.active,
      subtitle: `${stats.activePercentage}% do total`,
      icon: CheckCircle,
      gradient: "bg-gradient-to-br from-[#ffb87a] to-[#ffc499]",
      badge: { label: "Operacionais", icon: Zap }
    },
    {
      title: "Telas Inativas",
      value: stats.inactive,
      subtitle: `${stats.inactivePercentage}% do total`,
      icon: XCircle,
      gradient: "bg-gradient-to-br from-slate-500 to-slate-600"
    },
    {
      title: "Cidades",
      value: stats.cities,
      subtitle: `${stats.locations} localizações`,
      icon: MapPin,
      gradient: "bg-gradient-to-br from-[#ff9d4d] to-[#ffb87a]"
    }
  ]}
/>
```

---

### **Farmácias (Pharmacies.tsx)**
```tsx
<PageHeader
  icon={Building2}
  title="Gerenciamento de Farmácias"
  description="Cadastre, atualize e mantenha o inventário de farmácias integradas ao mapa interativo"
  actions={
    <>
      <Button variant="outline">
        <RefreshCw className="h-5 w-5 mr-2" />
        Atualizar
      </Button>
      <Button variant="outline">
        <Upload className="h-5 w-5 mr-2" />
        Importar
      </Button>
      <Button>
        <Plus className="h-5 w-5 mr-2" />
        Adicionar Farmácia
      </Button>
    </>
  }
/>
```

---

### **Mapa Interativo (InteractiveMap.tsx)**
```tsx
<PageHeader
  icon={MapPin}
  title="Mapa Interativo"
  description="Visualize a rede de telas e farmácias em tempo real"
  badges={[
    { label: "Mapa Ativo", variant: "success" }
  ]}
  actions={
    <>
      <Button variant="outline">
        <RefreshCw className="h-5 w-5 mr-2" />
        Atualizar
      </Button>
      <Button variant="outline">
        <Target className="h-5 w-5 mr-2" />
        Marcadores
      </Button>
    </>
  }
/>
```

---

### **Campanhas (Campaigns.tsx)**
```tsx
<PageHeader
  icon={Target}
  title="Campanhas Publicitárias"
  description="Gerencie e monitore suas campanhas"
  actions={
    <Button>
      <Plus className="h-5 w-5 mr-2" />
      Nova Campanha
    </Button>
  }
/>
```

---

### **Relatórios (Reports.tsx)**
```tsx
<PageHeader
  icon={BarChart3}
  title="Analytics & Relatórios"
  description="Insights detalhados sobre sua performance"
  actions={
    <>
      <Button variant="outline">
        <RefreshCw className="h-5 w-5 mr-2" />
        Atualizar
      </Button>
      <Button>
        <Download className="h-5 w-5 mr-2" />
        Exportar
      </Button>
    </>
  }
/>
```

---

### **Pontos de Venda (Venues.tsx)**
```tsx
<PageHeader
  icon={Building2}
  title="Pontos de Venda"
  description="Gerencie locais e suas telas"
  actions={
    <Button>
      <Plus className="h-5 w-5 mr-2" />
      Novo Ponto
    </Button>
  }
/>
```

---

### **Usuários (Users.tsx ou UserManagement.tsx)**
```tsx
<PageHeader
  icon={Users}
  title="Gestão de Usuários"
  description="Administre usuários do sistema"
  actions={
    <>
      <Button variant="outline">
        <FileSpreadsheet className="h-5 w-5 mr-2" />
        Exportar
      </Button>
      <Button>
        <Plus className="h-5 w-5 mr-2" />
        Novo Usuário
      </Button>
    </>
  }
/>
```

---

### **Fórmulas de Impacto (ImpactModelsAdmin.tsx)**
```tsx
<PageHeader
  icon={Calculator}
  title="Gerenciar Fórmulas de Impacto"
  description="Configure e gerencie as fórmulas de cálculo de impacto para campanhas"
  actions={
    <Button>
      <Plus className="h-5 w-5 mr-2" />
      Nova Fórmula
    </Button>
  }
/>
```

---

## 🎨 Paleta de Cores por Contexto

### Stats Cards
- **Principal/Total**: `from-[#f48220] to-[#e67516]`
- **Positivo/Ativo**: `from-[#ffb87a] to-[#ffc499]`
- **Médio/Info**: `from-[#ff9d4d] to-[#ffb87a]`
- **Destaque/Importante**: `from-[#d66912] to-[#b85a0f]`
- **Neutro/Inativo**: `from-slate-500 to-slate-600`
- **Negativo/Erro**: `from-red-500 to-red-600`

### Ícones
- **Principal**: `text-[#f48220]`
- **Secundário**: `text-[#ff9d4d]`
- **Terciário**: `text-[#d66912]`
- **Claro**: `text-[#ffb87a]`

---

## ⚡ Atalhos Rápidos

### Buscar e Substituir (VS Code)

1. **Header antigo → PageHeader:**
   - Buscar: `<div className="flex.*justify-between`
   - Substituir manualmente seguindo o template

2. **Cards simples → Cards com efeitos:**
   - Buscar: `<Card>`
   - Substituir: `<Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300">`

3. **Botões primários:**
   - Buscar: `className=".*primary.*"`
   - Adicionar: `hover:scale-105 transition-all`

4. **Inputs:**
   - Adicionar: `border-2 hover:border-[#f48220]/50 focus:border-[#f48220]`

---

## ✅ Checklist Final por Página

- [ ] PageHeader implementado
- [ ] StatsGrid implementado (se houver stats)
- [ ] Cards com hover effects
- [ ] Botões com animações
- [ ] Inputs com border laranja
- [ ] Badges atualizados
- [ ] Tabs atualizados
- [ ] Background gradient aplicado
- [ ] Container max-w-7xl
- [ ] Padding e spacing corretos
- [ ] Sem erros de lint
- [ ] Testado navegação e funcionalidades

---

## 📌 Exemplo Completo

Veja **src/pages/Settings.tsx** como referência completa de implementação.

---

**Próximos Passos:**
1. Aplicar em uma página por vez
2. Testar funcionalidade
3. Verificar responsividade
4. Marcar como concluída

**Estimativa:** 30-45min por página (dependendo da complexidade)

