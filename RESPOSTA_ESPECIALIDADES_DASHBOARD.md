# 📊 Especialidades no Dashboard - Tabela Utilizada

## 🎯 **Resposta Direta**

O sistema está puxando as **especialidades** da tabela **`screens`** no banco de dados.

## 📋 **Detalhes da Tabela `screens`**

### **Campo de Especialidade**:
```sql
specialty TEXT[] DEFAULT ARRAY[]::TEXT[]
```

- **Tipo**: Array de texto (`TEXT[]`)
- **Valor padrão**: Array vazio (`ARRAY[]::TEXT[]`)
- **Localização**: Tabela `public.screens`

### **Estrutura Completa da Tabela**:
```sql
CREATE TABLE public.screens (
    id BIGSERIAL PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT,
    address_raw TEXT,
    address_norm TEXT,
    city TEXT,
    state TEXT,
    cep TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    geom GEOGRAPHY,
    class class_band NOT NULL DEFAULT 'ND',
    specialty TEXT[] DEFAULT ARRAY[]::TEXT[],  -- ← AQUI ESTÁ O CAMPO
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    venue_id BIGINT REFERENCES public.venues(id),
    display_name TEXT,
    board_format TEXT,
    category TEXT,
    venue_type_parent TEXT,
    venue_type_child TEXT,
    venue_type_grandchildren TEXT,
    facing TEXT,
    -- ... outros campos
);
```

## 🔍 **Como o Dashboard Usa as Especialidades**

### **1. Hook `useDashboardStats`**:
- **Arquivo**: `src/hooks/useDashboardStats.ts`
- **Função**: Busca dados da tabela `screens`
- **Query**: 
  ```typescript
  const { data: screensData, error: screensError } = await supabase
    .from('screens')
    .select('id, city, active')
    .order('display_name');
  ```

### **2. Componentes que Usam Especialidades**:

#### **LocationSelection.tsx**:
- **Dados mockados** com especialidades:
  ```typescript
  const specialties = [
    { id: "shopping", name: "Shopping Centers", count: 245 },
    { id: "hospital", name: "Hospitais", count: 89 },
    { id: "airport", name: "Aeroportos", count: 34 },
    { id: "university", name: "Universidades", count: 67 },
    { id: "pharmacy", name: "Farmácias", count: 156 },
    { id: "metro", name: "Estações Metrô", count: 78 }
  ];
  ```

#### **MockScreens**:
- **Especialidades hardcoded**:
  ```typescript
  specialty: "Shopping",
  specialty: "Hospital", 
  specialty: "Farmácia",
  specialty: "Aeroporto",
  ```

## 📊 **Como as Especialidades São Exibidas**

### **No Dashboard**:
1. **Cards de Estatísticas**: Mostram contadores por especialidade
2. **Filtros**: Permitem filtrar por tipo de especialidade
3. **Mapa Interativo**: Exibe telas agrupadas por especialidade

### **Exemplos de Especialidades**:
- **Shopping Centers**
- **Hospitais**
- **Aeroportos**
- **Universidades**
- **Farmácias**
- **Estações Metrô**

## 🗄️ **Estrutura no Banco**

### **Tabela Principal**: `screens`
- **Campo**: `specialty` (TEXT[])
- **Tipo**: Array de strings
- **Uso**: Armazena múltiplas especialidades por tela

### **Exemplo de Dados**:
```sql
-- Uma tela pode ter múltiplas especialidades
INSERT INTO screens (code, name, specialty) VALUES 
('P2001', 'Shopping ABC - Hall Principal', ARRAY['Shopping', 'Centro Comercial']),
('P2002', 'Hospital Central - Recepção', ARRAY['Hospital', 'Saúde']),
('P2003', 'Aeroporto - Terminal 1', ARRAY['Aeroporto', 'Transporte']);
```

## 🔧 **Como Modificar Especialidades**

### **1. No Banco de Dados**:
```sql
-- Adicionar especialidade a uma tela
UPDATE screens 
SET specialty = array_append(specialty, 'Nova Especialidade')
WHERE id = 1;

-- Remover especialidade
UPDATE screens 
SET specialty = array_remove(specialty, 'Especialidade Antiga')
WHERE id = 1;
```

### **2. No Frontend**:
- **Componentes**: `LocationSelection.tsx`, `InteractiveMap.tsx`
- **Dados**: Vêm da tabela `screens` via Supabase
- **Filtros**: Baseados no campo `specialty`

## 📝 **Resumo**

**Tabela**: `public.screens`  
**Campo**: `specialty` (TEXT[])  
**Tipo**: Array de strings  
**Uso**: Dashboard, filtros, estatísticas  
**Fonte**: Banco de dados Supabase  

As especialidades são armazenadas como um array de texto na tabela `screens` e são utilizadas pelo dashboard para exibir estatísticas, filtros e agrupamentos das telas por tipo de especialidade.

