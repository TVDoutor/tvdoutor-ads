#!/bin/bash

# Script para fazer deploy da Edge Function de geração de PDF
# Baseado na especificação fornecida pelo usuário

echo "🚀 Fazendo deploy da Edge Function generate-pdf-proposal..."

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

# Fazer deploy da função
echo "📤 Fazendo deploy da função..."
supabase functions deploy generate-pdf-proposal

if [ $? -eq 0 ]; then
    echo "✅ Deploy realizado com sucesso!"
    echo ""
    echo "📋 Próximos passos:"
    echo "1. Execute a migração SQL: supabase db push"
    echo "2. Teste a função: node scripts/test-pdf-generation.js"
    echo "3. A função estará disponível em: https://seu-projeto.supabase.co/functions/v1/generate-pdf-proposal"
else
    echo "❌ Erro no deploy da função"
    exit 1
fi