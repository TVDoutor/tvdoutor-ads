#!/bin/bash

# Script para deploy da Edge Function de PDF Profissional
# Execute: ./scripts/deploy-pdf-pro-function.sh

echo "🚀 Deploy da Edge Function PDF Profissional"
echo "============================================="

# Verificar se estamos no diretório correto
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto (onde está supabase/config.toml)"
    exit 1
fi

# Verificar se supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Erro: Supabase CLI não encontrado. Instale com:"
    echo "npm install -g supabase"
    exit 1
fi

echo "📋 Configurando secrets..."

# Verificar se os secrets já existem
echo "🔍 Verificando secrets existentes..."

# Obter URL do projeto
PROJECT_URL=$(supabase status | grep "API URL" | awk '{print $3}' | head -1)
if [ -z "$PROJECT_URL" ]; then
    echo "❌ Erro: Não foi possível obter a URL do projeto Supabase"
    echo "Execute: supabase start (se local) ou supabase link (se remoto)"
    exit 1
fi

echo "📡 URL do projeto: $PROJECT_URL"

# Verificar se SERVICE_ROLE_KEY está definida
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "⚠️  AVISO: Variável SUPABASE_SERVICE_ROLE_KEY não definida"
    echo "📝 Para configurar os secrets, execute:"
    echo ""
    echo "export SUPABASE_SERVICE_ROLE_KEY='sua-service-role-key-aqui'"
    echo "supabase secrets set SUPABASE_URL='$PROJECT_URL'"
    echo "supabase secrets set SUPABASE_SERVICE_ROLE_KEY='\$SUPABASE_SERVICE_ROLE_KEY'"
    echo ""
    echo "💡 Você pode encontrar a SERVICE_ROLE_KEY em:"
    echo "   Supabase Dashboard > Settings > API > service_role (secret)"
    echo ""
    read -p "Deseja continuar sem configurar secrets? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ Configurando secrets..."
    supabase secrets set SUPABASE_URL="$PROJECT_URL"
    supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
    echo "✅ Secrets configurados com sucesso!"
fi

echo ""
echo "🔨 Fazendo deploy da função..."

# Deploy da função
if supabase functions deploy pdf-proposal-pro; then
    echo "✅ Deploy realizado com sucesso!"
    echo ""
    echo "🧪 Para testar a função, execute:"
    echo ""
    echo "curl -i -X POST \\"
    echo "  -H \"Authorization: Bearer \$SUPABASE_ANON_KEY\" \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -d '{\"proposalId\": 40}' \\"
    echo "  $PROJECT_URL/functions/v1/pdf-proposal-pro"
    echo ""
    echo "📊 Se retornar {\"pdfBase64\":\"...\"}, está funcionando!"
    echo ""
    echo "🎯 A função está pronta para uso no frontend!"
else
    echo "❌ Erro no deploy da função"
    exit 1
fi
