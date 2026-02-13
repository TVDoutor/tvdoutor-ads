# Guia de Uso - Busca por Endereços Reais

## 📍 Como Usar Endereços Específicos

O sistema agora suporta busca por endereços completos e específicos, permitindo que você encontre telas próximas a locais exatos.

### ✅ Exemplos de Endereços que Funcionam

**Endereços Completos:**
- `Av Paulista, 1000, Bela Vista, São Paulo`
- `Rua Augusta, 1234, Consolação, São Paulo`
- `Praça da Sé, 1, Sé, São Paulo`
- `Av Atlântica, 1702, Copacabana, Rio de Janeiro`
- `Rua Oscar Freire, 1000, Jardins, São Paulo`

**Endereços com Números:**
- `Rua 25 de Março, 100, Centro, São Paulo`
- `Av Brasil, 5000, Flamengo, Rio de Janeiro`
- `Rua da Consolação, 2000, Consolação, São Paulo`

**Endereços com Referências:**
- `Shopping Iguatemi, São Paulo`
- `Estação da Luz, São Paulo`
- `Aeroporto de Guarulhos, Guarulhos`

### 🔧 Configuração Necessária

Para usar a funcionalidade de geocoding, você precisa configurar a chave da API do Google Maps:

1. **Crie um arquivo `.env` na raiz do projeto:**
```env
VITE_GOOGLE_MAPS_API_KEY=sua_chave_aqui
```

2. **Obtenha uma chave da API do Google Maps:**
   - Acesse o [Google Cloud Console](https://console.cloud.google.com/)
   - Crie um novo projeto ou selecione um existente
   - Ative a API "Geocoding API"
   - Crie uma chave de API
   - Configure as restrições de domínio se necessário

### 🎯 Como Funciona

1. **Detecção Automática:** O sistema detecta automaticamente quando você digita um endereço específico (contém números ou palavras-chave como "av", "rua", "praça")

2. **Geocoding:** Endereços específicos são enviados para o Google Geocoding API para obter coordenadas precisas

3. **Busca Automática:** Com as coordenadas, o sistema busca automaticamente todas as telas dentro do raio de 5km (ou valor personalizado)

4. **Resultados Instantâneos:** Os resultados aparecem imediatamente quando você seleciona um endereço, sem precisar preencher período ou clicar em buscar

### 📊 Tipos de Resultados

- **🏙️ Cidade:** Busca por nome da cidade
- **🏢 Endereço Específico:** Endereços cadastrados no banco de dados
- **📍 Endereço Geocodificado:** Endereços convertidos via Google API (roxo)

### 🚀 Funcionalidades

- **Busca Instantânea:** Resultados aparecem automaticamente ao digitar/selecionar um endereço
- **Raio Padrão 5km:** Busca automática com raio de 5km por padrão
- **Raio Personalizável:** Ajuste o raio de busca de 1km a 100km - atualiza automaticamente
- **Preços em Tempo Real:** Veja preços calculados baseados na duração da campanha
- **Distância Precisa:** Distância calculada em tempo real para cada tela
- **Sem Dependência de Período:** Não precisa preencher data para ver as telas disponíveis

### 💡 Dicas de Uso

1. **Seja Específico:** Quanto mais específico o endereço, melhor a precisão
2. **Use Números:** Endereços com números são mais precisos
3. **Inclua Bairro:** Sempre inclua o bairro para melhor localização
4. **Teste Diferentes Formatos:** O sistema aceita vários formatos de endereço

### 🔍 Exemplo Prático

1. Digite: `Av Paulista, 1000, Bela Vista, São Paulo`
2. Selecione o resultado geocodificado (ícone roxo)
3. **As telas aparecem automaticamente** em 5km de raio
4. Ajuste o raio de busca se necessário (ex: 10km) - **atualiza automaticamente**
5. Os resultados mostram distância, preço e informações de cada tela
6. Opcional: Ajuste período e duração para ver preços específicos

### ⚠️ Limitações

- Requer chave válida do Google Maps API
- Endereços muito genéricos podem não retornar resultados precisos
- A precisão depende da qualidade dos dados do Google Maps

### 🛠️ Solução de Problemas

**"Nenhum resultado encontrado":**
- Verifique se o endereço está correto
- Tente um formato mais específico
- Confirme se a chave da API está configurada

**"Erro na geocodificação":**
- Verifique se a chave da API está válida
- Confirme se a API Geocoding está ativada
- Verifique as restrições de domínio da chave

**Resultados imprecisos:**
- Use endereços mais específicos
- Inclua número da rua quando possível
- Adicione o bairro para melhor localização
