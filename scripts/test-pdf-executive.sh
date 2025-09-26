#!/bin/bash

# Script de teste para a integração completa SQL → Edge Function → PDF
# Teste do MVP executável do resumo executivo

echo "🚀 Testando integração PDF Executivo"
echo "======================================"

# Configurações (ajustar conforme seu ambiente)
PROJECT_URL="https://your-project.supabase.co"
SERVICE_KEY="your-service-role-key"
PROPOSAL_ID="1" # Ajustar para um ID válido

# 1. Testar RPC SQL diretamente
echo "1. Testando RPC proposal_summary..."
curl -s -X POST "$PROJECT_URL/rest/v1/rpc/proposal_summary" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_id\": $PROPOSAL_ID}" | jq .

if [ $? -eq 0 ]; then
  echo "✅ RPC funcionando"
else
  echo "❌ Erro no RPC"
  exit 1
fi

# 2. Testar Edge Function
echo ""
echo "2. Testando Edge Function pdf-proposal-pro..."

curl -s -X POST "$PROJECT_URL/functions/v1/pdf-proposal-pro" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"proposalId\": $PROPOSAL_ID, \"logoUrl\": \"https://via.placeholder.com/200x80/0EA5E9/FFFFFF?text=LOGO\"}" \
  --output "test-proposal-$PROPOSAL_ID.pdf"

if [ $? -eq 0 ] && [ -s "test-proposal-$PROPOSAL_ID.pdf" ]; then
  echo "✅ PDF gerado: test-proposal-$PROPOSAL_ID.pdf"
  echo "📄 Tamanho: $(wc -c < test-proposal-$PROPOSAL_ID.pdf) bytes"
else
  echo "❌ Erro na geração do PDF"
  exit 1
fi

# 3. Verificar se foi salvo no storage
echo ""
echo "3. Verificando storage..."
curl -s "$PROJECT_URL/rest/v1/proposals?id=eq.$PROPOSAL_ID&select=pdf_path,pdf_url" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" | jq .

echo ""
echo "🎉 Teste completo!"
echo "💡 Próximos passos:"
echo "   • Abrir test-proposal-$PROPOSAL_ID.pdf e verificar layout"
echo "   • Testar com diferentes IDs de proposta"  
echo "   • Validar dados no PDF vs. banco de dados"
