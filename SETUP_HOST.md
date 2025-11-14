# 🖥️ Setup do PC Host - FRAMETY

Guia completo para configurar outro PC na mesma rede como servidor de desenvolvimento do FRAMETY.

## 📋 Estratégia

- **PC Host**: Servidor com dados importantes, acesso compartilhado
- **Seu Mac**: Desenvolvimento e testes com banco local independente
- **Sincronização**: Via Git push/pull automático (código apenas)
- **Bancos**: Independentes - cada PC tem seu próprio PostgreSQL

---

## 🎯 Pré-requisitos do PC Host

Instalar no PC que será o servidor:

### 1. Node.js 18+
- Windows: https://nodejs.org/en/download/
- Linux: `sudo apt install nodejs npm` ou `sudo yum install nodejs npm`
- Mac: `brew install node`

### 2. PostgreSQL
- Windows: https://www.postgresql.org/download/windows/
- Linux: `sudo apt install postgresql postgresql-contrib`
- Mac: `brew install postgresql@16`

### 3. Git
- Windows: https://git-scm.com/download/win
- Linux: `sudo apt install git`
- Mac: `brew install git`

---

## 🚀 Setup Inicial (Fazer Uma Vez)

### No Seu Mac (Preparar Backup)

```bash
# 1. Criar backup do banco de dados
cd "/Volumes/SSD PRETO/DASHBOARD CLAUDE"
chmod +x scripts/*.sh
./scripts/backup-database.sh

# O backup será criado em: backups/framety_backup_YYYYMMDD_HHMMSS.dump
```

### Transferir Backup para o PC Host

Copie o arquivo `.dump` via:
- Pendrive
- Rede local (compartilhamento de pasta)
- Cloud (Google Drive, Dropbox, etc.)

---

### No PC Host (Setup Completo)

#### 1. Clonar Repositório

```bash
# Clonar o projeto
git clone [URL-DO-SEU-REPOSITÓRIO-GIT]
cd DASHBOARD\ CLAUDE

# Instalar dependências
npm install
```

#### 2. Configurar Variáveis de Ambiente

Criar arquivo `.env` na raiz do projeto:

```bash
DATABASE_URL=postgresql://localhost:5432/framety_local
SESSION_SECRET=production-secret-key-change-this-123456
NODE_ENV=development
PORT=3000
```

**⚠️ IMPORTANTE**: Altere `SESSION_SECRET` para um valor único e seguro!

#### 3. Configurar PostgreSQL

**Windows:**
```cmd
# Verificar se PostgreSQL está rodando
sc query postgresql-x64-14

# Se não estiver, iniciar:
sc start postgresql-x64-14
```

**Linux:**
```bash
# Iniciar PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Iniciar automaticamente no boot
```

**Mac:**
```bash
brew services start postgresql@16
```

#### 4. Restaurar Banco de Dados

```bash
# Dar permissão de execução nos scripts
chmod +x scripts/*.sh

# Copiar o arquivo .dump para a pasta backups/
mkdir -p backups
# (Cole o arquivo .dump do seu Mac aqui)

# Restaurar banco
./scripts/restore-database.sh backups/framety_backup_YYYYMMDD_HHMMSS.dump

# Responder "SIM" quando perguntar se deseja continuar
```

#### 5. Iniciar Servidor + Auto-Pull

```bash
# Iniciar tudo de uma vez
./scripts/start-host-server.sh
```

O script vai:
- ✅ Verificar todas as dependências
- ✅ Fazer pull do código mais recente
- ✅ Iniciar servidor Node.js (auto-reload)
- ✅ Iniciar auto-pull Git (sincronização automática)
- ✅ Mostrar URLs de acesso

---

## 📱 URLs de Acesso

Após iniciar, o servidor estará disponível em:

```
Local:    http://localhost:3000
Rede:     http://[IP-DO-PC]:3000
```

O IP será mostrado no output do script. Compartilhe com a equipe!

---

## 🔄 Fluxo de Trabalho Diário

### No Seu Mac (Desenvolvimento)

```bash
# 1. Editar código normalmente
# 2. Quando terminar:
git add .
git commit -m "descrição das alterações"
git push

# Pronto! O PC Host receberá as alterações automaticamente
```

### No PC Host (Automático)

O script `auto-pull.sh` está rodando em background e:
- Verifica o repositório a cada 30 segundos
- Faz `git pull` automaticamente quando há mudanças
- Atualiza dependências se `package.json` mudar
- O `tsx` recarrega o servidor automaticamente

**Você não precisa fazer nada no PC Host!**

---

## 🛠️ Comandos Úteis

### Gerenciar Servidor

```bash
# Iniciar servidor (se não estiver rodando)
./scripts/start-host-server.sh

# Parar servidor
./scripts/stop-host-server.sh

# Ver logs em tempo real
tail -f logs/server.log      # Servidor Node.js
tail -f logs/auto-pull.log   # Sincronização Git
```

### Backup Manual

