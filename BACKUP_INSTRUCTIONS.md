# 📦 Guia Completo de Backup - TVDoutor ADS

## 📋 Visão Geral

Este guia fornece instruções completas para realizar backup do banco de dados PostgreSQL do Supabase do projeto TVDoutor ADS. O sistema inclui scripts automatizados e comandos manuais para diferentes cenários.

## 🎯 Arquivos de Backup Criados

### 1. `backup_database.sql`
- **Descrição**: Script SQL completo com comandos para backup manual
- **Conteúdo**: Estrutura, dados, políticas RLS, funções, triggers e configurações
- **Uso**: Execução manual via psql ou pgAdmin

### 2. `backup-database.ps1`
- **Descrição**: Script PowerShell automatizado para Windows
- **Recursos**: Backup automatizado, verificação de pré-requisitos, relatórios
- **Uso**: Execução via PowerShell com parâmetros

## 🔧 Pré-requisitos

### 1. Instalar PostgreSQL Client Tools

**Windows:**
```powershell
# Opção 1: Via Chocolatey
choco install postgresql

# Opção 2: Download direto
# https://www.postgresql.org/download/windows/
```

**Verificar instalação:**
```powershell
pg_dump --version
psql --version
```

### 2. Configurar Variáveis de Ambiente

Crie ou edite o arquivo `.env` na raiz do projeto:

```env
# Configurações do Banco de Dados Supabase
# Obtenha essas informações no Dashboard do Supabase > Settings > Database

SUPABASE_DB_HOST=db.vaogzhwzucijiyvyglls.supabase.co
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=sua-senha-aqui
SUPABASE_DB_NAME=postgres
SUPABASE_DB_PORT=5432

# Configurações opcionais
BACKUP_RETENTION_DAYS=30
BACKUP_COMPRESS_DEFAULT=false
```

### 3. Obter Credenciais do Supabase

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard/project/vaogzhwzucijiyvyglls)
2. Vá para **Settings** > **Database**
3. Na seção **Connection Info**, copie:
   - **Host**: `db.vaogzhwzucijiyvyglls.supabase.co`
   - **Database name**: `postgres`
   - **Port**: `5432`
   - **User**: `postgres`
4. Na seção **Database password**, revele e copie a senha

## 🚀 Uso do Script Automatizado (Recomendado)

### Execução Básica

```powershell
# Backup completo (padrão)
.\backup-database.ps1

# Backup apenas da estrutura
.\backup-database.ps1 -BackupType estrutura

# Backup apenas dos dados
.\backup-database.ps1 -BackupType dados

# Backup comprimido
.\backup-database.ps1 -Compress

# Backup em diretório específico
.\backup-database.ps1 -OutputDir "C:\Backups\TVDoutor"
```

### Parâmetros Disponíveis

| Parâmetro | Descrição | Valores | Padrão |
|-----------|-----------|---------|--------|
| `-BackupType` | Tipo de backup | `completo`, `estrutura`, `dados` | `completo` |
| `-OutputDir` | Diretório de saída | Caminho válido | `./backups` |
| `-Compress` | Criar backup comprimido | Switch (true/false) | `false` |
| `-Help` | Exibir ajuda | Switch | `false` |

### Exemplos Avançados

```powershell
# Backup completo comprimido em diretório específico
.\backup-database.ps1 -BackupType completo -Compress -OutputDir "D:\Backups\Producao"

# Backup de estrutura para documentação
.\backup-database.ps1 -BackupType estrutura -OutputDir "./docs/database"

# Backup de dados para migração
.\backup-database.ps1 -BackupType dados -OutputDir "./migration"
```

## 🔧 Comandos Manuais

### Backup Completo

```bash
# Backup completo (estrutura + dados)
pg_dump -h db.vaogzhwzucijiyvyglls.supabase.co -U postgres -d postgres -p 5432 \
  --no-owner --no-privileges -f backup_completo_$(date +%Y%m%d_%H%M%S).sql

# Backup comprimido
pg_dump -h db.vaogzhwzucijiyvyglls.supabase.co -U postgres -d postgres -p 5432 \
  --no-owner --no-privileges -Fc -f backup_completo_$(date +%Y%m%d_%H%M%S).dump
```

### Backup Seletivo

```bash
# Apenas estrutura
pg_dump -h db.vaogzhwzucijiyvyglls.supabase.co -U postgres -d postgres -p 5432 \
  --schema-only --no-owner --no-privileges -f backup_estrutura.sql

# Apenas dados
pg_dump -h db.vaogzhwzucijiyvyglls.supabase.co -U postgres -d postgres -p 5432 \
  --data-only --no-owner --no-privileges -f backup_dados.sql

# Tabelas específicas
pg_dump -h db.vaogzhwzucijiyvyglls.supabase.co -U postgres -d postgres -p 5432 \
  -t profiles -t agencias -t proposals --no-owner --no-privileges -f backup_principais.sql
```

### Backup com Filtros

```bash
# Excluir tabelas de log
pg_dump -h db.vaogzhwzucijiyvyglls.supabase.co -U postgres -d postgres -p 5432 \
  --exclude-table=email_logs --no-owner --no-privileges -f backup_sem_logs.sql

# Apenas schema public
pg_dump -h db.vaogzhwzucijiyvyglls.supabase.co -U postgres -d postgres -p 5432 \
  --schema=public --no-owner --no-privileges -f backup_public.sql
```

## 🔄 Restauração de Backups

### Restaurar Backup SQL

