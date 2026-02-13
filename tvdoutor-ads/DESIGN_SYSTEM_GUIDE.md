# 🎨 TV Doutor - Design System Guide

## Paleta de Cores Principal

### Laranja TV Doutor (Cores Primárias)
```css
--primary: #f48220        /* Laranja principal */
--primary-dark: #e67516   /* Laranja escuro */
--primary-darker: #d66912 /* Laranja mais escuro */
--primary-deep: #b85a0f   /* Laranja profundo */
```

### Laranja (Tons Claros)
```css
--primary-light: #ff9d4d   /* Laranja médio-claro */
--primary-lighter: #ffb87a /* Laranja claro */
--primary-soft: #ffc499    /* Laranja suave */
--primary-pale: #ffd4b8    /* Laranja muito claro */
```

### Cores Neutras
```css
--slate-50: #f8fafc
--slate-100: #f1f5f9
--slate-200: #e2e8f0
--slate-500: #64748b
--slate-600: #475569
--white: #ffffff
```

### Cores de Status
```css
--success: #10b981  /* Verde para aceito/sucesso */
--warning: #f59e0b  /* Amarelo para atenção */
--error: #ef4444    /* Vermelho para rejeitado/erro */
--info: #3b82f6     /* Azul para informação */
```

---

## 🎯 Componentes Padrão

### 1. Page Header (Hero Section)
**Uso**: Todas as páginas principais devem ter

```tsx
import { PageHeader } from "@/components/PageHeader";
import { Monitor } from "lucide-react";

<PageHeader
  icon={Monitor}
  title="Nome da Página"
  description="Descrição clara e objetiva"
  badges={[
    { label: "Sistema Online", variant: "success" }
  ]}
  actions={
    <>
      <Button variant="outline" className="bg-white/10 text-white border-white/30">
        Ação Secundária
      </Button>
      <Button className="bg-white text-[#f48220] hover:bg-white/90">
        Ação Principal
      </Button>
    </>
  }
/>
```

**Características**:
- Gradiente laranja de fundo
- Floating orbs animados
- Grid pattern sutil
- Ícone principal com glassmorphism
- Badges informativos
- Botões de ação alinhados à direita

---

### 2. Stats Grid
**Uso**: Cards de métricas/estatísticas

```tsx
import { StatsGrid } from "@/components/StatsGrid";
import { FileText, CheckCircle, Clock } from "lucide-react";

<StatsGrid
  columns={4}
  stats={[
    {
      title: "Total",
      value: "150",
      subtitle: "itens",
      icon: FileText,
      gradient: "bg-gradient-to-br from-[#f48220] to-[#e67516]",
      badge: { label: "+12%", icon: TrendingUp },
      onClick: () => console.log("clicked")
    },
    // ... mais stats
  ]}
/>
```

**Gradientes Recomendados por Tipo**:
- **Principal/Total**: `from-[#f48220] to-[#e67516]`
- **Sucesso/Aceito**: `from-[#ffb87a] to-[#ffc499]`
- **Em Progresso**: `from-[#ff9d4d] to-[#ffb87a]`
- **Destaque**: `from-[#d66912] to-[#b85a0f]`
- **Neutro**: `from-slate-500 to-slate-600`
- **Erro**: `from-red-500 to-red-600`

---

### 3. Cards Padrão

#### Card com Hover Effect
```tsx
<Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white">
  <div className="absolute inset-0 bg-gradient-to-br from-[#f48220]/5 to-[#ff9d4d]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
  <div className="absolute top-0 right-0 w-32 h-32 bg-[#f48220]/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
  
  <CardContent className="p-6 relative z-10">
    {/* Conteúdo */}
  </CardContent>
</Card>
```

**Efeitos Aplicados**:
- `hover:-translate-y-2` - Levanta o card
- `hover:shadow-2xl` - Aumenta sombra
- Gradiente aparece no hover
- Orb flutuante se expande

---

### 4. Botões

#### Botão Principal (Ação Primária)
```tsx
<Button className="bg-[#f48220] hover:bg-[#e67516] text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 font-bold group">
  <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
  Adicionar
</Button>
```

#### Botão Secundário (Outline)
```tsx
<Button 
  variant="outline"
  className="border-2 border-[#f48220] text-[#f48220] hover:bg-[#f48220]/10 hover:scale-105 transition-all"
>
  <Eye className="h-4 w-4 mr-2" />
  Visualizar
</Button>
```

#### Botão em Header (sobre fundo colorido)
```tsx
<Button className="bg-white text-[#f48220] hover:bg-white/90 shadow-2xl hover:shadow-white/50 hover:scale-105 transition-all duration-300 font-bold group">
  <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
  Nova Ação
</Button>
```

---

### 5. Inputs e Filtros

#### Input com Search
```tsx
<div className="relative group">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-[#f48220] transition-colors" />
  <Input
    placeholder="Buscar..."
    className="pl-10 h-12 bg-white border-2 border-slate-200 hover:border-[#f48220]/50 focus:border-[#f48220] transition-all"
  />
</div>
```

#### Select
```tsx
<Select>
  <SelectTrigger className="h-12 bg-white border-2 border-slate-200 hover:border-[#f48220]/50 focus:border-[#f48220] transition-all">
    <SelectValue placeholder="Selecione..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Opção 1</SelectItem>
  </SelectContent>
</Select>
```

---

### 6. Badges

#### Badge Padrão
```tsx
<Badge className="bg-[#f48220]/10 text-[#f48220] border-[#f48220]/20 hover:bg-[#f48220]/20">
  Status
</Badge>
```

