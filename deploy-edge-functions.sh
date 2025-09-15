#!/bin/bash

# Script para fazer deploy das Edge Functions do Supabase
# Execute este script para publicar as funções no Supabase

echo "🚀 Fazendo deploy das Edge Functions..."

# Verificar se o Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não encontrado. Instale com: npm install -g supabase"
    exit 1
fi

# Verificar se está logado no Supabase
if ! supabase projects list &> /dev/null; then
    echo "❌ Não está logado no Supabase. Execute: supabase login"
    exit 1
fi

echo "📦 Fazendo deploy da Edge Function: process-pending-emails"
supabase functions deploy process-pending-emails

if [ $? -eq 0 ]; then
    echo "✅ process-pending-emails deployada com sucesso!"
else
    echo "❌ Erro ao fazer deploy de process-pending-emails"
    exit 1
fi

echo "📦 Fazendo deploy da Edge Function: email-stats"
supabase functions deploy email-stats

if [ $? -eq 0 ]; then
    echo "✅ email-stats deployada com sucesso!"
else
    echo "❌ Erro ao fazer deploy de email-stats"
    exit 1
fi

echo "📦 Fazendo deploy da Edge Function: project-milestones"
supabase functions deploy project-milestones

if [ $? -eq 0 ]; then
    echo "✅ project-milestones deployada com sucesso!"
else
    echo "❌ Erro ao fazer deploy de project-milestones"
    exit 1
fi

echo "📦 Fazendo deploy da Edge Function: marco-templates"
supabase functions deploy marco-templates

if [ $? -eq 0 ]; then
    echo "✅ marco-templates deployada com sucesso!"
else
    echo "❌ Erro ao fazer deploy de marco-templates"
    exit 1
fi

echo "🎉 Todas as Edge Functions foram deployadas com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Teste as funções no Dashboard do Supabase"
echo "2. Verifique os logs para garantir que estão funcionando"
echo "3. O sistema de emails agora usará as Edge Functions em vez de acessar diretamente o banco"