```bash
# Criar backup do banco atual
./scripts/backup-database.sh

# Listar backups disponíveis
./scripts/restore-database.sh

# Restaurar backup específico
./scripts/restore-database.sh backups/framety_backup_YYYYMMDD_HHMMSS.dump
```

### Verificar Status

```bash
# Ver processos rodando
ps aux | grep tsx
ps aux | grep auto-pull

# Ver última atividade do Git
git log --oneline -5

# Testar acesso ao banco
psql -U postgres -d framety_local -c "SELECT COUNT(*) FROM projects;"
```

---

## 💾 Backup Automático (Opcional)

Para fazer backup automático todo dia às 2h da manhã:

### Linux/Mac (crontab)

```bash
# Editar crontab
crontab -e

# Adicionar linha (ajuste o caminho):
0 2 * * * cd /caminho/completo/DASHBOARD\ CLAUDE && ./scripts/backup-database.sh >> logs/backup.log 2>&1
```

### Windows (Task Scheduler)

1. Abrir "Agendador de Tarefas"
2. Criar Tarefa Básica
3. Nome: "FRAMETY Backup Diário"
4. Gatilho: Diariamente às 2:00
5. Ação: Iniciar programa
   - Programa: `C:\Program Files\Git\bin\bash.exe`
   - Argumentos: `-c "cd /c/caminho/DASHBOARD\ CLAUDE && ./scripts/backup-database.sh"`

---

## 🔥 Troubleshooting

### Servidor não inicia

```bash
# Verificar se porta 3000 está em uso
lsof -ti:3000        # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Matar processo na porta
kill $(lsof -ti:3000)         # Mac/Linux
taskkill /F /PID [PID]        # Windows
```

### Auto-pull não funciona

```bash
# Verificar se está rodando
ps aux | grep auto-pull

# Reiniciar
./scripts/stop-host-server.sh
./scripts/start-host-server.sh

# Ver logs
tail -f logs/auto-pull.log
```

### Erro de permissão nos scripts

```bash
# Dar permissão de execução
chmod +x scripts/*.sh
```

### Banco de dados não conecta

```bash
# Verificar se PostgreSQL está rodando
pg_isready

# Se não estiver:
# Linux: sudo systemctl start postgresql
# Mac: brew services start postgresql@16
# Windows: sc start postgresql-x64-14
```

### Git não sincroniza

```bash
# Verificar status do Git
git status
git remote -v

# Verificar se tem mudanças locais não commitadas
git stash  # Guardar mudanças locais

# Forçar pull
git fetch origin main
git reset --hard origin/main
```

---

## 🔐 Segurança

### Dados Importantes no PC Host

O PC Host tem os dados de produção/staging. **Recomendações**:

1. **Backup Automático**: Configure o cron/task scheduler
2. **Backups Externos**: Copie `.dump` para nuvem semanalmente
3. **Senha Forte**: Altere `SESSION_SECRET` no `.env`
4. **Firewall**: Configure firewall para permitir apenas rede local
5. **PostgreSQL**: Configure senha forte para usuário `postgres`

### PostgreSQL - Configurar Senha

```bash
# Entrar no PostgreSQL
psql -U postgres

# Alterar senha
ALTER USER postgres PASSWORD 'senha-forte-aqui';
\q

# Atualizar .env
DATABASE_URL=postgresql://postgres:senha-forte-aqui@localhost:5432/framety_local
```

---

## 📊 Arquitetura

```
┌─────────────────┐         Git Push         ┌─────────────────┐
│   Seu Mac       │ ───────────────────────> │   Repositório   │
│  (Desenvolvimento)                          │     GitHub      │
└─────────────────┘                           └─────────────────┘
        │                                              ↓
        │                                       Auto-Pull (30s)
        │                                              ↓
        │                                    ┌─────────────────┐
        │                                    │   PC Host       │
        └──────────── LAN Access ───────────│  (Servidor)     │
                                             └─────────────────┘
                                                      ↓
                                            ┌─────────────────┐
                                            │  Outros PCs     │
                                            │  na Rede        │
                                            └─────────────────┘

Bancos de Dados: Independentes
- Mac: framety_local (testes)
- PC Host: framety_local (dados importantes + backups automáticos)
```

---

## ✅ Checklist de Setup

- [ ] Node.js instalado
- [ ] PostgreSQL instalado e rodando
- [ ] Git instalado e configurado
- [ ] Repositório clonado
- [ ] Dependências instaladas (`npm install`)
- [ ] Arquivo `.env` criado e configurado
- [ ] Banco de dados restaurado
- [ ] Scripts com permissão de execução (`chmod +x`)
- [ ] Servidor iniciado (`./scripts/start-host-server.sh`)
- [ ] URLs de acesso funcionando
- [ ] Auto-pull sincronizando
- [ ] Backup automático configurado (opcional)

---

## 📞 Suporte

Se tiver problemas:

1. Verifique os logs: `tail -f logs/server.log`
2. Verifique o troubleshooting acima
3. Reinicie tudo: `./scripts/stop-host-server.sh && ./scripts/start-host-server.sh`

---

**Data de criação**: 2025-01-14
**Versão**: 1.0
