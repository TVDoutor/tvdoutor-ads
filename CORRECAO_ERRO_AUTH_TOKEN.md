# 🔧 Correção de Erro de Autenticação - Invalid Refresh Token

## 📋 Problema Identificado

O erro `AuthApiError: Invalid Refresh Token: Refresh Token Not Found` ocorre quando há tokens expirados ou corrompidos armazenados no navegador.

## ✅ Erros Corrigidos

### 1. **Erro no Sidebar.tsx (Linha 94)**
- **Problema**: `Uncaught ReferenceError: Target is not defined`
- **Solução**: Adicionada importação do ícone `Target` de `lucide-react`
- **Status**: ✅ Corrigido e commitado

### 2. **Erro de Autenticação**
- **Problema**: `Invalid Refresh Token: Refresh Token Not Found`
- **Causa**: Tokens expirados ou corrompidos no localStorage
- **Solução**: Limpar cache do navegador

## 🔨 Solução Rápida: Limpar Cache de Autenticação

### Opção 1: Via Console do Navegador (Recomendado)

1. **Abra o Console do Navegador**:
   - Pressione `F12` ou `Ctrl+Shift+I`
   - Vá para a aba **Console**

2. **Execute o seguinte comando**:
```javascript
// Limpar dados do Supabase
localStorage.clear();
sessionStorage.clear();

// Recarregar a página
location.reload();
```

3. **Faça login novamente**

### Opção 2: Via Configurações do Navegador

#### Chrome/Edge:
1. Pressione `F12` para abrir DevTools
2. Vá para **Application** (Aplicação)
3. No menu lateral, clique em **Local Storage**
4. Selecione o domínio do seu site (localhost ou tvdoutor)
5. Clique com botão direito e selecione **Clear**
6. Faça o mesmo para **Session Storage**
7. Recarregue a página (`Ctrl+Shift+R`)

#### Firefox:
1. Pressione `F12` para abrir DevTools
2. Vá para **Storage** (Armazenamento)
3. Expanda **Local Storage**
4. Clique com botão direito no domínio e selecione **Delete All**
5. Faça o mesmo para **Session Storage**
6. Recarregue a página (`Ctrl+Shift+R`)

### Opção 3: Hard Refresh (Limpeza Temporária)

1. Pressione `Ctrl+Shift+R` (Windows/Linux) ou `Cmd+Shift+R` (Mac)
2. Se não funcionar, tente `Ctrl+F5`

## 🔍 Verificação

Após limpar o cache, você deve:

1. ✅ **Não ver mais o erro de "Invalid Refresh Token"**
2. ✅ **Ver a página de login (se não estiver autenticado)**
3. ✅ **Conseguir fazer login normalmente**
4. ✅ **Ver o menu lateral completo** (dependendo da sua role)

## 🚀 Correções Aplicadas no Código

### Commit 1: `fix: Corrigir erro de sintaxe que causava tela branca`
- Corrigido conflito de variável `error` no `impact-models-service.ts`
- Renomeadas variáveis de catch para evitar conflitos
- Removida importação não utilizada `Loader2`

### Commit 2: `fix: Adicionar importação faltante Target no Sidebar`
- Adicionada importação do ícone `Target` de `lucide-react`
- Resolvido erro `ReferenceError: Target is not defined`
- Corrigido menu de "Fórmulas de Impacto"

## 📝 Notas Importantes

- **Não é necessário modificar código** para resolver o erro de token
- O erro é apenas no cliente (navegador)
- Limpar o cache **não afeta** os dados do banco de dados
- Após limpar, você precisará **fazer login novamente**

## 🔐 Por Que Isso Acontece?

O Supabase armazena tokens de autenticação no `localStorage` do navegador:
- **Access Token**: Válido por 1 hora
- **Refresh Token**: Usado para renovar o access token

Quando:
1. Os tokens expiram
2. O formato do token muda (atualização do Supabase)
3. Há inconsistências entre sessões
4. O usuário foi removido/alterado no banco

O navegador tenta usar um token inválido, causando o erro.

## 🆘 Se o Problema Persistir

1. **Verifique se o Supabase está configurado corretamente**:
   - URL do Supabase em `.env`
   - Anon Key válida
   - Projeto ativo no Supabase

2. **Verifique as políticas RLS**:
   - Tabela `profiles` deve permitir leitura para usuários autenticados
   - Tabela `user_roles` deve ter políticas corretas

3. **Teste em modo anônimo/incógnito**:
   - Se funcionar em modo anônimo, o problema é cache local
   - Se não funcionar, o problema é no servidor/configuração

## 📞 Suporte

Se após seguir todos os passos o erro persistir, verifique:
- Console do navegador para outros erros
- Network tab para ver requisições falhadas
- Logs do Supabase Dashboard

---

**Última atualização**: 28/10/2025
**Status**: ✅ Todos os erros de código corrigidos
**Ação necessária**: Limpar cache do navegador para resolver erro de token

