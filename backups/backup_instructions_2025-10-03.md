# 📋 Instruções para Backup do Banco de Dados

## 🎯 Informações do Projeto
- **Projeto**: vaogzhwzucijiyvyglls
- **URL**: https://vaogzhwzucijiyvyglls.supabase.co
- **Data do Backup**: 2025-10-03T13:57:55.706Z

## 🛠️ Método 1: Backup via Supabase Dashboard

1. **Acesse**: https://supabase.com/dashboard
2. **Vá em**: Seu projeto → Settings → Database
3. **Clique em**: "Download backup"
4. **Salve o arquivo** em: C:\Users\hilca\OneDrive\Documentos\GitHub\TVDoutor-ADS-2\tvdoutor-ads\backups

## 🛠️ Método 2: Backup via pg_dump

### Instalar PostgreSQL Tools:
```bash
# Windows (usando Chocolatey)
choco install postgresql

# Ou baixar diretamente:
# https://www.postgresql.org/download/windows/
```

### Comando de Backup:
```bash
pg_dump "postgresql://postgres:[SENHA]@db.vaogzhwzucijiyvyglls.supabase.co:5432/postgres" > "C:\Users\hilca\OneDrive\Documentos\GitHub\TVDoutor-ADS-2\tvdoutor-ads\backups/backup_2025-10-03.sql"
```

**Substitua [SENHA] pela senha do banco de dados**

## 🛠️ Método 3: Backup via API (Dados Específicos)

Execute o script backup-via-api.js para backup de tabelas específicas.

## 📁 Arquivos de Backup Criados

- **Backup principal**: backup_2025-10-03.sql
- **Migrações**: migrations_backup_2025-10-03.zip
- **Informações**: backup_info_2025-10-03.json

## 🔄 Para Restaurar

1. **Via Supabase Dashboard**:
   - Vá em Settings → Database
   - Clique em "Restore from backup"
   - Selecione o arquivo .sql

2. **Via psql**:
   ```bash
   psql "postgresql://postgres:[SENHA]@db.vaogzhwzucijiyvyglls.supabase.co:5432/postgres" < backup_2025-10-03.sql
   ```

## ⚠️ IMPORTANTE

- Mantenha os arquivos de backup em local seguro
- Teste a restauração em ambiente de desenvolvimento primeiro
- O backup contém todos os dados do banco
- Faça backup regularmente

## 📞 Suporte

Se precisar de ajuda:
- Documentação Supabase: https://supabase.com/docs
- Suporte: https://supabase.com/support
