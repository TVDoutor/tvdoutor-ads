# 📋 Guia de Importação de Telas

## 🎯 Visão Geral
Este guia explica como importar telas em massa no sistema TV Doutor ADS usando arquivos CSV.

## 📁 Arquivos Necessários

### 1. **Script SQL Melhorado**
- `screens_import_upsert_improved.sql` - Script principal com validações

### 2. **Template CSV**
- `screens_import_template.csv` - Exemplo de formato correto

## 🚀 Processo de Importação

### Passo 1: Preparar o Arquivo CSV
1. Use o template `screens_import_template.csv` como base
2. Preencha os dados das suas telas
3. **IMPORTANTE**: Mantenha o formato exato das colunas

### Passo 2: Upload no Supabase
1. Acesse o SQL Editor do Supabase
2. Faça upload do arquivo CSV usando a opção "Upload file"
3. Anote o caminho do arquivo (ex: `/mnt/data/screens_import.csv`)

### Passo 3: Executar o Script
1. Copie o conteúdo de `screens_import_upsert_improved.sql`
2. Cole no SQL Editor do Supabase
3. **IMPORTANTE**: Descomente e ajuste a linha do COPY:
   ```sql
   COPY stg_upload_screens FROM '/mnt/data/screens_import.csv' WITH (FORMAT csv, HEADER true);
   ```
4. Execute o script

## 📊 Estrutura do CSV

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `code` | Text | ✅ | Código único da tela (ex: P2000.1) |
| `display_name` | Text | ❌ | Nome de exibição amigável |
| `address_raw` | Text | ❌ | Endereço completo |
| `city` | Text | ❌ | Cidade |
| `state` | Text | ❌ | Estado (ex: SP, RJ) |
| `class` | Text | ❌ | Classe social (A, B, C, D, E, ND) |
| `specialty` | Array | ❌ | Array de especialidades (formato JSON) |
| `lat` | Number | ❌ | Latitude (-90 a 90) |
| `lng` | Number | ❌ | Longitude (-180 a 180) |
| `base_daily_traffic` | Number | ❌ | Tráfego diário base |
| `category` | Text | ❌ | Categoria da tela |
| `venue_type_parent` | Text | ❌ | Tipo principal do local |
| `venue_type_child` | Text | ❌ | Subtipo do local |
| `venue_type_grandchildren` | Text | ❌ | Categoria específica |
| `active` | Boolean | ❌ | Tela ativa (true/false) |

## ⚠️ Formato de Especialidades
As especialidades devem estar no formato de array JSON:
```csv
"{""Cardiologia"",""Neurologia"",""Pediatria""}"
```

## 🔍 Validações Automáticas

O script melhorado inclui:

- ✅ **Verificação de códigos duplicados**
- ✅ **Validação de classes sociais**
- ✅ **Verificação de coordenadas válidas**
- ✅ **Tratamento de valores vazios**
- ✅ **Estatísticas de importação**
- ✅ **Logs detalhados**

## 📈 Resultados Esperados

Após a execução, você verá:
- Contagem de registros inseridos vs atualizados
- Total de telas no sistema
- Telas ativas
- Telas com coordenadas válidas

## 🛠️ Solução de Problemas

### Erro: "Código já existe"
- O script usa UPSERT, então atualiza registros existentes
- Verifique se o código está correto

### Erro: "Classe inválida"
- Use apenas: A, AB, ABC, B, BC, C, CD, D, E, ND
- Deixe vazio para usar 'ND' como padrão

### Erro: "Coordenadas inválidas"
- Latitude: -90 a 90
- Longitude: -180 a 180
- Deixe vazio se não tiver coordenadas

## 📞 Suporte
Em caso de problemas, verifique:
1. Formato do CSV
2. Caminho do arquivo no COPY
3. Logs de validação no console do Supabase
