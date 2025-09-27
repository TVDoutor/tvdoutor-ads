# Enriquecimento da API de Busca - Especificações Técnicas

## Objetivo
Transformar a API `/api/search` para retornar dados enriquecidos que conectem localização com dados de audiência e impacto, conforme especificado no Mídia Kit.

## Estrutura Atual vs Nova Estrutura

### Estrutura Atual
```json
{
  "id": "screen-123",
  "name": "Clínica Centro",
  "city": "São Paulo",
  "state": "SP",
  "lat": -23.5505,
  "lng": -46.6333
}
```

### Nova Estrutura Proposta
```json
[
  {
    "id": "venue-123",
    "name": "Clínica CardioHealth",
    "type": "Clínica",
    "coordinates": { 
      "lat": -23.5505, 
      "lng": -46.6333 
    },
    "main_specialties": ["Cardiologia", "Geriatria"],
    "estimated_annual_impacts": 22390536,
    "audience_profile": "Predominância Classes A e B (44%)",
    "class": "A",
    "distance": 2.3
  }
]
```

## Mapeamento de Dados por Classe

### Classe A (Premium)
- **Impactos Anuais**: 22.390.536
- **Especialidades**: Cardiologia, Neurologia, Oncologia
- **Perfil**: Predominância Classes A e B (44%)

### Classe B (Intermediário) 
- **Impactos Anuais**: 15.680.000
- **Especialidades**: Pediatria, Ginecologia, Dermatologia
- **Perfil**: Classes A, B e C equilibradas (35% cada)

### Classe C (Básico)
- **Impactos Anuais**: 8.540.000
- **Especialidades**: Clínica Geral, Medicina da Família
- **Perfil**: Predominância Classes C e D (55%)

## Endpoints Necessários

### GET /api/search/enhanced
**Parâmetros:**
- `lat`: Latitude do ponto central
- `lng`: Longitude do ponto central
- `radius`: Raio em km (padrão: 5)
- `specialty`: Filtro por especialidade (opcional)
- `class`: Filtro por classe A/B/C (opcional)

**Resposta:**
```json
{
  "total": 45,
  "venues": [
    {
      "id": "venue-123",
      "name": "Clínica CardioHealth",
      "type": "Clínica",
      "coordinates": { "lat": -23.5505, "lng": -46.6333 },
      "main_specialties": ["Cardiologia", "Geriatria"],
      "estimated_annual_impacts": 22390536,
      "audience_profile": "Predominância Classes A e B (44%)",
      "class": "A",
      "distance": 2.3
    }
  ]
}
```

## Integração Frontend

### Componente LocationCard
O componente `LocationCard.tsx` já está preparado para receber esta estrutura de dados.

### SearchInterface 
Atualizar para usar a nova API e renderizar os `LocationCard` components.

## Próximos Passos
1. Atualizar tabela `screens` no banco para incluir campos:
   - `type` (Clínica, Hospital, Laboratório)
   - `main_specialties` (array JSON)
   - `estimated_annual_impacts` (integer)
   - `audience_profile` (text)
   - `class` (enum: A, B, C)

2. Criar/atualizar endpoint `/api/search/enhanced`

3. Integrar LocationCard no SearchInterface

4. Implementar funcionalidade "Adicionar à Cotação"
