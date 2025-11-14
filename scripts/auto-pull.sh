#!/bin/bash

# Script de Auto-Pull do Git
# Monitora o repositório remoto e faz pull automaticamente quando há alterações
#
# PARA O PC HOST (servidor)
#
# Uso:
#   ./scripts/auto-pull.sh
#
# O script roda em loop infinito, verificando a cada 30 segundos
# Para parar: Ctrl+C
#
# Para rodar em background:
#   nohup ./scripts/auto-pull.sh > auto-pull.log 2>&1 &

set -e

# Configurações
CHECK_INTERVAL=30  # Segundos entre cada verificação
BRANCH=$(git branch --show-current)

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Auto-Pull Git FRAMETY ===${NC}"
echo "Branch: $BRANCH"
echo "Intervalo de verificação: ${CHECK_INTERVAL}s"
echo ""
echo -e "${YELLOW}Monitorando repositório... (Ctrl+C para parar)${NC}"
echo ""

# Fazer fetch inicial para garantir que está atualizado
git fetch origin "$BRANCH" 2>/dev/null

while true; do
    # Obter timestamp para o log
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

    # Fazer fetch silencioso
    git fetch origin "$BRANCH" 2>/dev/null

    # Verificar se há atualizações
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/"$BRANCH")

    if [ "$LOCAL" != "$REMOTE" ]; then
        echo -e "${YELLOW}[$TIMESTAMP] Nova atualização detectada!${NC}"

        # Verificar se há modificações locais
        if [[ -n $(git status -s) ]]; then
            echo -e "${RED}✗ Há modificações locais não commitadas!${NC}"
            echo -e "${YELLOW}  Fazendo stash das alterações locais...${NC}"
            git stash save "Auto-stash antes de pull em $TIMESTAMP"
        fi

        # Fazer pull
        echo -e "${YELLOW}  Fazendo pull...${NC}"
        if git pull origin "$BRANCH"; then
            echo -e "${GREEN}✓ Código atualizado com sucesso!${NC}"

            # Verificar se package.json foi alterado
            if git diff HEAD@{1} --name-only | grep -q "package.json"; then
                echo -e "${YELLOW}  package.json alterado, rodando npm install...${NC}"
                npm install
                echo -e "${GREEN}✓ Dependências atualizadas!${NC}"
            fi

            # tsx automaticamente detecta as mudanças e recarrega o servidor
            echo -e "${GREEN}✓ Servidor será recarregado automaticamente pelo tsx${NC}"
        else
            echo -e "${RED}✗ Erro ao fazer pull!${NC}"
        fi

        echo ""
    else
        # Apenas log silencioso (pode comentar essa linha se quiser menos output)
        echo -ne "${BLUE}[$TIMESTAMP] Verificando... ${NC}\r"
    fi

    # Aguardar antes da próxima verificação
    sleep $CHECK_INTERVAL
done
