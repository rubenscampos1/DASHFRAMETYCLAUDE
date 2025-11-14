# 📜 Scripts do FRAMETY

Scripts de gerenciamento do servidor e banco de dados.

## 🗂️ Scripts Disponíveis

### Para o PC Host (Servidor)

| Script | Descrição |
|--------|-----------|
| `start-host-server.sh` | Inicia servidor + auto-pull Git |
| `stop-host-server.sh` | Para servidor e auto-pull |
| `auto-pull.sh` | Monitora Git e faz pull automático (roda em background) |

### Backup e Restauração

| Script | Descrição |
|--------|-----------|
| `backup-database.sh` | Cria backup do PostgreSQL |
| `restore-database.sh` | Restaura backup do banco |

### Utilitários Existentes

| Script | Descrição |
|--------|-----------|
| `fix-admin-password.ts` | Corrige senha do admin |
| `migrate-password-format.ts` | Migra formato de senhas |
| `setup-render-db.ts` | Setup do banco no Render |

---

## 🚀 Uso Rápido

### Iniciar Servidor (PC Host)

```bash
# Primeira vez (ou depois de git pull manual):
chmod +x scripts/*.sh

# Iniciar tudo:
./scripts/start-host-server.sh

# Parar tudo:
./scripts/stop-host-server.sh
```

### Backup do Banco

```bash
# Criar backup
./scripts/backup-database.sh

# Backups são salvos em: backups/framety_backup_YYYYMMDD_HHMMSS.dump
# Mantém automaticamente apenas os últimos 7 backups
```

### Restaurar Banco

```bash
# Listar backups disponíveis
./scripts/restore-database.sh

# Restaurar backup específico
./scripts/restore-database.sh backups/framety_backup_20250114_120000.dump
```

---

## 📖 Documentação Completa

Consulte o arquivo [SETUP_HOST.md](../SETUP_HOST.md) na raiz do projeto para:
- Guia completo de setup do PC host
- Estratégia de sincronização
- Troubleshooting
- Backup automático (cron/task scheduler)

---

## 🔧 Detalhes Técnicos

### start-host-server.sh

- Verifica dependências (PostgreSQL, banco, .env)
- Faz pull inicial do Git
- Inicia servidor Node.js em background
- Inicia auto-pull Git em background
- Cria logs em `logs/server.log` e `logs/auto-pull.log`

### auto-pull.sh

- Roda em loop infinito
- Verifica repositório a cada 30 segundos
- Faz pull automaticamente quando há mudanças
- Detecta mudanças em `package.json` e roda `npm install`
- Faz stash de mudanças locais se necessário

### backup-database.sh

- Usa `pg_dump` em formato custom (`.dump`)
- Salva em `backups/framety_backup_[timestamp].dump`
- Mantém apenas últimos 7 backups (economiza espaço)
- Mostra tamanho do backup criado

### restore-database.sh

- Lista backups disponíveis se não passar arquivo
- Pede confirmação antes de sobrescrever
- Cria backup de segurança antes de restaurar
- Usa `pg_restore` para restaurar dados
