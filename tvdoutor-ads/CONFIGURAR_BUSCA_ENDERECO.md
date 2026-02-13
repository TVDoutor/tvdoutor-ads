# 🔧 Configuração da Busca por Endereço

## ⚠️ Problema Identificado

A busca por endereço não está funcionando porque a **chave da API do Google Maps não está configurada**.

## 🛠️ Solução

### 1. Criar arquivo `.env`

Crie um arquivo `.env` na raiz do projeto (mesmo nível do `package.json`) com o seguinte conteúdo:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google Maps API Configuration
VITE_GOOGLE_MAPS_API_KEY=SUA_CHAVE_AQUI

# Email Service Configuration (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx

# Other configurations
VITE_APP_NAME=TV Doutor ADS
VITE_APP_VERSION=1.0.0
```

### 2. Obter Chave da API do Google Maps

1. **Acesse o Google Cloud Console:**
   - Vá para: https://console.cloud.google.com/

2. **Crie um novo projeto ou selecione um existente**

3. **Ative as APIs necessárias:**
   - Geocoding API
   - Maps JavaScript API (opcional)

4. **Crie uma chave de API:**
   - Vá para "APIs & Services" > "Credentials"
   - Clique em "Create Credentials" > "API Key"
   - Copie a chave gerada

5. **Configure restrições (recomendado):**
   - Clique na chave criada
   - Em "Application restrictions", selecione "HTTP referrers"
   - Adicione: `localhost:*` e seu domínio de produção
   - Em "API restrictions", selecione "Restrict key"
   - Selecione apenas "Geocoding API"

### 3. Configurar no projeto

1. **Substitua `SUA_CHAVE_AQUI`** no arquivo `.env` pela chave real
2. **Reinicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

### 4. Testar a funcionalidade

1. Acesse o **Mapa Interativo**
2. No campo **"Endereço"**, digite: `Av Paulista, São Paulo`
3. Clique em **"Buscar por Endereço"**
4. As telas próximas devem aparecer no mapa

## 🔍 Verificação

Após configurar, você deve ver no console:
- ✅ `🔑 Google Maps API Key configurada: SIM`
- ✅ `🌍 Geocodificando endereço: Av Paulista, São Paulo, Brasil`
- ✅ `✅ Endereço geocodificado com sucesso: [endereço formatado]`
- ✅ `🎯 X telas encontradas em um raio de 2km!`

## 💰 Custos

- **Geocoding API:** $5 por 1.000 requisições
- **Uso típico:** ~$1-5 por mês para uso normal
- **Teste gratuito:** $200 de crédito mensal (primeiros 3 meses)

## 🚨 Importante

- **Nunca commite** o arquivo `.env` no Git
- **Use restrições** na chave da API para segurança
- **Monitore o uso** no Google Cloud Console

## 🆘 Solução de Problemas

**Erro 403 (Forbidden):**
- Verifique se a API está ativada
- Confirme as restrições da chave

**Erro 400 (Bad Request):**
- Verifique se a chave está correta
- Confirme se a API Geocoding está ativada

**Nenhum resultado encontrado:**
- Teste com endereços mais específicos
- Verifique se o endereço está no Brasil
- Aumente o raio de busca (2km, 5km, 10km, etc.)

## 📝 Logs de Debug Adicionados

Foram adicionados logs detalhados para facilitar o diagnóstico:

- ✅ Verificação da chave da API
- ✅ Logs de geocodificação
- ✅ Logs de busca de telas
- ✅ Logs de filtragem por distância
- ✅ Logs de resultados encontrados

Verifique o console do navegador para ver os logs detalhados durante a busca.
