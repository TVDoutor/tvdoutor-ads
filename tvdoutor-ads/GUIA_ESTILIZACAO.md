# 🎨 Guia de Estilização - Identidade Visual

Este guia define os padrões visuais para todas as páginas do sistema, garantindo consistência e qualidade.

---

## 📐 Padrões Visuais

### 1. Header das Páginas

```tsx
import { PageHeader } from '@/components/PageHeader';
import { Stethoscope } from 'lucide-react';

<PageHeader 
  title="Profissionais da Saúde"
  subtitle="Gerencie profissionais e seus vínculos"
  icon={Stethoscope}
  badge={{ label: "12 ativos", color: "bg-green-500/20 text-white" }}
  actions={
    <Button>Novo Profissional</Button>
  }
/>
```

**Classes do Header:**
- `bg-gradient-to-r from-orange-500 to-orange-600`
- `rounded-b-3xl` (cantos inferiores arredondados)
- `shadow-xl`
- `p-6 md:p-8`

---

### 2. Cards

**Padrão Base:**
```tsx
<Card className="bg-white border-0 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 rounded-2xl">
  <CardHeader className="pb-3">
    <CardTitle>Título do Card</CardTitle>
  </CardHeader>
  <CardContent className="p-6">
    {/* Conteúdo */}
  </CardContent>
</Card>
```

**Classes Obrigatórias:**
- `rounded-2xl` ou `rounded-3xl` (cantos arredondados)
- `shadow-lg` (sombra base)
- `hover:shadow-2xl` (sombra no hover)
- `hover:-translate-y-1` (efeito de elevação)
- `transition-all` (transições suaves)

---

### 3. Botões

#### Botão Primário (Ação Principal)
```tsx
<Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 rounded-2xl font-bold">
  Nova Proposta
</Button>
```

#### Botão Secundário
```tsx
<Button className="bg-white text-orange-600 border-2 border-orange-200 hover:bg-orange-50 hover:border-orange-300 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 rounded-2xl font-semibold">
  Cancelar
</Button>
```

#### Botão de Ação em Card
```tsx
<Button variant="outline" className="rounded-xl">
  Visualizar
</Button>
```

---

### 4. Inputs e Formulários

```tsx
<Input className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500" />
```

**Classes:**
- `rounded-xl` (cantos arredondados)
- `border-gray-200` (borda padrão)
- `focus:border-orange-500` (borda laranja no foco)
- `focus:ring-orange-500` (anel laranja no foco)

---

### 5. Badges

#### Status Badge
```tsx
<Badge className="bg-green-500/20 text-green-700 border-green-300 rounded-lg">
  Ativo
</Badge>
```

#### Métrica Badge
```tsx
<Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 rounded-full">
  <TrendingUp className="h-3 w-3 mr-1" />
  +12%
</Badge>
```

---

### 6. Alertas e Notificações

```tsx
<Card className="bg-red-50/50 border-red-200 shadow-lg hover:shadow-xl transition-shadow rounded-2xl">
  <CardHeader className="pb-3">
    <CardTitle className="flex items-center gap-2 text-red-600">
      <AlertTriangle className="h-5 w-5" />
      Alertas Importantes
    </CardTitle>
  </CardHeader>
  <CardContent>
    {/* Lista de alertas */}
  </CardContent>
</Card>
```

---

### 7. Listas e Tabelas

#### Card de Item na Lista
```tsx
<div className="p-4 border rounded-2xl hover:bg-gray-50 hover:shadow-md transition-all cursor-pointer">
  {/* Conteúdo do item */}
</div>
```

**Classes:**
- `rounded-2xl`
- `hover:bg-gray-50`
- `hover:shadow-md`
- `transition-all`

---

### 8. Grid de Cards Estatísticos

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <Card className="bg-white border-0 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 rounded-2xl">
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-orange-50 rounded-xl">
          <FileText className="h-6 w-6 text-orange-600" />
        </div>
        <Badge>+12%</Badge>
      </div>
      <h3 className="text-gray-600 text-sm">Total</h3>
      <p className="text-3xl font-bold text-gray-900">6</p>
    </CardContent>
  </Card>
</div>
```

---

### 9. Ícones em Círculo

```tsx
<div className="p-3 bg-orange-50 rounded-xl hover:scale-110 transition-transform">
  <Icon className="h-6 w-6 text-orange-600" />
</div>
```

**Variações de cor:**
- Orange: `bg-orange-50 text-orange-600`
- Blue: `bg-blue-50 text-blue-600`
- Green: `bg-green-50 text-green-600`
- Purple: `bg-purple-50 text-purple-600`
- Red: `bg-red-50 text-red-600`

---

### 10. Ações Rápidas (Grid)

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <Card className="bg-white border-0 shadow-md hover:shadow-xl transition-all cursor-pointer group hover:-translate-y-1 rounded-2xl">
    <CardContent className="p-6 flex flex-col items-center text-center">
      <div className="p-4 rounded-2xl bg-orange-50 text-orange-600 group-hover:scale-110 transition-transform">
        <Icon className="h-8 w-8" />
      </div>
      <p className="mt-3 font-semibold text-gray-900 text-sm">Ação</p>
    </CardContent>
  </Card>
</div>
```

---

## 🎯 Checklist de Estilização

Ao criar ou atualizar uma página, verifique:

- [ ] Header com `rounded-b-3xl`
- [ ] Cards com `rounded-2xl` ou `rounded-3xl`
- [ ] Sombras: `shadow-lg` base, `hover:shadow-2xl`
- [ ] Hover effect: `hover:-translate-y-1`
- [ ] Transições: `transition-all`
- [ ] Botões com `rounded-2xl`
- [ ] Inputs com `rounded-xl`
- [ ] Ícones em círculos arredondados
- [ ] Paleta de cores consistente (laranja primário)
- [ ] Spacing consistente (p-6, gap-4, etc)

---

## 📝 Exemplo de Página Completa

```tsx
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stethoscope, Plus } from 'lucide-react';

export default function MinhaPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        
        {/* Header */}
        <PageHeader 
          title="Minha Página"
          subtitle="Descrição da página"
          icon={Stethoscope}
          actions={
            <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 rounded-2xl font-bold">
              <Plus className="h-5 w-5 mr-2" />
              Novo Item
            </Button>
          }
        />

        {/* Conteúdo */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
          
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Cards aqui */}
          </div>

          {/* Card de Conteúdo */}
          <Card className="bg-white border-0 shadow-lg hover:shadow-2xl transition-all rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle>Título da Seção</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Conteúdo aqui */}
            </CardContent>
          </Card>

        </div>
      </div>
    </DashboardLayout>
  );
}
```

---

## 🚀 Próximos Passos

1. Aplicar este padrão em todas as páginas principais:
   - ✅ Dashboard
   - ⏳ Inventário
   - ⏳ Farmácias
   - ⏳ Profissionais da Saúde
   - ⏳ Propostas
   - ⏳ Mapa
   - ⏳ Campanhas
   - ⏳ Relatórios
   - ⏳ Projetos

2. Criar componentes reutilizáveis para padrões comuns

3. Documentar novos padrões conforme necessário

---

**Última atualização:** Janeiro 2025