#### Badge com Ícone
```tsx
<Badge className="bg-green-500/10 text-green-600 border-green-500/20">
  <CheckCircle className="h-3 w-3 mr-1" />
  Ativo
</Badge>
```

---

### 7. Tabs

```tsx
<Tabs defaultValue="tab1">
  <TabsList className="grid w-full max-w-[400px] grid-cols-2 h-12 bg-white border-2 border-slate-200 shadow-lg">
    <TabsTrigger 
      value="tab1" 
      className="gap-2 data-[state=active]:bg-[#f48220] data-[state=active]:text-white transition-all"
    >
      <Grid3x3 className="h-4 w-4" />
      Grade
    </TabsTrigger>
    <TabsTrigger 
      value="tab2" 
      className="gap-2 data-[state=active]:bg-[#f48220] data-[state=active]:text-white transition-all"
    >
      <List className="h-4 w-4" />
      Lista
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="tab1">
    {/* Conteúdo */}
  </TabsContent>
</Tabs>
```

---

### 8. Loading States

#### Skeleton com Gradiente
```tsx
<div className="flex flex-col items-center justify-center py-20">
  <div className="relative">
    <div className="w-20 h-20 border-4 border-[#f48220]/20 border-t-[#f48220] rounded-full animate-spin" />
    <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-[#f48220] animate-pulse" />
  </div>
  <p className="mt-6 text-lg font-semibold text-slate-600">Carregando...</p>
</div>
```

---

### 9. Empty States

```tsx
<Card className="border-2 border-dashed border-slate-300 bg-white/50 backdrop-blur-sm">
  <CardContent className="p-12 text-center">
    <div className="mx-auto w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-6 shadow-inner">
      <FileText className="h-12 w-12 text-slate-400" />
    </div>
    <h3 className="text-2xl font-bold mb-3 text-slate-800">
      Nenhum item encontrado
    </h3>
    <p className="text-slate-600 mb-6 max-w-sm mx-auto">
      Comece adicionando seu primeiro item.
    </p>
    <Button 
      size="lg"
      className="shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
    >
      <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
      Adicionar Novo
    </Button>
  </CardContent>
</Card>
```

---

## 🎬 Animações e Transições

### Classes Padrão de Transição
```css
/* Hover básico */
transition-all duration-300

/* Hover com transform */
hover:scale-105 transition-all duration-300

/* Hover com translate */
hover:-translate-y-2 transition-all duration-500

/* Rotação de ícone */
group-hover:rotate-90 transition-transform duration-300

/* Opacity fade */
opacity-0 group-hover:opacity-100 transition-opacity duration-500
```

### Animações CSS
- `animate-pulse` - Pulsação suave
- `animate-spin` - Rotação contínua
- `animate-bounce` - Pulo suave

---

## 📐 Espaçamento e Layout

### Container Principal
```tsx
<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
  <PageHeader />
  
  <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-12 space-y-8">
    {/* Conteúdo */}
  </div>
</div>
```

### Grid Responsivo
- 1 coluna: `grid-cols-1`
- 2 colunas: `grid-cols-1 md:grid-cols-2`
- 3 colunas: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- 4 colunas: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- 6 colunas: `grid-cols-2 md:grid-cols-3 lg:grid-cols-6`

### Gaps Padrão
- Pequeno: `gap-3` ou `gap-4`
- Médio: `gap-6`
- Grande: `gap-8`

---

## ✨ Melhores Práticas UX

1. **Feedback Visual Imediato**
   - Todo botão/card deve ter hover effect
   - Transições suaves (300ms - 500ms)
   - Escalas sutis (scale-105)

2. **Hierarquia Visual**
   - Títulos em font-black (900)
   - Subtítulos em font-semibold ou font-medium
   - Corpo em font-normal

3. **Consistência de Cores**
   - Primária: #f48220 (ações principais)
   - Neutro: Slate (fundos, borders)
   - Status: Verde/Amarelo/Vermelho

4. **Acessibilidade**
   - Contraste adequado (texto branco sobre laranja)
   - Tamanhos mínimos de toque (44x44px)
   - Estados de foco visíveis

5. **Responsividade**
   - Mobile first
   - Breakpoints: sm (640px), md (768px), lg (1024px)
   - Grid flexível

---

## 📱 Aplicação em Páginas

### Template de Página Completa

```tsx
import { PageHeader } from "@/components/PageHeader";
import { StatsGrid } from "@/components/StatsGrid";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Monitor, Plus, RefreshCw } from "lucide-react";

const MinhaPage = () => {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        <PageHeader
          icon={Monitor}
          title="Título da Página"
          description="Descrição clara e objetiva"
          actions={
            <>
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="h-5 w-5 mr-2" />
                Atualizar
              </Button>
              <Button onClick={handleAdd}>
                <Plus className="h-5 w-5 mr-2" />
                Adicionar
              </Button>
            </>
          }
        />

        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-12 space-y-8">
          {/* Stats */}
          <StatsGrid stats={statsData} columns={4} />

          {/* Filtros */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            {/* Conteúdo de filtros */}
          </Card>

          {/* Conteúdo Principal */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Cards ou tabela */}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
```

---

## 🎨 Resumo da Identidade Visual

✅ **Cor Principal**: Laranja #f48220 (TV Doutor)  
✅ **Estilo**: Moderno, arrojado, glassmorphism  
✅ **Efeitos**: Hover, scale, translate, glow  
✅ **Animações**: Suaves e profissionais  
✅ **Layout**: Clean, espaçado, respirável  
✅ **UX**: Feedback imediato, hierarquia clara  

---

**Versão**: 1.0  
**Atualizado**: 2025  
**Aplicar em**: Todas as páginas do sistema TV Doutor ADS

