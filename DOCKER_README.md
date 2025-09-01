# TVDoutor-ADS - Configuração Docker

Este documento explica como configurar e executar o projeto TVDoutor-ADS usando Docker.

## 📋 Pré-requisitos

- Docker Desktop instalado e rodando
- Docker Compose (incluído no Docker Desktop)

## 🚀 Início Rápido

### 1. Build e Execução em Produção

```bash
# Build da imagem
docker-compose build app

# Executar aplicação
docker-compose up -d app

# Acessar aplicação
# http://localhost:3000
```

### 2. Desenvolvimento

```bash
# Build da imagem de desenvolvimento
docker-compose build app-dev

# Executar em modo desenvolvimento
docker-compose --profile dev up -d app-dev

# Acessar aplicação
# http://localhost:8080
```

## 🛠️ Scripts de Automação

Use o script `docker-scripts.sh` para facilitar o gerenciamento:

```bash
# Tornar o script executável (Linux/Mac)
chmod +x docker-scripts.sh

# Comandos disponíveis
./docker-scripts.sh build          # Build de produção
./docker-scripts.sh build-dev      # Build de desenvolvimento
./docker-scripts.sh run            # Executar produção
./docker-scripts.sh run-dev        # Executar desenvolvimento
./docker-scripts.sh stop           # Parar containers
./docker-scripts.sh clean          # Limpar tudo
./docker-scripts.sh logs           # Ver logs
./docker-scripts.sh shell          # Acessar shell
./docker-scripts.sh restart        # Reiniciar
./docker-scripts.sh status         # Ver status
```

## 📁 Estrutura de Arquivos Docker

```
├── Dockerfile              # Imagem de produção
├── Dockerfile.dev          # Imagem de desenvolvimento
├── docker-compose.yml      # Configuração dos serviços
├── nginx.conf              # Configuração nginx (produção)
├── nginx.prod.conf         # Configuração nginx (produção com proxy)
├── .dockerignore           # Arquivos ignorados no build
├── docker-scripts.sh       # Scripts de automação
└── DOCKER_README.md        # Esta documentação
```

## 🔧 Configurações

### Portas

- **Produção**: `3000:80` (aplicação React via nginx)
- **Desenvolvimento**: `8080:8080` (Vite dev server)
- **Nginx Proxy**: `80:80` e `443:443` (apenas com profile production)

### Variáveis de Ambiente

As variáveis de ambiente são carregadas do arquivo `.env` (crie baseado no `env.example`).

### Volumes

- **Desenvolvimento**: `./src:/app/src` e `./public:/app/public` para hot reload
- **Produção**: Arquivos estáticos servidos via nginx

## 🌐 Perfis do Docker Compose

### Produção (padrão)
```bash
docker-compose up -d app
```

### Desenvolvimento
```bash
docker-compose --profile dev up -d app-dev
```

### Produção com Nginx Proxy
```bash
docker-compose --profile production up -d
```

## 🔍 Comandos Úteis

### Ver logs em tempo real
```bash
docker-compose logs -f app
```

### Acessar shell do container
```bash
docker-compose exec app sh
```

### Rebuild sem cache
```bash
docker-compose build --no-cache app
```

### Ver status dos containers
```bash
docker-compose ps
```

### Parar e remover tudo
```bash
docker-compose down --rmi all --volumes --remove-orphans
```

## 🐛 Troubleshooting

### Porta já em uso
Se a porta 3000 ou 8080 estiver em uso, altere no `docker-compose.yml`:
```yaml
ports:
  - "3001:80"  # Mude para porta disponível
```

### Problemas de permissão (Linux/Mac)
```bash
sudo chown -R $USER:$USER .
```

### Limpar cache do Docker
```bash
docker system prune -a
```

### Rebuild completo
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 📊 Monitoramento

### Ver uso de recursos
```bash
docker stats
```

### Ver logs de erro
```bash
docker-compose logs app | grep ERROR
```

### Verificar saúde do container
```bash
docker-compose exec app nginx -t
```

## 🔒 Segurança

- Headers de segurança configurados no nginx
- Rate limiting para APIs
- SSL/TLS pronto para produção (certificados necessários)
- Container rodando como usuário não-root

## 📈 Performance

- Build multi-stage para otimizar tamanho da imagem
- Gzip compression habilitado
- Cache de arquivos estáticos (1 ano)
- Nginx otimizado para produção

## 🚀 Deploy

Para deploy em produção:

1. Configure variáveis de ambiente
2. Configure certificados SSL (se necessário)
3. Execute com profile production:
```bash
docker-compose --profile production up -d
```

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs: `docker-compose logs app`
2. Verifique o status: `docker-compose ps`
3. Consulte este README
4. Verifique a documentação do Docker

