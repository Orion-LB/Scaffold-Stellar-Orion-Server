#!/bin/bash

# Orion RWA Lending - Bot Stop Script
# This script stops all running bots

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="$SCRIPT_DIR/logs"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Orion RWA Lending - Stopping Bots                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to stop a bot
stop_bot() {
    local BOT_NAME=$1
    local PID_FILE="$LOGS_DIR/${BOT_NAME}.pid"

    if [ -f "$PID_FILE" ]; then
        local PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "${YELLOW}  → Stopping ${BOT_NAME}...${NC}"
            kill $PID
            sleep 1

            # Force kill if still running
            if ps -p $PID > /dev/null 2>&1; then
                echo -e "${YELLOW}    Force stopping...${NC}"
                kill -9 $PID
            fi

            rm "$PID_FILE"
            echo -e "${GREEN}  ✓ ${BOT_NAME} stopped${NC}"
        else
            echo -e "${YELLOW}  ⚠ ${BOT_NAME} not running (stale PID file)${NC}"
            rm "$PID_FILE"
        fi
    else
        echo -e "${YELLOW}  ⚠ ${BOT_NAME} PID file not found${NC}"
    fi
}

# Stop all bots
stop_bot "oracle-price-bot"
stop_bot "auto-repay-bot"
stop_bot "liquidation-bot"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  All bots stopped                                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
