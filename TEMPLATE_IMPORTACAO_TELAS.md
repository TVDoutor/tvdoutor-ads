# 📊 Template para Importação de Telas - TV Doutor ADS

## 📋 **Formato da Planilha Excel**

### **Estrutura do Cabeçalho (Linha 1)**

A primeira linha da planilha deve conter exatamente estes cabeçalhos:

| Código | Nome de Exibição | Endereço | Cidade | Estado | CEP | Classe | Especialidade | Ativo | Latitude | Longitude | Taxa Padrão (Mês) | Taxa Venda (Mês) | Spots por Hora | Duração Spot (seg) | Google Place ID | Google Maps URL |
|--------|------------------|----------|--------|--------|-----|--------|---------------|-------|----------|-----------|-------------------|------------------|----------------|-------------------|-----------------|-----------------|

### **📝 Descrição dos Campos**

#### **🔴 Campos Obrigatórios:**
- **Código**: Identificador único da tela (ex: "TV001", "HOSP_SP_001")
- **Nome de Exibição**: Nome descritivo da tela (ex: "Hospital Central - Hall Principal")

#### **🟡 Campos Opcionais:**
- **Endereço**: Endereço completo da tela
- **Cidade**: Cidade onde a tela está localizada
- **Estado**: Estado (sigla, ex: "SP", "RJ")
- **CEP**: Código postal
- **Classe**: Classificação da tela (A, AB, ABC, B, BC, C, CD, D, E, ND)
- **Especialidade**: Tipo de local (Hospital, Shopping, Farmácia, etc.)
- **Ativo**: Status da tela (Sim/Não, Ativo/Inativo, true/false, 1/0)
- **Latitude**: Coordenada geográfica (-90 a 90)
- **Longitude**: Coordenada geográfica (-180 a 180)
- **Taxa Padrão (Mês)**: Valor padrão mensal em R$
- **Taxa Venda (Mês)**: Valor de venda mensal em R$
- **Spots por Hora**: Quantidade de spots por hora
- **Duração Spot (seg)**: Duração do spot em segundos
- **Google Place ID**: ID do local no Google Maps
- **Google Maps URL**: URL do local no Google Maps

---

## 📋 **Exemplo de Dados**

### **Linha de Exemplo:**
```
TV001 | Hospital Central - Hall | Rua das Flores, 123 | São Paulo | SP | 01234-567 | A | Hospital | Sim | -23.5505 | -46.6333 | 2500 | 3000 | 12 | 30 | ChIJAVkDPzdZzpQRMDs | https://goo.gl/maps/xyz
```

### **Múltiplos Exemplos:**

| Código | Nome de Exibição | Endereço | Cidade | Estado | CEP | Classe | Especialidade | Ativo | Latitude | Longitude | Taxa Padrão (Mês) | Taxa Venda (Mês) | Spots por Hora | Duração Spot (seg) |
|--------|------------------|----------|--------|--------|-----|--------|---------------|-------|----------|-----------|-------------------|------------------|----------------|-------------------|
| TV001 | Hospital Central - Hall | Rua das Flores, 123 | São Paulo | SP | 01234-567 | A | Hospital | Sim | -23.5505 | -46.6333 | 2500 | 3000 | 12 | 30 |
| TV002 | Shopping Norte - Praça | Av. Paulista, 456 | São Paulo | SP | 01310-100 | B | Shopping | Sim | -23.5489 | -46.6388 | 1800 | 2200 | 10 | 30 |
| TV003 | Farmácia Popular | R. do Comércio, 789 | Rio de Janeiro | RJ | 20040-020 | C | Farmácia | Não | -22.9068 | -43.1729 | 1200 | 1500 | 8 | 30 |

---

## ⚠️ **Regras de Validação**

### **🔴 Obrigatórias:**
1. **Código** deve ser único e não pode estar vazio
2. **Nome de Exibição** não pode estar vazio

### **🟡 Opcionais mas com Validação:**
1. **Classe** deve ser uma das opções: A, AB, ABC, B, BC, C, CD, D, E, ND
2. **Latitude** deve ser número entre -90 e 90
3. **Longitude** deve ser número entre -180 e 180
4. **Ativo** aceita: Sim/Não, Ativo/Inativo, true/false, 1/0
5. **Valores numéricos** (taxas, spots, duração) devem ser números válidos

### **🔄 Comportamento:**
- **Duplicatas**: Telas com código já existente são ignoradas
- **Valores padrão**: Campos vazios recebem valores padrão quando aplicável
- **Classe padrão**: Se não especificada, será definida como "ND"
- **Status padrão**: Se não especificado, tela será marcada como ativa

---

## 🚀 **Como Usar**

### **1. Preparar Planilha:**
1. Criar arquivo Excel (.xlsx ou .xls)
2. Primeira linha: cabeçalhos conforme tabela acima
3. Linhas seguintes: dados das telas
4. Salvar arquivo

### **2. Fazer Upload:**
1. Acessar página **Inventário**
2. Clicar em **"Upload Planilha"** (apenas super administradores)
3. Selecionar arquivo Excel
4. Clicar em **"Processar Planilha"**
5. Aguardar processamento e verificar resultado

### **3. Verificar Resultado:**
- ✅ **Sucesso**: Telas adicionadas, duplicatas ignoradas
- ⚠️ **Aviso**: Algumas telas com problemas
- ❌ **Erro**: Problemas na estrutura da planilha

---

## 🔧 **Dicas Importantes**

### **📊 Preparação dos Dados:**
- Use formato Excel (.xlsx) para melhor compatibilidade
- Mantenha cabeçalhos exatos (case-sensitive)
- Evite células vazias desnecessárias
- Use formato de texto para códigos (evite números automáticos)

### **🎯 Coordenadas:**
- Use ponto (.) como separador decimal para coordenadas
- Latitude negativa = Sul, Longitude negativa = Oeste
- Para São Paulo: Lat ≈ -23.5, Lng ≈ -46.6

### **💰 Valores:**
- Use apenas números para taxas (sem R$, vírgulas, etc.)
- Exemplo: 2500 (não "R$ 2.500,00")

### **📝 Classes Válidas:**
- **A**: Premium
- **AB, ABC**: Intermediárias superiores
- **B**: Padrão superior
- **BC**: Intermediária
- **C**: Padrão
- **CD**: Intermediária inferior
- **D**: Básica
- **E**: Econômica
- **ND**: Não definida

---

## ❌ **Erros Comuns**

### **🚫 Evite:**
1. Códigos duplicados na mesma planilha
2. Cabeçalhos diferentes dos especificados
3. Coordenadas inválidas (fora dos limites)
4. Valores não numéricos em campos numéricos
5. Planilhas completamente vazias

### **✅ Soluções:**
1. Verifique unicidade dos códigos
2. Copie cabeçalhos exatamente como especificado
3. Valide coordenadas no Google Maps
4. Use formato número para campos numéricos
5. Inclua pelo menos uma linha de dados

---

## 📞 **Suporte**

Em caso de dúvidas ou problemas:
1. Verifique se é super administrador
2. Confira formato da planilha
3. Teste com poucos registros primeiro
4. Consulte logs de erro no console do navegador

**Formato recomendado**: Excel (.xlsx) com dados organizados conforme template acima.