```bash
# Restaurar backup completo
psql -h [host] -U [user] -d [database] -p 5432 -f backup_file.sql

# Restaurar com verbose
psql -h [host] -U [user] -d [database] -p 5432 -v ON_ERROR_STOP=1 -f backup_file.sql
```

### Restaurar Backup Comprimido

```bash
# Restaurar backup .dump
pg_restore -h [host] -U [user] -d [database] -p 5432 --verbose backup_file.dump

# Restaurar com limpeza prévia
pg_restore -h [host] -U [user] -d [database] -p 5432 --clean --if-exists backup_file.dump
```

### Restaurar Tabelas Específicas

```bash
# Restaurar apenas uma tabela
pg_restore -h [host] -U [user] -d [database] -p 5432 -t agencias backup_file.dump

# Restaurar múltiplas tabelas
pg_restore -h [host] -U [user] -d [database] -p 5432 -t profiles -t agencias backup_file.dump
```

## 📅 Estratégia de Backup Recomendada

### Frequência

- **Diário**: Backup completo automatizado
- **Semanal**: Backup comprimido para arquivo
- **Mensal**: Backup completo para armazenamento externo
- **Antes de deploys**: Backup de segurança

### Retenção

- **Backups diários**: 7 dias
- **Backups semanais**: 4 semanas
- **Backups mensais**: 12 meses
- **Backups de deploy**: Permanente

### Automação com Task Scheduler

```powershell
# Criar tarefa diária às 2:00 AM
schtasks /create /tn "TVDoutor Backup Diario" /tr "PowerShell.exe -File C:\path\to\backup-database.ps1" /sc daily /st 02:00

# Criar tarefa semanal comprimida
schtasks /create /tn "TVDoutor Backup Semanal" /tr "PowerShell.exe -File C:\path\to\backup-database.ps1 -Compress" /sc weekly /d SUN /st 01:00
```

## 🔍 Verificação e Validação

### Testar Backup

```sql
-- Verificar integridade do backup
\i backup_file.sql

-- Contar registros por tabela
SELECT 
    schemaname,
    tablename,
    n_live_tup as registros
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

### Validar Estrutura

```sql
-- Verificar tabelas
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Verificar políticas RLS
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- Verificar funções
SELECT proname FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

## 🚨 Troubleshooting

### Erro: "pg_dump: command not found"

**Solução:**
```powershell
# Adicionar PostgreSQL ao PATH
$env:PATH += ";C:\Program Files\PostgreSQL\15\bin"

# Ou instalar via Chocolatey
choco install postgresql
```

### Erro: "connection refused"

**Verificações:**
1. Host correto no .env
2. Porta 5432 acessível
3. Credenciais válidas
4. Firewall/proxy não bloqueando

### Erro: "authentication failed"

**Soluções:**
1. Verificar senha no Supabase Dashboard
2. Resetar senha do banco se necessário
3. Verificar usuário (deve ser 'postgres')

### Backup muito lento

**Otimizações:**
```bash
# Usar compressão
pg_dump -Fc ...

# Usar múltiplos jobs (PostgreSQL 9.3+)
pg_dump -j 4 ...

# Excluir tabelas grandes desnecessárias
pg_dump --exclude-table=logs ...
```

### Arquivo de backup muito grande

**Soluções:**
1. Usar compressão (`-Fc` ou `-Compress`)
2. Backup apenas de estrutura para desenvolvimento
3. Excluir tabelas de log/auditoria
4. Usar backup incremental para dados grandes

## 📊 Monitoramento

### Logs do Script

O script PowerShell gera logs detalhados:
- ✅ Sucessos em verde
- ⚠️ Avisos em amarelo
- ❌ Erros em vermelho
- 📋 Informações em azul

### Relatórios

Cada backup gera um arquivo de relatório:
- Nome: `backup_file_report.txt`
- Conteúdo: Data, tamanho, configurações, comandos de restauração

### Métricas Importantes

- **Tempo de backup**: Deve ser < 5 minutos para DB pequeno
- **Tamanho do arquivo**: Monitorar crescimento
- **Taxa de sucesso**: Deve ser 100%
- **Espaço em disco**: Manter 3x o tamanho do backup

## 🔐 Segurança

### Proteção de Credenciais

- ✅ Usar arquivo `.env` (não commitado)
- ✅ Variável `PGPASSWORD` limpa após uso
- ✅ Permissões restritas nos arquivos de backup
- ❌ Nunca hardcodar senhas no script

### Criptografia de Backups

```powershell
# Criptografar backup com 7-Zip
7z a -p"senha-forte" backup_criptografado.7z backup_file.sql

# Ou usar GPG
gpg --symmetric --cipher-algo AES256 backup_file.sql
```

### Armazenamento Seguro

- 📁 Local: Diretório com permissões restritas
- ☁️ Cloud: AWS S3, Azure Blob, Google Cloud Storage
- 💾 Físico: Disco externo criptografado
- 🔄 Replicação: Múltiplas localizações

## 📞 Suporte

Em caso de problemas:

1. **Verificar logs** do script PowerShell
2. **Testar conexão** manualmente com psql
3. **Validar credenciais** no Supabase Dashboard
4. **Consultar documentação** do PostgreSQL
5. **Contatar administrador** do sistema

---

## 📚 Referências

- [Documentação pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [Documentação pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html)
- [Supabase Database Docs](https://supabase.com/docs/guides/database)
- [PostgreSQL Backup Best Practices](https://www.postgresql.org/docs/current/backup.html)

---

**Última atualização**: Janeiro 2025  
**Versão**: 1.0  
**Projeto**: TVDoutor ADS