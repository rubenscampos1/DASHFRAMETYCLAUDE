#!/bin/bash

# Script para Iniciar o Servidor HOST
# Roda o servidor Node.js + Auto-pull Git simultaneamente
#
# PARA O PC HOST (servidor de produção/staging)
#
# Uso:
#   ./scripts/start-host-server.sh

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        FRAMETY - Servidor HOST + Auto-Pull            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se já está rodando
if pgrep -f "tsx.*server/index.ts" > /dev/null; then
    echo -e "${YELLOW}⚠ Servidor já está rodando!${NC}"
    echo ""
    read -p "Deseja reiniciar? (s/N): " RESTART
    if [ "$RESTART" != "s" ] && [ "$RESTART" != "S" ]; then
        echo -e "${YELLOW}Cancelado.${NC}"
        exit 0
    fi

    echo -e "${YELLOW}Parando processos antigos...${NC}"
    pkill -f "tsx.*server/index.ts" || true
    pkill -f "auto-pull.sh" || true
    sleep 2
fi

# Verificar .env
if [ ! -f ".env" ]; then
    echo -e "${RED}✗ Arquivo .env não encontrado!${NC}"
    echo ""
    echo "Crie o arquivo .env com:"
    echo "  DATABASE_URL=postgresql://localhost:5432/framety_local"
    echo "  SESSION_SECRET=sua-secret-key-aqui"
    echo "  NODE_ENV=development"
    echo "  PORT=3000"
    exit 1
fi

# Verificar se PostgreSQL está rodando
if ! pg_isready -q 2>/dev/null; then
    echo -e "${RED}✗ PostgreSQL não está rodando!${NC}"
    echo ""
    echo "Inicie o PostgreSQL primeiro:"
    echo "  Windows: Verificar serviço PostgreSQL"
    echo "  Linux: sudo systemctl start postgresql"
    echo "  Mac: brew services start postgresql@16"
    exit 1
fi

echo -e "${GREEN}✓ PostgreSQL está rodando${NC}"

# Verificar se banco existe
DB_NAME="framety_local"
if ! psql -U postgres -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${RED}✗ Banco de dados '$DB_NAME' não encontrado!${NC}"
    echo ""
    echo "Restaure um backup primeiro:"
    echo "  ./scripts/restore-database.sh backups/[arquivo].dump"
    exit 1
fi

echo -e "${GREEN}✓ Banco de dados encontrado${NC}"

# Fazer pull inicial
echo ""
echo -e "${YELLOW}Verificando atualizações...${NC}"
BRANCH=$(git branch --show-current)
git fetch origin "$BRANCH" 2>/dev/null || true

LOCAL=$(git rev-parse HEAD 2>/dev/null)
REMOTE=$(git rev-parse origin/"$BRANCH" 2>/dev/null)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo -e "${YELLOW}Nova atualização disponível, fazendo pull...${NC}"
    git pull origin "$BRANCH"
    npm install
    echo -e "${GREEN}✓ Código atualizado${NC}"
else
    echo -e "${GREEN}✓ Código já está atualizado${NC}"
fi

# Criar diretório de logs
mkdir -p logs

echo ""
echo -e "${BLUE}Iniciando servidor e auto-pull...${NC}"
echo ""

# Iniciar servidor em background
nohup npm run dev > logs/server.log 2>&1 &
SERVER_PID=$!
echo -e "${GREEN}✓ Servidor iniciado (PID: $SERVER_PID)${NC}"
echo -e "  Logs: tail -f logs/server.log"

sleep 2

# Iniciar auto-pull em background
nohup ./scripts/auto-pull.sh > logs/auto-pull.log 2>&1 &
AUTOPULL_PID=$!
echo -e "${GREEN}✓ Auto-pull iniciado (PID: $AUTOPULL_PID)${NC}"
echo -e "  Logs: tail -f logs/auto-pull.log"

# Aguardar servidor iniciar
echo ""
echo -e "${YELLOW}Aguardando servidor iniciar...${NC}"
sleep 3

# Verificar se processos estão rodando
if ! ps -p $SERVER_PID > /dev/null 2>&1; then
    echo -e "${RED}✗ Erro ao iniciar servidor!${NC}"
    echo -e "${YELLOW}Verifique os logs: cat logs/server.log${NC}"
    exit 1
fi

if ! ps -p $AUTOPULL_PID > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Auto-pull não iniciou, mas servidor está rodando${NC}"
fi

# Descobrir IP local
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -n 1 | awk '{print $2}')

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║             🚀 SERVIDOR RODANDO COM SUCESSO!           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Acesso Local:${NC}"
echo "  http://localhost:3000"
echo ""
echo -e "${BLUE}Acesso via Rede:${NC}"
echo "  http://$LOCAL_IP:3000"
echo ""
echo -e "${YELLOW}Recursos Ativos:${NC}"
echo "  ✓ Servidor Node.js (auto-reload)"
echo "  ✓ Auto-pull Git (verifica a cada 30s)"
echo "  ✓ Logs em tempo real"
echo ""
echo -e "${YELLOW}Monitorar logs:${NC}"
echo "  tail -f logs/server.log      # Logs do servidor"
echo "  tail -f logs/auto-pull.log   # Logs do auto-pull"
echo ""
echo -e "${YELLOW}Para parar o servidor:${NC}"
echo "  ./scripts/stop-host-server.sh"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
