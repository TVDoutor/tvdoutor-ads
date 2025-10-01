#!/bin/bash

echo "🔧 Corrigindo TODOS os problemas de PDF e RLS..."

# 1. Aplicar migrações SQL
echo "📊 Aplicando migrações SQL..."
echo "  - Função get_proposal_details corrigida"
echo "  - Políticas RLS para admin_logs"

supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Migrações SQL aplicadas com sucesso!"
else
    echo "❌ Erro ao aplicar migrações SQL"
    exit 1
fi

# 2. Fazer deploy da Edge Function corrigida
echo "🚀 Fazendo deploy da Edge Function com CORS corrigido..."
supabase functions deploy generate-pdf-proposal

if [ $? -eq 0 ]; then
    echo "✅ Edge Function deployada com sucesso!"
else
    echo "❌ Erro no deploy da Edge Function"
    exit 1
fi

# 3. Verificar se as funções estão funcionando
echo "🔍 Verificando status das funções..."
supabase functions list

# 4. Testar a função SQL
echo "🧪 Testando função SQL get_proposal_details..."
echo "SELECT get_proposal_details(39);" | supabase db shell

# 5. Verificar políticas RLS
echo "🔐 Verificando políticas RLS para admin_logs..."
echo "SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'admin_logs';" | supabase db shell

echo ""
echo "🎉 TODAS as correções aplicadas com sucesso!"
echo ""
echo "📋 Resumo das correções:"
echo "✅ 1. CORS corrigido na Edge Function generate-pdf-proposal"
echo "✅ 2. Função SQL get_proposal_details corrigida"
echo "✅ 3. Políticas RLS para admin_logs criadas"
echo "✅ 4. Headers CORS melhorados"
echo "✅ 5. Tratamento de preflight requests"
echo ""
echo "🔍 Próximos passos para testar:"
echo "1. Acesse uma proposta existente"
echo "2. Clique em 'PDF Profissional'"
echo "3. Verifique se não há mais erros de CORS no console"
echo "4. Confirme que o PDF é gerado sem erros de RLS"
echo ""
echo "📊 Para monitorar:"
echo "- Logs da Edge Function: supabase functions logs generate-pdf-proposal --follow"
echo "- Logs do banco: supabase db logs"

