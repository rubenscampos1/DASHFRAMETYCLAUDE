#!/bin/bash

# Script de Backup Automático do Banco de Dados PostgreSQL
# Para ser usado no PC HOST (dados importantes)
#
# Uso:
#   ./scripts/backup-database.sh
#
# Para automatizar (rodar todo dia às 2h da manhã):
#   crontab -e
#   Adicionar linha: 0 2 * * * /caminho/para/backup-database.sh

set -e

# Configurações
DB_NAME="framety_local"
BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/framety_backup_$TIMESTAMP.dump"

# Detectar pg_dump (Mac Homebrew PostgreSQL 16 ou padrão do sistema)
if [ -f "/opt/homebrew/opt/postgresql@16/bin/pg_dump" ]; then
    PG_DUMP="/opt/homebrew/opt/postgresql@16/bin/pg_dump"
elif command -v pg_dump &> /dev/null; then
    PG_DUMP="pg_dump"
else
    echo "Erro: pg_dump não encontrado!"
    exit 1
fi

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Backup do Banco de Dados FRAMETY ===${NC}"
echo "Data/Hora: $(date)"
echo ""

# Criar diretório de backups se não existir
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${YELLOW}Criando diretório de backups...${NC}"
    mkdir -p "$BACKUP_DIR"
fi

# Fazer backup
echo -e "${YELLOW}Iniciando backup...${NC}"
$PG_DUMP -d "$DB_NAME" -F c -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    # Calcular tamanho do arquivo
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

    echo -e "${GREEN}✓ Backup criado com sucesso!${NC}"
    echo "  Arquivo: $BACKUP_FILE"
    echo "  Tamanho: $SIZE"
    echo ""

    # Manter apenas os últimos 7 backups (1 semana)
    echo -e "${YELLOW}Limpando backups antigos (mantendo últimos 7)...${NC}"
    cd "$BACKUP_DIR"
    ls -t framety_backup_*.dump | tail -n +8 | xargs -r rm

    BACKUP_COUNT=$(ls -1 framety_backup_*.dump 2>/dev/null | wc -l)
    echo -e "${GREEN}✓ Total de backups mantidos: $BACKUP_COUNT${NC}"
    echo ""

    # Listar backups disponíveis
    echo -e "${YELLOW}Backups disponíveis:${NC}"
    ls -lht framety_backup_*.dump | head -n 7

else
    echo -e "${RED}✗ Erro ao criar backup!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Backup concluído com sucesso! ===${NC}"
