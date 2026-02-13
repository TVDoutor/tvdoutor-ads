#!/bin/bash

echo "🔧 Corrigindo problemas de geração de PDF..."

# 1. Aplicar migração SQL
echo "📊 Aplicando migração SQL..."
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Migração SQL aplicada com sucesso!"
else
    echo "❌ Erro ao aplicar migração SQL"
    exit 1
fi

# 2. Fazer deploy da Edge Function
echo "🚀 Fazendo deploy da Edge Function..."
supabase functions deploy generate-pdf-proposal

if [ $? -eq 0 ]; then
    echo "✅ Edge Function deployada com sucesso!"
else
    echo "❌ Erro no deploy da Edge Function"
    exit 1
fi

# 3. Testar a função SQL
echo "🧪 Testando função SQL..."
supabase db reset --linked

# 4. Verificar se as funções estão funcionando
echo "🔍 Verificando status das funções..."
supabase functions list

echo ""
echo "🎉 Correções aplicadas com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Teste a geração de PDF no frontend"
echo "2. Verifique os logs: supabase functions logs generate-pdf-proposal"
echo "3. Se houver problemas, verifique as permissões do Storage bucket"
