# 🐳 Instruções de Configuração do Docker - TVDoutor-ADS

## 📋 Pré-requisitos

Antes de começar, você precisa instalar o Docker Desktop no Windows.

## 🚀 Passo 1: Instalação do Docker Desktop

### Opção 1: Usar o instalador já baixado
Você já tem o `DockerDesktopInstaller.exe` no seu projeto. Execute-o:

1. **Clique duplo** no arquivo `DockerDesktopInstaller.exe`
2. **Siga o assistente** de instalação
3. **Reinicie o computador** quando solicitado

### Opção 2: Download direto
Se preferir baixar a versão mais recente:
1. Acesse: https://www.docker.com/products/docker-desktop/
2. Baixe o Docker Desktop para Windows
3. Execute o instalador
4. Reinicie o computador

## ⚙️ Passo 2: Configuração Inicial

Após a instalação e reinicialização:

1. **Abra o Docker Desktop**
2. **Aceite os termos** de uso
3. **Configure o WSL 2** (se solicitado)
4. **Aguarde** a inicialização completa

## 🔧 Passo 3: Verificação da Instalação

Abra o PowerShell ou Command Prompt e execute:

```powershell
# Verificar versão do Docker
docker --version

# Verificar versão do Docker Compose
docker-compose --version

# Testar com um container simples
docker run hello-world
```

## 🚀 Passo 4: Executar o Projeto

Após confirmar que o Docker está funcionando:

### Usando PowerShell (Recomendado)
```powershell
# Build da aplicação
.\docker-scripts.ps1 build

# Executar em produção
.\docker-scripts.ps1 run

# Ou executar em desenvolvimento
.\docker-scripts.ps1 run-dev
```

### Usando comandos diretos
```powershell
# Build
docker-compose build app

# Executar
docker-compose up -d app

# Acessar: http://localhost:3000
```

## 🛠️ Comandos Úteis

### Scripts PowerShell
```powershell
.\docker-scripts.ps1 build          # Build de produção
.\docker-scripts.ps1 build-dev      # Build de desenvolvimento
.\docker-scripts.ps1 run            # Executar produção
.\docker-scripts.ps1 run-dev        # Executar desenvolvimento
.\docker-scripts.ps1 stop           # Parar containers
.\docker-scripts.ps1 clean          # Limpar tudo
.\docker-scripts.ps1 logs           # Ver logs
.\docker-scripts.ps1 status         # Ver status
.\docker-scripts.ps1 help           # Ver ajuda
```

### Comandos Docker diretos
```powershell
# Ver containers rodando
docker ps

# Ver todas as imagens
docker images

# Ver logs
docker-compose logs -f app

# Parar tudo
docker-compose down

# Limpar sistema
docker system prune -a
```

## 🐛 Troubleshooting

### Problema: "docker não é reconhecido"
**Solução:**
1. Reinicie o computador após a instalação
2. Verifique se o Docker Desktop está rodando
3. Abra um novo PowerShell/CMD

### Problema: "WSL 2 required"
**Solução:**
1. Instale o WSL 2: https://docs.microsoft.com/en-us/windows/wsl/install
2. Configure o Docker Desktop para usar WSL 2

### Problema: Porta já em uso
**Solução:**
1. Pare outros serviços na porta 3000 ou 8080
2. Ou altere as portas no `docker-compose.yml`

### Problema: Erro de permissão
**Solução:**
1. Execute o PowerShell como Administrador
2. Ou configure o Docker Desktop para não precisar de admin

## 📊 Verificação Final

Após seguir todos os passos, você deve conseguir:

1. ✅ Docker Desktop rodando
2. ✅ Comando `docker --version` funcionando
3. ✅ Build da aplicação executando
4. ✅ Aplicação acessível em http://localhost:3000

## 🆘 Suporte

Se encontrar problemas:

1. **Verifique os logs**: `docker-compose logs app`
2. **Consulte a documentação**: `DOCKER_README.md`
3. **Reinicie o Docker Desktop**
4. **Verifique se o WSL 2 está funcionando**

## 📝 Próximos Passos

Após a configuração bem-sucedida:

1. **Configure variáveis de ambiente** (arquivo `.env`)
2. **Teste a aplicação** em desenvolvimento e produção
3. **Configure SSL** para produção (se necessário)
4. **Configure CI/CD** para deploy automático

---

**Nota**: Este processo pode levar alguns minutos na primeira execução devido ao download das imagens base.

