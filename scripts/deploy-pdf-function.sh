#!/bin/bash

# Deploy da Edge Function PDF via Docker
echo "🐳 Deploy da Edge Function PDF via Docker"
echo "========================================"

# Verificar se o Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Inicie o Docker primeiro."
    exit 1
fi

# Verificar variáveis de ambiente
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Variáveis de ambiente necessárias:"
    echo "   SUPABASE_URL"
    echo "   SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    echo "Exemplo:"
    echo "export SUPABASE_URL='https://seu-projeto.supabase.co'"
    echo "export SUPABASE_SERVICE_ROLE_KEY='sua-service-key'"
    exit 1
fi

echo "✅ Variáveis de ambiente configuradas"
echo "📦 Fazendo build da Edge Function..."

# Build da imagem Docker
docker build -t pdf-proposal-pro ./supabase/functions/pdf-proposal-pro/

if [ $? -eq 0 ]; then
    echo "✅ Build concluído com sucesso"
else
    echo "❌ Erro no build"
    exit 1
fi

# Parar container existente se estiver rodando
docker stop pdf-proposal-pro 2>/dev/null || true
docker rm pdf-proposal-pro 2>/dev/null || true

echo "🚀 Iniciando container..."

# Rodar o container
docker run -d \
    --name pdf-proposal-pro \
    -p 8001:8000 \
    -e SUPABASE_URL="$SUPABASE_URL" \
    -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
    -e DENO_DEPLOYMENT_ID="docker-local" \
    --restart unless-stopped \
    pdf-proposal-pro

if [ $? -eq 0 ]; then
    echo "✅ Edge Function rodando em http://localhost:8001"
    echo "📝 Logs: docker logs -f pdf-proposal-pro"
    echo "🛑 Parar: docker stop pdf-proposal-pro"
    echo ""
    echo "🧪 Teste a função:"
    echo "curl -X POST http://localhost:8001 \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -d '{\"proposalId\": 32}'"
else
    echo "❌ Erro ao iniciar container"
    exit 1
fi
