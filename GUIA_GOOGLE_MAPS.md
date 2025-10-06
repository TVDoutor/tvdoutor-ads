# 🗺️ Guia Completo do Google Maps API

## ✅ Configuração Atual

A chave da API do Google Maps foi atualizada com sucesso:

- **Chave API:** `AIzaSyDzLEDOq1CbnfG5eNFWg6xQURMfURggZPA`
- **Status:** Maps JavaScript API funcionando
- **Status:** Geocoding API precisa ser habilitada

## 🚨 Ação Necessária

A **Geocoding API** está com acesso negado. Você precisa habilitá-la no Google Cloud Console.

## 🔧 Configuração no Google Cloud Console

### **1. Acessar o Console**

1. Vá para [console.cloud.google.com](https://console.cloud.google.com/)
2. Faça login com sua conta Google
3. Selecione o projeto correto

### **2. Habilitar APIs Necessárias**

Vá em **APIs & Services** → **Library** e habilite:

- ✅ **Maps JavaScript API** (já habilitada)
- ❌ **Geocoding API** (precisa ser habilitada)
- ⚠️ **Places API** (opcional - para busca de lugares)
- ⚠️ **Directions API** (opcional - para rotas)

### **3. Configurar Restrições**

Vá em **APIs & Services** → **Credentials** → Sua chave API:

#### **Application Restrictions:**
- Selecione **HTTP referrers (web sites)**
- Adicione os domínios:
  ```
  http://localhost:*/*
  https://localhost:*/*
  https://seu-dominio.com/*
  ```

#### **API Restrictions:**
- Selecione **Restrict key**
- Escolha as APIs necessárias:
  - Maps JavaScript API
  - Geocoding API
  - Places API (se usar)
  - Directions API (se usar)

## 🧪 Testando a Configuração

### **Script de Teste:**

```bash
node test-google-maps.js
```

### **Teste Manual no Sistema:**

1. **Reinicie o servidor:**
   ```bash
   npm run dev
   ```

2. **Acesse o mapa interativo:**
   - Vá para `/mapa-interativo`
   - Verifique se o mapa carrega

3. **Teste a busca de endereços:**
   - Digite um endereço na busca
   - Verifique se a geocodificação funciona

## 📋 Uso no Sistema

### **1. Mapa Interativo**

```javascript
// O mapa usa a chave automaticamente via VITE_GOOGLE_MAPS_API_KEY
const map = new google.maps.Map(document.getElementById('map'), {
  center: { lat: -23.5505, lng: -46.6333 },
  zoom: 10
});
```

### **2. Geocodificação**

```javascript
// Busca de endereços
const geocoder = new google.maps.Geocoder();
geocoder.geocode({ address: 'Av Paulista, São Paulo' }, (results, status) => {
  if (status === 'OK') {
    console.log('Coordenadas:', results[0].geometry.location);
  }
});
```

### **3. Busca de Lugares**

```javascript
// Se Places API estiver habilitada
const service = new google.maps.places.PlacesService(map);
service.textSearch({
  query: 'farmácia',
  location: { lat: -23.5505, lng: -46.6333 },
  radius: 1000
}, callback);
```

## ⚠️ Limitações e Custos

### **Limites do Plano Gratuito:**

- **Maps JavaScript API:** 28.000 carregamentos/mês
- **Geocoding API:** 40.000 requisições/mês
- **Places API:** 1.000 requisições/mês

### **Monitoramento:**

1. **Acompanhe o uso:**
   - Google Cloud Console → APIs & Services → Quotas
   - Configure alertas de quota

2. **Controle de custos:**
   - Configure limites de faturamento
   - Monitore uso diário

## 🆘 Solução de Problemas

### **Erro: "This API project is not authorized"**

**Solução:**
1. Verifique se a API está habilitada
2. Confirme se a chave tem as permissões corretas
3. Verifique as restrições de domínio

### **Erro: "RefererNotAllowedMapError"**

**Solução:**
1. Adicione seu domínio nas restrições HTTP referrers
2. Use wildcards para desenvolvimento: `http://localhost:*/*`

### **Erro: "OVER_QUERY_LIMIT"**

**Solução:**
1. Verifique se excedeu a quota mensal
2. Aguarde o reset mensal ou aumente os limites

### **Mapa não carrega**

**Solução:**
1. Verifique se a chave está correta no .env
2. Confirme se o Maps JavaScript API está habilitado
3. Verifique o console do navegador para erros

## 📊 Status Atual

- ✅ **Chave configurada:** `AIzaSyDzLEDOq1CbnfG5eNFWg6xQURMfURggZPA`
- ✅ **Maps JavaScript API:** Funcionando
- ❌ **Geocoding API:** Precisa ser habilitada
- ⚠️ **Restrições:** Configurar no console

## 🚀 Próximos Passos

1. **Habilitar Geocoding API** no Google Cloud Console
2. **Configurar restrições** de domínio
3. **Reiniciar o servidor** para aplicar mudanças
4. **Testar todas as funcionalidades** do mapa

---

**Status:** ⚠️ Parcialmente configurado - Geocoding API precisa ser habilitada
**Ação:** Habilitar APIs no Google Cloud Console
