# Localização dos Modelos de Impacto - TV Doutor ADS

## 📍 Onde Estão os Dados dos Modelos de Impacto

### 1. **Interface de Seleção** (Frontend)
**Arquivo**: `src/components/wizard/ProposalWizardSteps.tsx` (linhas 776-906)

**Conteúdo**:
- Definição visual das 3 fórmulas (A, B, C)
- Descrições e exemplos de locais para cada fórmula
- Interface de seleção com radio buttons

```typescript
// Fórmulas definidas no código:
{
  id: 'A',
  title: 'Fórmula A',
  subtitle: 'Tráfego Alto',
  description: 'Para locais com grande movimento de pessoas',
  details: [
    'Shopping centers movimentados',
    'Aeroportos e terminais',
    'Hospitais de grande porte',
    'Centros comerciais principais'
  ]
}
```

### 2. **Lógica de Cálculo** (Frontend)
**Arquivo**: `src/components/wizard/ProposalConfigStep.tsx` (linhas 68-74)

**Conteúdo**:
- Função `calculateImpacts()` que calcula impactos
- Cálculo simplificado baseado em audiência média

```typescript
const calculateImpacts = () => {
  const avgAudiencePerScreen = 100;
  const totalInsertions = calculateMonthlyInsertions();
  return data.selectedScreens.length * avgAudiencePerScreen * totalInsertions;
};
```

### 3. **Configurações de Alcance por Classe** (Frontend)
**Arquivo**: `src/components/landing/AudienceCalculator.tsx` (linhas 49-60)

**Conteúdo**:
- Mapeamento de alcance por classe de tela
- Valores fixos para cada classe

```typescript
const reachByClass = {
  'A': 2000,
  'AB': 1800,
  'ABC': 1700,
  'B': 1500,
  'BC': 1300,
  'C': 1200,
  'CD': 1100,
  'D': 1000,
  'E': 900,
  'ND': 800
};
```

### 4. **Banco de Dados** (Backend)
**Tabela**: `proposals` (coluna `impact_formula`)
**Tipo**: `text` com constraint `CHECK (impact_formula IN ('A','B'))`
**Valor padrão**: `'A'`

**Migração**: `supabase/migrations/20250902174844_af7ad348-3e7d-4989-8bbc-a9046420e4f7.sql`

## 🔧 Como Ajustar os Modelos de Impacto

### Opção 1: Modificar o Frontend (Atual)
1. **Editar as fórmulas**: `src/components/wizard/ProposalWizardSteps.tsx`
2. **Ajustar cálculos**: `src/components/wizard/ProposalConfigStep.tsx`
3. **Modificar alcance**: `src/components/landing/AudienceCalculator.tsx`

### Opção 2: Criar Sistema Dinâmico (Recomendado)
1. **Criar tabela no banco**:
```sql
CREATE TABLE impact_models (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  traffic_level VARCHAR(20),
  multiplier DECIMAL(5,2),
  examples TEXT[],
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

2. **Inserir dados das fórmulas**:
```sql
INSERT INTO impact_models (name, description, traffic_level, multiplier, examples) VALUES
('Fórmula A', 'Para locais com grande movimento de pessoas', 'Alto', 1.5, 
 ARRAY['Shopping centers movimentados', 'Aeroportos e terminais', 'Hospitais de grande porte']),
('Fórmula B', 'Para locais com movimento moderado de pessoas', 'Médio', 1.0,
 ARRAY['Farmácias de bairro', 'Clínicas médicas', 'Postos de saúde']),
('Fórmula C', 'Para locais com menor movimento de pessoas', 'Baixo', 0.7,
 ARRAY['Consultórios médicos', 'Clínicas especializadas', 'Ambientes corporativos']);
```

3. **Criar interface de administração** para gerenciar as fórmulas

## 📋 Páginas Relacionadas

### Páginas que Usam os Modelos:
1. **Criação de Propostas**: `/propostas` (NewProposal.tsx)
2. **Wizard de Propostas**: Componentes em `src/components/wizard/`
3. **Calculadora de Audiência**: `src/components/landing/AudienceCalculator.tsx`

### Páginas de Administração (Não Existem Ainda):
- **Gerenciamento de Fórmulas**: Precisa ser criada
- **Configurações de Impacto**: Precisa ser criada

## 🎯 Recomendação

Para permitir ajustes e criação de novas regras, recomendo:

1. **Criar uma tabela no banco** para armazenar as fórmulas dinamicamente
2. **Criar uma página de administração** para gerenciar as fórmulas
3. **Modificar o frontend** para buscar as fórmulas do banco em vez de usar valores fixos
4. **Implementar validações** para garantir consistência dos dados

Isso permitirá que administradores ajustem as fórmulas sem precisar modificar código.
