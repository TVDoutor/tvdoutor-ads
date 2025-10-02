# Sistema de Versionamento Automático - TV Doutor ADS

Este projeto possui um sistema automatizado de versionamento que incrementa a versão do software e faz deploy para a Vercel sempre que um build é executado.

## 🚀 Scripts Disponíveis

### Build com Versionamento Automático

```bash
# Incrementa versão PATCH (1.0.0 → 1.0.1) - Para correções de bugs
npm run build:version

# Incrementa versão MINOR (1.0.0 → 1.1.0) - Para novas funcionalidades
npm run build:version:minor

# Incrementa versão MAJOR (1.0.0 → 2.0.0) - Para mudanças que quebram compatibilidade
npm run build:version:major
```

### Build Tradicional (sem versionamento)

```bash
# Build de desenvolvimento
npm run build:dev

# Build de produção (sem incrementar versão)
npm run build:prod
```

## 📋 O que Acontece Automaticamente

Quando você executa um dos scripts de versionamento (`build:version*`), o sistema:

1. **📖 Lê a versão atual** do `package.json`
2. **🔄 Incrementa a versão** conforme o tipo especificado
3. **📝 Atualiza o package.json** com a nova versão
4. **🔨 Executa o build** de produção
5. **🌐 Faz deploy** para a Vercel
6. **💾 Faz commit** da nova versão no Git
7. **📊 Mostra resumo** da operação

## 🎯 Tipos de Versionamento

### PATCH (Correções)
- **Uso**: Correções de bugs, pequenos ajustes
- **Exemplo**: `1.0.0` → `1.0.1`
- **Comando**: `npm run build:version`

### MINOR (Funcionalidades)
- **Uso**: Novas funcionalidades, melhorias
- **Exemplo**: `1.0.0` → `1.1.0`
- **Comando**: `npm run build:version:minor`

### MAJOR (Mudanças Importantes)
- **Uso**: Mudanças que quebram compatibilidade, refatorações grandes
- **Exemplo**: `1.0.0` → `2.0.0`
- **Comando**: `npm run build:version:major`

## 📊 Exemplo de Saída

```
🚀 Iniciando Build e Deploy com Versionamento - TV Doutor ADS
===============================================
📋 Versão atual: 1.0.0
🔄 Incrementando versão (patch): 1.0.0 → 1.0.1
✅ Versão atualizada para 1.0.1
🔨 Executando build de produção...
✅ Build concluído com sucesso
🌐 Fazendo deploy para Vercel...
✅ Deploy para Vercel concluído
📝 Fazendo commit da nova versão...
✅ Commit da versão realizado
===============================================
🎉 Build e Deploy Concluídos!
===============================================
📅 Data/Hora: 01/01/2025 15:30:45
🔢 Nova Versão: 1.0.1
🌐 Aplicação disponível em: https://tvdoutor-ads.vercel.app
===============================================
```

## 🔧 Configuração

O sistema está configurado para:
- **Deploy automático** para produção na Vercel
- **Commit automático** da versão no Git
- **Build otimizado** para produção
- **Logs coloridos** para melhor visualização

## ⚠️ Importante

- Use `build:version` para a maioria dos casos (correções e pequenas melhorias)
- Use `build:version:minor` apenas para novas funcionalidades
- Use `build:version:major` apenas para mudanças importantes que quebram compatibilidade
- O sistema faz commit automático, certifique-se de que não há mudanças não commitadas importantes

## 🆘 Troubleshooting

Se houver problemas:

1. **Erro de Git**: Verifique se você está em um repositório Git válido
2. **Erro de Vercel**: Verifique se o Vercel CLI está instalado (`npm i -g vercel`)
3. **Erro de Build**: Verifique se não há erros de TypeScript ou linting
4. **Erro de Deploy**: Verifique as credenciais da Vercel

Para mais informações, consulte os logs detalhados que o script fornece.
