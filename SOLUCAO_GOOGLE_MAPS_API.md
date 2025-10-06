# 🗺️ Solução para Erro REQUEST_DENIED - Google Maps API

## 🚨 Problema Identificado

**Erro**: `REQUEST_DENIED` na Geocoding API  
**Status**: Maps JavaScript API funcionando ✅  
**Status**: Geocoding API falhando ❌  

## 🔍 Diagnóstico Realizado

✅ **Chave da API**: Configurada corretamente (39 caracteres)  
✅ **Maps JavaScript API**: Funcionando  
❌ **Geocoding API**: REQUEST_DENIED  

## 🎯 Causa Raiz

O problema é que a **Geocoding API não está habilitada** no Google Cloud Console, ou há **restrições de domínio** que estão bloqueando as requisições.

## 🛠️ Soluções

### **Solução 1: Habilitar Geocoding API (MAIS PROVÁVEL)**

1. **Acesse**: https://console.cloud.google.com/
2. **Vá em**: APIs & Services → Library
3. **Procure por**: "Geocoding API"
4. **Clique em**: "Enable" (Habilitar)
5. **Aguarde**: A ativação (pode levar alguns minutos)

### **Solução 2: Verificar Restrições de Domínio**

1. **Acesse**: https://console.cloud.google.com/
2. **Vá em**: APIs & Services → Credentials
3. **Clique na sua chave da API**
4. **Verifique**: "Application restrictions"
5. **Se estiver em "HTTP referrers"**:
   - Adicione: `http://localhost:*`
   - Adicione: `https://localhost:*`
   - Adicione: `https://seu-dominio.com/*`
6. **Ou mude temporariamente para "None"** para teste

### **Solução 3: Verificar Billing**

1. **Acesse**: https://console.cloud.google.com/
2. **Vá em**: Billing
3. **Verifique se há**:
   - Conta de cobrança ativa
   - Créditos disponíveis
   - Limite de uso configurado

## 🧪 Teste de Validação

Após aplicar a solução, teste:

1. **Acesse no navegador**:
   ```
   https://maps.googleapis.com/maps/api/geocode/json?address=campinas,brasil&key=SUA_CHAVE_AQUI
   ```

2. **Resultado esperado**:
   ```json
   {
     "results": [
       {
         "formatted_address": "Campinas, SP, Brasil",
         "geometry": {
           "location": {
             "lat": -22.90556,
             "lng": -47.06083
           }
         }
       }
     ],
     "status": "OK"
   }
   ```

## 🔧 Correção Temporária (Se Urgente)

Se precisar de uma solução imediata:

1. **Crie uma nova chave da API**
2. **Configure sem restrições** inicialmente
3. **Habilite todas as APIs necessárias**
4. **Atualize o .env** com a nova chave
5. **Teste o sistema**
6. **Configure restrições depois**

## 📋 APIs Necessárias

Certifique-se de que estas APIs estão habilitadas:

- ✅ **Maps JavaScript API** (já funcionando)
- ❌ **Geocoding API** (precisa ser habilitada)
- ⚠️ **Places API** (se usado em outras partes)

## ⚠️ Importante

### **Segurança**:
- Não deixe a chave sem restrições em produção
- Configure restrições de domínio adequadas
- Monitore o uso da API

### **Billing**:
- Configure billing adequadamente
- Monitore custos
- Configure alertas de uso

## 🚀 Próximos Passos

1. **Primeiro**: Habilite a Geocoding API
2. **Segundo**: Teste a geocodificação
3. **Terceiro**: Configure restrições adequadas
4. **Quarto**: Monitore o uso

## 📞 Suporte

Se o problema persistir:

1. **Verifique os logs** do Google Cloud Console
2. **Consulte a documentação**: https://developers.google.com/maps/documentation/geocoding
3. **Contate o suporte** do Google Cloud

---

**✅ Resultado Esperado**: Após habilitar a Geocoding API, o erro `REQUEST_DENIED` deve desaparecer e a geocodificação deve funcionar normalmente.
