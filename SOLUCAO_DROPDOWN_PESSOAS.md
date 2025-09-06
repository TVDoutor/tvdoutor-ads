# 🔧 Solução: Dropdown Não Puxa Dados Corretos

## 🚨 Problema Identificado

O dropdown "Selecionar Usuário" no modal "Adicionar Membro" ainda está mostrando dados da tabela `profiles` (usuários do sistema) em vez da tabela `pessoas_projeto`.

## 🔍 Diagnóstico

O problema acontece porque:
1. **A tabela `pessoas_projeto` não existe** no banco de dados, OU
2. **A tabela existe mas está vazia**, OU  
3. **Há erro de permissão** ao acessar a tabela

## ✅ Solução Implementada

### 1. **Código com Fallback**
Atualizei o `TeamMemberForm.tsx` para:
- **Tentar carregar** da tabela `pessoas_projeto` primeiro
- **Se falhar**, usar a tabela `profiles` como fallback
- **Adicionar logs** no console para debug

### 2. **Script de Verificação**
Criei o arquivo `VERIFICAR_E_CRIAR_PESSOAS_PROJETO.sql` que:
- Verifica se a tabela existe
- Cria a tabela se não existir
- Configura permissões e políticas RLS
- Insere dados de exemplo

## 📋 Como Resolver

### Opção 1: Executar Script de Verificação (Recomendado)

1. **Acesse o Supabase Dashboard**:
   - Vá para: https://supabase.com/dashboard/project/vaogzhwzucijiyvyglls/sql

2. **Execute o Script**:
   - Copie o conteúdo do arquivo `VERIFICAR_E_CRIAR_PESSOAS_PROJETO.sql`
   - Cole no Editor SQL e execute

3. **Verifique os Resultados**:
   - Deve mostrar "Pessoas inseridas com sucesso!"
   - Deve listar 5 pessoas de exemplo

### Opção 2: Verificar no Console

1. **Abra o Console do Navegador** (F12)
2. **Recarregue a página** de Equipes
3. **Abra o modal "Adicionar Membro"**
4. **Verifique os logs**:
   - `🔍 Tentando carregar pessoas da tabela pessoas_projeto...`
   - Se aparecer `⚠️ Erro ao carregar pessoas_projeto`, a tabela não existe
   - Se aparecer `✅ Pessoas carregadas`, a tabela existe e tem dados

## 🧪 Como Testar

### Após Executar o Script:

1. **Recarregue a página** de Equipes
2. **Abra o modal "Adicionar Membro"**
3. **No dropdown "Selecionar Pessoa"**:
   - Deve mostrar 5 pessoas de exemplo
   - Deve permitir busca por nome ou email
   - Deve mostrar cargo e telefone

### Logs Esperados no Console:
```
🔍 Tentando carregar pessoas da tabela pessoas_projeto...
✅ Pessoas carregadas da tabela pessoas_projeto: 5
✅ Usuários disponíveis (pessoas_projeto): 5
```

## 🔄 Comportamento Atual

### Se a tabela `pessoas_projeto` NÃO existir:
- Dropdown mostra usuários da tabela `profiles` (comportamento atual)
- Log: `⚠️ Erro ao carregar pessoas_projeto, tentando profiles`

### Se a tabela `pessoas_projeto` existir:
- Dropdown mostra pessoas da tabela `pessoas_projeto`
- Log: `✅ Pessoas carregadas da tabela pessoas_projeto`

## 📞 Próximos Passos

1. **Execute o script** `VERIFICAR_E_CRIAR_PESSOAS_PROJETO.sql`
2. **Teste o dropdown** no modal "Adicionar Membro"
3. **Verifique os logs** no console
4. **Me informe** se funcionou ou se ainda há problemas

A solução está pronta para funcionar assim que a tabela for criada! 🎉
