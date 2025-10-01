#!/bin/bash

echo "🚀 Deploy da Edge Function com correção de CORS..."

# Verificar se o Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não encontrado. Instale com: npm install -g supabase"
    exit 1
fi

# Verificar se está logado no Supabase
if ! supabase status &> /dev/null; then
    echo "❌ Não está conectado ao Supabase. Execute: supabase login"
    exit 1
fi

echo "📤 Fazendo deploy da função generate-pdf-proposal..."
echo "⚠️  IMPORTANTE: Usando --no-verify-jwt para evitar problemas de autenticação"

# Fazer deploy da função com --no-verify-jwt
supabase functions deploy generate-pdf-proposal --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ Deploy realizado com sucesso!"
    echo ""
    echo "🧪 Testando CORS com cURL..."
    
    # Obter o ID do projeto
    PROJECT_ID=$(supabase status --output json | jq -r '.project_id')
    
    if [ "$PROJECT_ID" != "null" ] && [ ! -z "$PROJECT_ID" ]; then
        echo "📋 Testando CORS para o projeto: $PROJECT_ID"
        echo ""
        echo "Executando teste cURL..."
        
        curl -i -X OPTIONS \
          -H "Origin: http://localhost:8080" \
          -H "Access-Control-Request-Method: POST" \
          "https://$PROJECT_ID.supabase.co/functions/v1/generate-pdf-proposal"
        
        echo ""
        echo "✅ Teste cURL concluído!"
        echo ""
        echo "🔍 Verifique se você vê os headers CORS na resposta:"
        echo "   - Access-Control-Allow-Origin: *"
        echo "   - Access-Control-Allow-Methods: GET, POST, OPTIONS"
        echo "   - Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type"
    else
        echo "⚠️  Não foi possível obter o ID do projeto automaticamente"
        echo "📋 Para testar manualmente, execute:"
        echo "curl -i -X OPTIONS \\"
        echo "  -H \"Origin: http://localhost:8080\" \\"
        echo "  -H \"Access-Control-Request-Method: POST\" \\"
        echo "  \"https://SEU_PROJECT_ID.supabase.co/functions/v1/generate-pdf-proposal\""
    fi
    
    echo ""
    echo "🎉 Deploy concluído!"
    echo ""
    echo "📋 Próximos passos:"
    echo "1. Teste a geração de PDF no frontend"
    echo "2. Verifique se não há mais erros de CORS no console"
    echo "3. Se ainda houver problemas, verifique os logs: supabase functions logs generate-pdf-proposal"
    
else
    echo "❌ Erro no deploy da função"
    exit 1
fi

