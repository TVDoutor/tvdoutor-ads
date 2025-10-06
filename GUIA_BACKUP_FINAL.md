# 💾 Guia Completo de Backup do Banco de Dados

## 🎯 **Resumo da Situação**

Criamos a estrutura de backup local, mas o backup via API falhou devido a problemas de autenticação. Aqui estão as **melhores opções** para fazer backup do seu banco de dados.

## 📁 **Arquivos de Backup Criados**

✅ **Estrutura de backup criada em**: `backups/`
- `backup_instructions_2025-10-03.md` - Instruções detalhadas
- `migrations_backup_2025-10-03.txt` - Lista das migrações
- `backup_info_2025-10-03.json` - Informações do projeto
- `api_backup_2025-10-03.json` - Tentativa de backup via API
- `backup_summary_2025-10-03.txt` - Resumo do backup

## 🛠️ **Métodos de Backup Recomendados**

### **🥇 Método 1: Supabase Dashboard (MAIS FÁCIL)**

1. **Acesse**: https://supabase.com/dashboard
2. **Vá em**: Seu projeto → Settings → Database
3. **Clique em**: "Download backup"
4. **Salve o arquivo** em: `backups/backup_complete_2025-10-03.sql`

**✅ Vantagens**:
- Backup completo e oficial
- Inclui todos os dados e estrutura
- Fácil de restaurar
- Sem necessidade de instalações

### **🥈 Método 2: pg_dump (MAIS COMPLETO)**

#### **Instalar PostgreSQL Tools**:
```bash
# Windows (usando Chocolatey)
choco install postgresql

# Ou baixar diretamente:
# https://www.postgresql.org/download/windows/
```

#### **Comando de Backup**:
```bash
pg_dump "postgresql://postgres:[SENHA]@db.vaogzhwzucijiyvyglls.supabase.co:5432/postgres" > "backups/backup_complete_2025-10-03.sql"
```

**Substitua [SENHA] pela senha do banco de dados**

### **🥉 Método 3: Backup Manual das Tabelas**

Se os métodos acima não funcionarem, você pode fazer backup manual:

1. **Acesse**: https://supabase.com/dashboard
2. **Vá em**: Table Editor
3. **Para cada tabela**:
   - Clique na tabela
   - Clique em "Export" → "CSV" ou "JSON"
   - Salve o arquivo em `backups/`

## 🔄 **Como Restaurar o Backup**

### **Via Supabase Dashboard**:
1. Vá em Settings → Database
2. Clique em "Restore from backup"
3. Selecione o arquivo .sql

### **Via psql**:
```bash
psql "postgresql://postgres:[SENHA]@db.vaogzhwzucijiyvyglls.supabase.co:5432/postgres" < backups/backup_complete_2025-10-03.sql
```

## 📊 **Informações do Projeto**

- **Projeto**: vaogzhwzucijiyvyglls
- **URL**: https://vaogzhwzucijiyvyglls.supabase.co
- **Data do Backup**: 2025-10-03
- **Tabelas Principais**: profiles, screens, proposals, agencies, venues, etc.

## ⚠️ **IMPORTANTE**

### **Antes de Fazer Backup**:
- ✅ Verifique se o sistema está funcionando
- ✅ Confirme que não há operações em andamento
- ✅ Anote a data/hora do backup

### **Após o Backup**:
- ✅ Verifique o tamanho do arquivo (não deve ser 0 bytes)
- ✅ Teste a restauração em ambiente de desenvolvimento
- ✅ Mantenha o arquivo em local seguro
- ✅ Faça backup regularmente

## 🎯 **Recomendação Final**

**Use o Método 1 (Supabase Dashboard)**:
1. É o mais confiável
2. Não requer instalações
3. Backup completo e oficial
4. Fácil de restaurar

## 📞 **Se Precisar de Ajuda**

1. **Documentação Supabase**: https://supabase.com/docs
2. **Suporte**: https://supabase.com/support
3. **Comunidade**: https://github.com/supabase/supabase/discussions

## 🔄 **Próximos Passos**

1. **Execute o backup** usando um dos métodos acima
2. **Verifique o arquivo** criado
3. **Teste a restauração** em ambiente de desenvolvimento
4. **Documente o processo** para futuros backups

---

**🎯 Resultado**: Você terá um backup completo do banco de dados salvo localmente para rollback quando necessário.
