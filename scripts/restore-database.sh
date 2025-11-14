#!/bin/bash

# Script de Restauração de Backup do Banco de Dados
#
# Uso:
#   ./scripts/restore-database.sh [arquivo_backup.dump]
#
# Exemplos:
#   ./scripts/restore-database.sh                           # Lista backups disponíveis
#   ./scripts/restore-database.sh backups/framety_backup_20250114_140000.dump

set -e

DB_NAME="framety_local"
BACKUP_DIR="backups"

# Detectar ferramentas PostgreSQL (Mac Homebrew PostgreSQL 16 ou padrão do sistema)
if [ -d "/opt/homebrew/opt/postgresql@16/bin" ]; then
    PG_DUMP="/opt/homebrew/opt/postgresql@16/bin/pg_dump"
    PG_RESTORE="/opt/homebrew/opt/postgresql@16/bin/pg_restore"
    PSQL="/opt/homebrew/opt/postgresql@16/bin/psql"
    DROPDB="/opt/homebrew/opt/postgresql@16/bin/dropdb"
    CREATEDB="/opt/homebrew/opt/postgresql@16/bin/createdb"
else
    PG_DUMP="pg_dump"
    PG_RESTORE="pg_restore"
    PSQL="psql"
    DROPDB="dropdb"
    CREATEDB="createdb"
fi

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}=== Restauração do Banco de Dados FRAMETY ===${NC}"
echo ""

# Se não passar arquivo, listar backups disponíveis
if [ -z "$1" ]; then
    echo -e "${YELLOW}Backups disponíveis em $BACKUP_DIR/:${NC}"
    echo ""

    if [ -d "$BACKUP_DIR" ] && [ "$(ls -A $BACKUP_DIR/framety_backup_*.dump 2>/dev/null)" ]; then
        ls -lht "$BACKUP_DIR"/framety_backup_*.dump | awk '{print "  " $9 " (" $5 ") - " $6 " " $7 " " $8}'
        echo ""
        echo -e "${YELLOW}Para restaurar, execute:${NC}"
        echo "  ./scripts/restore-database.sh backups/[nome_do_arquivo].dump"
    else
        echo -e "${RED}  Nenhum backup encontrado!${NC}"
    fi

    exit 0
fi

BACKUP_FILE="$1"

# Verificar se arquivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}✗ Arquivo não encontrado: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}Arquivo de backup: $BACKUP_FILE${NC}"
echo -e "${RED}ATENÇÃO: Esta operação irá SOBRESCREVER todos os dados atuais!${NC}"
echo ""
read -p "Tem certeza que deseja continuar? (digite 'SIM' para confirmar): " CONFIRM

if [ "$CONFIRM" != "SIM" ]; then
    echo -e "${YELLOW}Operação cancelada.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Fazendo backup de segurança antes de restaurar...${NC}"
SAFETY_BACKUP="backups/framety_before_restore_$(date +"%Y%m%d_%H%M%S").dump"
$PG_DUMP -d "$DB_NAME" -F c -f "$SAFETY_BACKUP" 2>/dev/null || true
echo -e "${GREEN}✓ Backup de segurança criado: $SAFETY_BACKUP${NC}"
echo ""

echo -e "${YELLOW}Removendo conexões ativas...${NC}"
$PSQL -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" 2>/dev/null || true

echo -e "${YELLOW}Recriando banco de dados...${NC}"
$DROPDB "$DB_NAME" 2>/dev/null || true
$CREATEDB "$DB_NAME"

echo -e "${YELLOW}Restaurando backup...${NC}"
$PG_RESTORE -d "$DB_NAME" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Banco de dados restaurado com sucesso!${NC}"
    echo -e "${GREEN}✓ Backup de segurança mantido em: $SAFETY_BACKUP${NC}"
else
    echo ""
    echo -e "${RED}✗ Erro ao restaurar banco de dados!${NC}"
    echo -e "${YELLOW}Para reverter, execute:${NC}"
    echo "  ./scripts/restore-database.sh $SAFETY_BACKUP"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Restauração concluída! ===${NC}"
