#!/bin/bash

# Script de Deploy Automático para TV Doutor ADS
# Este script executa build, commit, push e deploy para Vercel

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Parâmetros
MESSAGE="Deploy automático - $(date '+%Y-%m-%d %H:%M:%S')"
SKIP_COMMIT=false
SKIP_SUPABASE=false
PREVIEW=false

# Processar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--message)
            MESSAGE="$2"
            shift 2
            ;;
        --skip-commit)
            SKIP_COMMIT=true
            shift
            ;;
        --skip-supabase)
            SKIP_SUPABASE=true
            shift
            ;;
        --preview)
            PREVIEW=true
            shift
            ;;
        -h|--help)
            echo "Uso: $0 [opções]"
            echo "Opções:"
            echo "  -m, --message MENSAGEM    Mensagem do commit (padrão: Deploy automático)"
            echo "  --skip-commit            Pular commit e push"
            echo "  --skip-supabase         Pular migrações do Supabase"
            echo "  --preview               Deploy em modo preview"
            echo "  -h, --help              Mostrar esta ajuda"
            exit 0
            ;;
        *)
            echo "Opção desconhecida: $1"
            exit 1
            ;;
    esac
done

echo -e "${GREEN}🚀 Iniciando Deploy Automático - TV Doutor ADS${NC}"
echo -e "${GREEN}===============================================${NC}"

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# 1. Verificar status do Git
echo -e "${YELLOW}📋 Verificando status do Git...${NC}"
GIT_STATUS=$(git status --porcelain)

if [ -n "$GIT_STATUS" ] && [ "$SKIP_COMMIT" = false ]; then
    echo -e "${YELLOW}📝 Alterações detectadas:${NC}"
    echo -e "${GRAY}$GIT_STATUS${NC}"
    
    # Adicionar todas as alterações
    echo -e "${YELLOW}➕ Adicionando alterações ao Git...${NC}"
    git add .
    
    # Fazer commit
    echo -e "${YELLOW}💾 Fazendo commit...${NC}"
    git commit -m "$MESSAGE"
    
    # Push para o repositório
    echo -e "${YELLOW}📤 Enviando para o repositório...${NC}"
    git push origin main
    
    echo -e "${GREEN}✅ Alterações enviadas para o repositório${NC}"
elif [ "$SKIP_COMMIT" = true ]; then
    echo -e "${YELLOW}⏭️ Pulando commit (--skip-commit especificado)${NC}"
else
    echo -e "${GREEN}✅ Nenhuma alteração detectada${NC}"
fi

# 2. Executar build de produção
echo -e "${YELLOW}🔨 Executando build de produção...${NC}"
npm run build:prod

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro no build. Deploy cancelado.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build concluído com sucesso${NC}"

# 3. Deploy para Supabase (se não for pulado)
if [ "$SKIP_SUPABASE" = false ]; then
    echo -e "${YELLOW}🗄️ Aplicando migrações do Supabase...${NC}"
    npx supabase db push --yes
    
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}⚠️ Aviso: Erro nas migrações do Supabase, mas continuando...${NC}"
    else
        echo -e "${GREEN}✅ Migrações do Supabase aplicadas${NC}"
    fi
else
    echo -e "${YELLOW}⏭️ Pulando Supabase (--skip-supabase especificado)${NC}"
fi

# 4. Deploy para Vercel
echo -e "${YELLOW}🌐 Fazendo deploy para Vercel...${NC}"

if [ "$PREVIEW" = true ]; then
    echo -e "${YELLOW}🔍 Deploy em modo preview...${NC}"
    vercel
else
    echo -e "${YELLOW}🚀 Deploy em produção...${NC}"
    vercel --prod
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro no deploy do Vercel${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deploy para Vercel concluído${NC}"

# 5. Resumo final
echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}🎉 Deploy Automático Concluído!${NC}"
echo -e "${GREEN}===============================================${NC}"
echo -e "${GRAY}📅 Data/Hora: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${CYAN}🌐 Aplicação disponível em: https://tvdoutor-ads.vercel.app${NC}"
echo -e "${CYAN}📊 Dashboard Supabase: https://supabase.com/dashboard${NC}"

# Verificar se o Vercel CLI está instalado
echo -e "${YELLOW}🔍 Verificando Vercel CLI...${NC}"
VERCEL_VERSION=$(vercel --version 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Vercel CLI: $VERCEL_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️ Vercel CLI não encontrado. Instale com: npm i -g vercel${NC}"
fi

echo -e "${GREEN}===============================================${NC}"
