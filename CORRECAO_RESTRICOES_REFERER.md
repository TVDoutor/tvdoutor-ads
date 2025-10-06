# 🔧 Correção: Restrições de Referer

## 🚨 **Problema Confirmado**

A mensagem de erro é clara:
```
"API keys with referer restrictions cannot be used with this API."
```

**Causa**: A chave da API tem restrições de referer que estão bloqueando o acesso.

## 🛠️ **Solução Passo a Passo**

### **Passo 1: Acessar Configurações da Chave**

1. **No Google Cloud Console**:
   - Vá em **"APIs & Services"** → **"Credentials"**
   - Clique na sua chave da API (AIzaSyDzLEDOq1C...)

### **Passo 2: Ajustar Restrições de Aplicativo**

1. **Na seção "Application restrictions"**:
   - **Mude de "Sites" para "None"** temporariamente
   - Isso remove todas as restrições de referer

2. **Clique em "Salvar"**

### **Passo 3: Aguardar Propagação**

- Aguarde **2-5 minutos** para as alterações se propagarem
- As configurações podem demorar para ser efetivadas

### **Passo 4: Testar**

Após ajustar, teste novamente:
```bash
node test-google-maps-key.js
```

## 🧪 **Resultado Esperado**

### ✅ **Se funcionar**:
```
🌍 Testando Geocoding API...
   Status API: OK
   ✅ Geocoding API funcionando!
   📍 Resultado: Campinas, SP, Brasil
```

### ❌ **Se ainda falhar**:
- Verifique se salvou as alterações
- Aguarde mais alguns minutos
- Verifique se está no projeto correto

## 🔒 **Configuração Segura para Produção**

Após confirmar que funciona, configure restrições adequadas:

### **Para Desenvolvimento**:
- **Application restrictions**: "Sites"
- **Sites permitidos**:
  - `http://localhost:*`
  - `https://localhost:*`

### **Para Produção**:
- **Application restrictions**: "Sites"
- **Sites permitidos**:
  - `https://seu-dominio.com/*`
  - `https://www.seu-dominio.com/*`

## ⚠️ **Importante**

- **"None"** remove todas as restrições (use apenas para teste)
- **Configure restrições adequadas** após confirmar que funciona
- **Aguarde a propagação** das configurações

## 🎯 **Ação Imediata**

1. **Vá para**: APIs & Services → Credentials
2. **Clique na sua chave da API**
3. **Mude "Application restrictions" para "None"**
4. **Salve as alterações**
5. **Aguarde 2-5 minutos**
6. **Teste novamente**

---

**🎯 Resultado**: Após remover as restrições de referer, a Geocoding API deve funcionar normalmente.
