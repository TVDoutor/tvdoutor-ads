# Integração de Telas - Setup e Configuração

## 📋 Visão Geral

Esta integração permite cadastrar telas com as seguintes funcionalidades:

1. **Upload de Imagem**: Envio automático para Supabase Storage
2. **Geocodificação**: Conversão de endereço em coordenadas usando Google Maps API
3. **Armazenamento**: Salva dados completos incluindo Google Place ID e endereço formatado

## 🔧 Configuração Necessária

### 1. Google Maps API Key

Você precisa de uma chave da Google Maps API com as seguintes APIs habilitadas:
- **Geocoding API**
- **Places API** (opcional, para funcionalidades futuras)

#### Como obter a API Key:

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Vá para "APIs & Services" > "Library"
4. Habilite a **Geocoding API**
5. Vá para "APIs & Services" > "Credentials"
6. Clique em "Create Credentials" > "API Key"
7. Copie a chave gerada

#### Configurar no projeto:

Adicione a variável de ambiente no arquivo `.env`:

```env
VITE_GOOGLE_MAPS_API_KEY=sua_chave_aqui
```

### 2. Supabase Storage Bucket

Certifique-se de que o bucket `screens` existe no Supabase Storage:

1. Acesse o dashboard do Supabase
2. Vá para "Storage"
3. Crie um bucket chamado `screens` se não existir
4. Configure as políticas de acesso (RLS)

#### Políticas RLS recomendadas para o bucket `screens`:

```sql
-- Permitir upload para usuários autenticados
CREATE POLICY "Users can upload screens" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'screens');

-- Permitir visualização pública das imagens
CREATE POLICY "Public can view screens" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'screens');

-- Permitir atualização para usuários autenticados
CREATE POLICY "Users can update screens" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'screens');

-- Permitir exclusão para usuários autenticados
CREATE POLICY "Users can delete screens" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'screens');
```

### 3. Migração do Banco de Dados

Execute a migração para adicionar os novos campos:

```bash
supabase db push
```

Ou execute manualmente o SQL:

```sql
-- Adicionar campos do Google Geocoding API à tabela screens
ALTER TABLE public.screens 
ADD COLUMN IF NOT EXISTS google_place_id TEXT,
ADD COLUMN IF NOT EXISTS google_formatted_address TEXT;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_screens_google_place_id ON public.screens(google_place_id);
CREATE INDEX IF NOT EXISTS idx_screens_lat_lng ON public.screens(lat, lng);
```

## 🚀 Como Usar

### 1. Acessar a Página

Navegue para `/screen-management` (você precisará adicionar esta rota ao seu router).

### 2. Cadastrar uma Tela

1. Preencha o código e nome da tela
2. Digite o endereço completo
3. O sistema validará automaticamente o endereço
4. Selecione uma imagem (máximo 10MB)
5. Clique em "Cadastrar Tela"

### 3. Processo Automático

O sistema irá:

1. **Validar o endereço** usando Google Geocoding API
2. **Fazer upload da imagem** para Supabase Storage
3. **Geocodificar o endereço** para obter lat/lng e Google Place ID
4. **Salvar todos os dados** no banco de dados

## 📁 Estrutura de Arquivos

```
src/
├── lib/
│   ├── geocoding.ts          # Serviço de geocodificação
│   ├── storage.ts            # Serviço de upload de imagens
│   └── screen-service.ts     # Serviço unificado de telas
├── components/
│   └── ScreenForm.tsx        # Formulário de cadastro
└── pages/
    └── ScreenManagement.tsx  # Página de gerenciamento
```

## 🔍 Funcionalidades

### Validação em Tempo Real
- O endereço é validado automaticamente enquanto o usuário digita
- Feedback visual indica se o endereço é válido

### Upload de Imagem
- Suporte para JPG, PNG, GIF
- Limite de 10MB por arquivo
- Nomes únicos gerados automaticamente
- URLs públicas retornadas

### Geocodificação
- Conversão automática de endereço para coordenadas
- Armazenamento do Google Place ID
- Endereço formatado pelo Google

### Tratamento de Erros
- Rollback automático em caso de falha
- Mensagens de erro específicas
- Logs detalhados para debugging

## 🛠️ Personalização

### Modificar Validações

Edite o schema em `ScreenForm.tsx`:

```typescript
const screenSchema = z.object({
  code: z.string().min(2, "Código obrigatório"),
  name: z.string().min(2, "Nome obrigatório"),
  address_raw: z.string().min(3, "Endereço obrigatório"),
  // ... outras validações
})
```

### Modificar Limites de Upload

Edite em `storage.ts`:

```typescript
const maxSize = 10 * 1024 * 1024; // 10MB
```

### Modificar Bucket de Storage

Edite em `screen-service.ts`:

```typescript
const uploadResult = await uploadImage(file, 'screens'); // Nome do bucket
```

## 🐛 Troubleshooting

### Erro: "Google Maps API Key não configurada"
- Verifique se `VITE_GOOGLE_MAPS_API_KEY` está definida no `.env`
- Certifique-se de que a API Key tem permissões para Geocoding API

### Erro: "Falha no upload"
- Verifique se o bucket `screens` existe no Supabase
- Confirme as políticas RLS do bucket
- Verifique o tamanho do arquivo (máximo 10MB)

### Erro: "Endereço não encontrado"
- Verifique se o endereço está completo e correto
- Teste o endereço no Google Maps
- Verifique se a API Key tem cotas disponíveis

### Erro: "Falha ao salvar no banco"
- Verifique se a migração foi executada
- Confirme as políticas RLS da tabela `screens`
- Verifique os logs do Supabase

## 📊 Monitoramento

### Logs Importantes

O sistema gera logs detalhados:

```javascript
console.log('📤 Iniciando upload da imagem...');
console.log('✅ Imagem enviada:', uploadResult.publicUrl);
console.log('🗺️ Iniciando geocodificação...');
console.log('✅ Endereço geocodificado:', geocodingResult);
console.log('💾 Salvando dados no banco...');
console.log('✅ Tela cadastrada com sucesso:', insertedScreen);
```

### Métricas Sugeridas

- Número de telas cadastradas por dia
- Taxa de sucesso de geocodificação
- Tempo médio de upload
- Erros mais comuns

## 🔮 Próximos Passos

1. **Listagem de Telas**: Implementar visualização em tabela
2. **Mapa Interativo**: Mostrar telas em mapa
3. **Edição de Telas**: Permitir atualização de dados
4. **Filtros Avançados**: Busca por cidade, estado, etc.
5. **Bulk Upload**: Upload de múltiplas telas
6. **Relatórios**: Estatísticas de telas cadastradas
