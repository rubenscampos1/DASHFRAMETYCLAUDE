#!/bin/bash

# Script para Parar o Servidor HOST
# Para o servidor Node.js e o Auto-pull Git
#
# Uso:
#   ./scripts/stop-host-server.sh

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Parando servidor FRAMETY...${NC}"
echo ""

# Parar servidor Node.js
if pgrep -f "tsx.*server/index.ts" > /dev/null; then
    echo -e "${YELLOW}Parando servidor Node.js...${NC}"
    pkill -f "tsx.*server/index.ts"
    echo -e "${GREEN}✓ Servidor parado${NC}"
else
    echo -e "${YELLOW}Servidor não está rodando${NC}"
fi

# Parar auto-pull
if pgrep -f "auto-pull.sh" > /dev/null; then
    echo -e "${YELLOW}Parando auto-pull...${NC}"
    pkill -f "auto-pull.sh"
    echo -e "${GREEN}✓ Auto-pull parado${NC}"
else
    echo -e "${YELLOW}Auto-pull não está rodando${NC}"
fi

echo ""
echo -e "${GREEN}✓ Todos os processos foram parados${NC}"
