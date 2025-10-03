# 🚀 Guia de Deploy no Render.com - FRAMETY

Este guia explica como fazer o deploy da aplicação FRAMETY no Render.com.

## 📋 Pré-requisitos

1. Conta no [Render.com](https://render.com) (gratuita)
2. Código do projeto no GitHub, GitLab ou Bitbucket
3. Variáveis de ambiente configuradas

---

## 🎯 Método 1: Deploy Automático com render.yaml (RECOMENDADO)

O arquivo `render.yaml` já está configurado na raiz do projeto!

### Passos:

1. **Faça commit e push para o GitHub**
   ```bash
   git add .
   git commit -m "Preparar para deploy no Render"
   git push origin main
   ```

2. **Acesse o Render Dashboard**
   - Entre em [dashboard.render.com](https://dashboard.render.com)
   - Clique em **"New +"** → **"Blueprint"**

3. **Conecte seu repositório**
   - Selecione o repositório do GitHub
   - Render vai detectar o arquivo `render.yaml` automaticamente

4. **Confirme e Deploy**
   - Render criará automaticamente:
     - ✅ PostgreSQL Database (framety-db)
     - ✅ Web Service (framety-app)
   - Aguarde o build completar (3-5 minutos)

5. **Acesse sua aplicação**
   - URL: `https://framety-app.onrender.com` (ou o nome que você escolheu)

---

## 🎯 Método 2: Deploy Manual

Se preferir fazer manualmente:

### Passo 1: Criar o Banco de Dados PostgreSQL

1. No Render Dashboard, clique em **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name:** `framety-db`
   - **Database:** `framety`
   - **Region:** Escolha o mais próximo
   - **Plan:** Free
3. Clique em **"Create Database"**
4. **Copie a "Internal Database URL"** (você vai precisar)

### Passo 2: Criar o Web Service

1. Clique em **"New +"** → **"Web Service"**
2. Conecte seu repositório do GitHub
3. Configure:
   - **Name:** `framety-app`
   - **Region:** Mesmo da database
   - **Branch:** `main` ou `master`
   - **Root Directory:** (deixe em branco)
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free

4. **Adicione as Variáveis de Ambiente:**
   Clique em **"Advanced"** → **"Add Environment Variable"**

   ```
   NODE_ENV = production
   DATABASE_URL = [Cole a Internal Database URL do Passo 1]
   SESSION_SECRET = [Gere uma string aleatória segura, ex: use um gerador de senha]
   ```

5. Clique em **"Create Web Service"**

6. Aguarde o build completar (primeira vez leva 3-5 minutos)

---

## ⚙️ Configurações Importantes

### Variáveis de Ambiente Obrigatórias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | URL de conexão do PostgreSQL | `postgresql://user:pass@host/db` |
| `SESSION_SECRET` | Chave secreta para sessões | String aleatória segura |
| `NODE_ENV` | Ambiente de execução | `production` |

### Health Check

A aplicação tem um endpoint de health check em `/api/user` que o Render usa para verificar se está rodando corretamente.

---

## 🔧 Após o Deploy

### 1. Executar Migrações do Banco de Dados

Se precisar rodar migrações manualmente:

1. Acesse o **Shell** do seu Web Service no Render
2. Execute:
   ```bash
   npm run db:push
   ```

### 2. Criar Primeiro Usuário Admin

Você pode criar o primeiro usuário diretamente pelo frontend acessando:
- `https://seu-app.onrender.com/auth`

Ou pelo banco de dados usando o PostgreSQL client no Render.

---

## 🐛 Solução de Problemas

### ❌ Erro: "DATABASE_URL must be set"

**Solução:** Verifique se a variável `DATABASE_URL` está configurada nas Environment Variables do Web Service.

### ❌ Erro: "Build failed" ou "Module not found"

**Solução:** 
- Certifique-se que o arquivo `.node-version` existe (deve ter o valor `20`)
- Verifique se o `package.json` tem todas as dependências

### ❌ Aplicação fica "offline" após 15 minutos

**Causa:** Plano gratuito do Render coloca serviços inativos em "sleep" após 15 minutos de inatividade.

**Solução:** 
- Primeira requisição após sleep leva ~30-60 segundos para "acordar"
- Para evitar: Upgrade para plano pago ($7/mês) ou use um serviço de ping (UptimeRobot)

### ❌ Erro de CORS

**Solução:** A aplicação já está configurada para aceitar requisições em produção. Se tiver problemas, verifique as configurações de cookies e sessão.

---

## 💰 Custos

- **PostgreSQL Free Plan:**
  - 256 MB de armazenamento
  - Grátis por 90 dias, depois $7/mês
  - Ideal para desenvolvimento e pequenos projetos

- **Web Service Free Plan:**
  - 512 MB RAM
  - Vai para "sleep" após 15 min de inatividade
  - 750 horas grátis por mês
  - Suficiente para testes e demonstrações

---

## 🔄 Auto-Deploy

Por padrão, o Render faz deploy automático quando você faz push para a branch principal:

```bash
git add .
git commit -m "Atualização da aplicação"
git push origin main
```

O Render detecta o push e faz o redeploy automaticamente!

---

## 📚 Recursos Adicionais

- [Documentação Render - Node.js](https://render.com/docs/deploy-node-express-app)
- [Render - PostgreSQL](https://render.com/docs/databases)
- [Render - Blueprints](https://render.com/docs/infrastructure-as-code)

---

## ✅ Checklist de Deploy

- [ ] Código commitado e no GitHub
- [ ] Arquivo `render.yaml` na raiz do projeto
- [ ] Arquivo `.node-version` na raiz
- [ ] Variáveis de ambiente configuradas
- [ ] Database criada no Render
- [ ] Web Service criado e rodando
- [ ] Testado em produção (acesso pelo URL do Render)
- [ ] Primeiro usuário admin criado

---

**Pronto! Sua aplicação FRAMETY está no ar! 🎉**

URL do seu app: `https://framety-app.onrender.com`
