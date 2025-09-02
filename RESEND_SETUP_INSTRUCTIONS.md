# 🚀 Instruções de Configuração do Resend - TV Doutor ADS

## ✅ O que foi implementado

A integração com o Resend foi **completamente implementada** no sistema! Agora você só precisa configurar a API Key para começar a enviar emails reais.

## 🔧 Como configurar (Passo a passo)

### 1. Criar conta no Resend
1. Acesse: https://resend.com
2. Clique em "Sign Up" e crie sua conta
3. Confirme seu email

### 2. Obter API Key
1. Após login, vá para **API Keys** no dashboard
2. Clique em **"Create API Key"**
3. Dê um nome (ex: "TVDoutor-ADS")
4. Copie a API Key (começa com `re_`)

### 3. Configurar no projeto

#### Para desenvolvimento local:
Crie um arquivo `.env` na raiz do projeto (se não existir) e adicione:

```env
RESEND_API_KEY=re_sua_api_key_aqui
```

#### Para produção (Supabase):
1. Acesse seu projeto no Supabase Dashboard
2. Vá em **Settings** → **Environment Variables**
3. Adicione uma nova variável:
   - **Name:** `RESEND_API_KEY`
   - **Value:** `re_sua_api_key_aqui`
4. Clique em **Add variable**

### 4. Configurar domínio (Opcional - para produção)

Para usar `noreply@tvdoutor.com.br` em produção:

1. No dashboard do Resend, vá em **Domains**
2. Clique em **Add Domain**
3. Digite: `tvdoutor.com.br`
4. Siga as instruções para configurar os DNS records:

```dns
# Adicionar estes records no seu provedor de DNS:
TXT @ "v=spf1 include:_spf.resend.com ~all"
CNAME resend._domainkey CNAME resend._domainkey.resend.com
```

**Nota:** Se não configurar domínio, o Resend usará um domínio próprio (funciona perfeitamente).

## 🧪 Como testar

### Teste rápido:
1. Configure a API Key (passo 3)
2. No sistema, crie uma nova proposta
3. Verifique os logs no console do navegador
4. Verifique se o email chegou na caixa de entrada

### Logs esperados:
```
📧 [RESEND] Enviando email para cliente@email.com...
✅ Email enviado com sucesso via Resend para cliente@email.com
```

## 🔄 Fallback automático

O sistema tem **fallback automático**:
- ✅ **Com API Key:** Usa Resend (emails reais)
- ⚠️ **Sem API Key:** Usa simulação (desenvolvimento)
- 🔄 **Erro no Resend:** Volta para simulação automaticamente

## 📋 Checklist de configuração

- [ ] Conta criada no Resend
- [ ] API Key obtida
- [ ] Variável `RESEND_API_KEY` configurada
- [ ] Teste realizado com proposta real
- [ ] Emails chegando na caixa de entrada
- [ ] Domínio configurado (opcional, para produção)

## 🚨 Resolução de problemas

### "Email simulado" ainda aparece nos logs?
- Verifique se `RESEND_API_KEY` está configurada corretamente
- Reinicie o servidor de desenvolvimento
- Verifique se não há espaços na API Key

### Emails não chegam?
- Verifique a caixa de spam
- Confirme se a API Key está válida no dashboard do Resend
- Verifique os logs da Edge Function no Supabase

### Erro de CORS?
- O sistema usa Edge Functions do Supabase, que resolve CORS automaticamente
- Se persistir, verifique as configurações do projeto no Supabase

## 💰 Preços do Resend

- **Gratuito:** 3.000 emails/mês
- **Pro:** $20/mês para 50.000 emails
- **Enterprise:** Preços personalizados

Para o TV Doutor ADS, o plano gratuito deve ser suficiente inicialmente.

## 📞 Suporte

Se precisar de ajuda:
1. Verifique os logs no console
2. Consulte a documentação do Resend: https://resend.com/docs
3. Entre em contato com o desenvolvedor

---

**Status:** 🟢 Implementação completa - Pronto para uso!
**Tempo de configuração:** ~10 minutos
**Próximo passo:** Configurar API Key e testar!
