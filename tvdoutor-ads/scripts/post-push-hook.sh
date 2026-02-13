#!/bin/bash

# Git Hook: Executa deploy automático após push
# Este script é executado automaticamente após um git push

echo "🚀 Git Hook: Iniciando deploy automático após push..."

# Verificar se estamos na branch main
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⏭️ Deploy automático apenas para branch main. Branch atual: $CURRENT_BRANCH"
    exit 0
fi

# Verificar se o script de deploy existe
if [ ! -f "scripts/deploy.js" ]; then
    echo "❌ Script de deploy não encontrado"
    exit 1
fi

# Executar deploy automático
echo "🔄 Executando deploy automático..."
node scripts/deploy.js --skip-commit

if [ $? -eq 0 ]; then
    echo "✅ Deploy automático concluído com sucesso!"
else
    echo "❌ Deploy automático falhou!"
    exit 1
fi
