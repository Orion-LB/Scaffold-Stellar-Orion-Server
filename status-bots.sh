#!/bin/bash

# Orion RWA Lending - Bot Status Script
# This script checks the status of all bots

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="$SCRIPT_DIR/logs"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Orion RWA Lending - Bot Status                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check bot status
check_bot_status() {
    local BOT_NAME=$1
    local PORT=$2
    local PID_FILE="$LOGS_DIR/${BOT_NAME}.pid"

    echo -e "${BLUE}${BOT_NAME}:${NC}"

    # Check if PID file exists
    if [ -f "$PID_FILE" ]; then
        local PID=$(cat "$PID_FILE")

        # Check if process is running
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "  Status:   ${GREEN}● Running${NC}"
            echo -e "  PID:      ${PID}"
            echo -e "  Port:     ${PORT}"

            # Check HTTP endpoint
            if command -v curl > /dev/null 2>&1; then
                local HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT}/health 2>/dev/null || echo "000")
                if [ "$HTTP_STATUS" = "200" ]; then
                    echo -e "  Health:   ${GREEN}✓ Healthy${NC}"
                else
                    echo -e "  Health:   ${YELLOW}⚠ Not responding (HTTP ${HTTP_STATUS})${NC}"
                fi
            fi

            # Show memory usage
            local MEM_USAGE=$(ps -o rss= -p $PID | awk '{print $1/1024}')
            echo -e "  Memory:   ${MEM_USAGE} MB"

            # Show uptime
            local START_TIME=$(ps -o lstart= -p $PID)
            echo -e "  Started:  ${START_TIME}"

        else
            echo -e "  Status:   ${RED}● Stopped${NC} (stale PID file)"
        fi
    else
        echo -e "  Status:   ${RED}● Stopped${NC}"
    fi

    # Show last log entries
    local LOG_FILE="$LOGS_DIR/${BOT_NAME}.log"
    if [ -f "$LOG_FILE" ]; then
        echo -e "  Log:      logs/${BOT_NAME}.log"
        echo -e "  ${PURPLE}Last 3 log lines:${NC}"
        tail -n 3 "$LOG_FILE" | sed 's/^/    /'
    fi

    echo ""
}

# Check all bots
check_bot_status "oracle-price-bot" "3000"
check_bot_status "auto-repay-bot" "3001"
check_bot_status "liquidation-bot" "3002"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Commands                                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Start bots:       ${YELLOW}./start-bots.sh${NC}"
echo -e "  Stop bots:        ${YELLOW}./stop-bots.sh${NC}"
echo -e "  View logs:        ${YELLOW}tail -f logs/<bot-name>.log${NC}"
echo -e "  Restart bot:      ${YELLOW}./stop-bots.sh && ./start-bots.sh${NC}"
echo ""
