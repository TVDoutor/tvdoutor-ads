# 🚀 Deploy Manual da Edge Function

Como o Supabase CLI está com problemas, vamos fazer o deploy manual pelo dashboard.

## 📋 Passo a Passo

### 1. Acessar o Dashboard Supabase
1. Vá para: https://supabase.com/dashboard
2. Selecione seu projeto
3. No menu lateral, clique em **Edge Functions**

### 2. Criar/Editar a Função
1. Se a função `pdf-proposal-pro` já existe:
   - Clique nela para editar
2. Se não existe:
   - Clique em **Create Function**
   - Nome: `pdf-proposal-pro`

### 3. Colar o Código
1. Copie todo o conteúdo do arquivo `supabase-edge-function-simple.ts`
2. Cole no editor do dashboard
3. Clique em **Save** ou **Deploy**

### 4. Testar a Função
Após o deploy, teste no console do browser:

```javascript
// Abra o console do navegador (F12) e execute:
fetch('https://vaoqzhwzucijjyyvgils.supabase.co/functions/v1/pdf-proposal-pro', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  },
  body: JSON.stringify({ proposalId: 33 })
}).then(r => r.json()).then(console.log);
```

## 🔧 O que a Função Faz Agora

Esta versão simplificada:
- ✅ **Aceita requisições POST** com proposalId
- ✅ **Busca dados da proposta** no banco
- ✅ **Retorna informações** da proposta
- ✅ **Headers CORS** corretos
- ⏳ **Mock do PDF** (por enquanto)

## 🎯 Resultado Esperado

Se funcionou, você verá no console:
```json
{
  "ok": true,
  "pdf_url": "https://example.com/proposta-33.pdf",
  "pdf_path": "proposta-33.pdf",
  "data": {
    "proposal": "10 Mídia Digital",
    "screens": 9,
    "message": "PDF generation em desenvolvimento - dados carregados com sucesso"
  }
}
```

## 🔄 Próximos Passos

1. **Testar a função** com o código acima
2. **Confirmar que funciona** sem erros de CORS
3. **Implementar PDF real** depois que a base estiver funcionando

## 🚨 Troubleshooting

**Se der erro de autorização:**
- Use a `anon key` do seu projeto (em Settings → API)
- Ou use o `service_role key` se for admin

**Se der erro de CORS:**
- A função já tem os headers corretos
- Teste diretamente no dashboard primeiro

---

**Objetivo**: Fazer a função básica funcionar sem erros, depois implementamos o PDF completo.

Copie o código do arquivo `supabase-edge-function-simple.ts` para o dashboard!
