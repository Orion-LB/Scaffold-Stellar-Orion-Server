#!/bin/bash

# Orion RWA Lending - Bot Startup Script
# This script starts all bots for the Orion platform

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
BOTS_DIR="$SCRIPT_DIR/bots"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Orion RWA Lending - Bot Orchestration System         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}[1/5]${NC} Checking prerequisites..."

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓${NC} Node.js version: ${NODE_VERSION}"

# Check for .env files
echo ""
echo -e "${YELLOW}[2/5]${NC} Checking environment configuration..."

MISSING_ENV=0

if [ ! -f "$BOTS_DIR/oracle-price-bot/.env" ]; then
    echo -e "${RED}❌ Missing: bots/oracle-price-bot/.env${NC}"
    echo -e "   ${YELLOW}→${NC} Copy from bots/oracle-price-bot/.env.example and configure"
    MISSING_ENV=1
fi

if [ ! -f "$BOTS_DIR/auto-repay-bot/.env" ]; then
    echo -e "${RED}❌ Missing: bots/auto-repay-bot/.env${NC}"
    echo -e "   ${YELLOW}→${NC} Create with required environment variables"
    MISSING_ENV=1
fi

if [ ! -f "$BOTS_DIR/liquidation-bot/.env" ]; then
    echo -e "${RED}❌ Missing: bots/liquidation-bot/.env${NC}"
    echo -e "   ${YELLOW}→${NC} Create with required environment variables"
    MISSING_ENV=1
fi

if [ ! -f "$BOTS_DIR/orchestrator/.env" ]; then
    echo -e "${RED}❌ Missing: bots/orchestrator/.env${NC}"
    echo -e "   ${YELLOW}→${NC} Create with required environment variables"
    MISSING_ENV=1
fi

if [ $MISSING_ENV -eq 1 ]; then
    echo ""
    echo -e "${RED}Please create missing .env files before starting bots${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} All .env files found"

# Install dependencies
echo ""
echo -e "${YELLOW}[3/5]${NC} Installing/checking dependencies..."

install_dependencies() {
    local BOT_DIR=$1
    local BOT_NAME=$2

    if [ ! -d "$BOT_DIR/node_modules" ]; then
        echo -e "${YELLOW}  → Installing dependencies for ${BOT_NAME}...${NC}"
        cd "$BOT_DIR"
        npm install --silent > /dev/null 2>&1
        cd "$SCRIPT_DIR"
        echo -e "${GREEN}  ✓ ${BOT_NAME} dependencies installed${NC}"
    else
        echo -e "${GREEN}  ✓ ${BOT_NAME} dependencies already installed${NC}"
    fi
}

install_dependencies "$BOTS_DIR/shared" "shared"
install_dependencies "$BOTS_DIR/oracle-price-bot" "oracle-price-bot"
install_dependencies "$BOTS_DIR/auto-repay-bot" "auto-repay-bot"
install_dependencies "$BOTS_DIR/liquidation-bot" "liquidation-bot"
install_dependencies "$BOTS_DIR/orchestrator" "orchestrator"

# Build TypeScript
echo ""
echo -e "${YELLOW}[4/5]${NC} Building TypeScript projects..."

build_bot() {
    local BOT_DIR=$1
    local BOT_NAME=$2

    echo -e "${YELLOW}  → Building ${BOT_NAME}...${NC}"
    cd "$BOT_DIR"
    if [ "$BOT_NAME" == "orchestrator" ]; then
        npm run build
    else
        npm run build > /dev/null 2>&1
    fi
    cd "$SCRIPT_DIR"
    echo -e "${GREEN}  ✓ ${BOT_NAME} built successfully${NC}"
}

build_bot "$BOTS_DIR/oracle-price-bot" "oracle-price-bot"
build_bot "$BOTS_DIR/auto-repay-bot" "auto-repay-bot"
build_bot "$BOTS_DIR/liquidation-bot" "liquidation-bot"
build_bot "$BOTS_DIR/orchestrator" "orchestrator"

# Create logs directory
mkdir -p "$SCRIPT_DIR/logs"

# Start bots
echo ""
echo -e "${YELLOW}[5/5]${NC} Starting bots..."
echo ""

# Function to start a bot in the background
start_bot() {
    local BOT_DIR=$1
    local BOT_NAME=$2
    local PORT=$3
    local LOG_FILE="$SCRIPT_DIR/logs/${BOT_NAME}.log"

    echo -e "${PURPLE}  → Starting ${BOT_NAME}...${NC}"
    cd "$BOT_DIR"
    nohup npm start > "$LOG_FILE" 2>&1 &
    local PID=$!
    echo $PID > "$SCRIPT_DIR/logs/${BOT_NAME}.pid"
    cd "$SCRIPT_DIR"

    # Wait a moment for the bot to start
    sleep 2

    # Check if still running
    if ps -p $PID > /dev/null; then
        echo -e "${GREEN}  ✓ ${BOT_NAME} started${NC} (PID: $PID, Port: $PORT)"
        echo -e "    ${BLUE}→${NC} Log: logs/${BOT_NAME}.log"
    else
        echo -e "${RED}  ✗ ${BOT_NAME} failed to start${NC}"
        echo -e "    ${BLUE}→${NC} Check logs/${BOT_NAME}.log for details"
    fi
}

# Start individual bots
start_bot "$BOTS_DIR/oracle-price-bot" "oracle-price-bot" "3000"
start_bot "$BOTS_DIR/auto-repay-bot" "auto-repay-bot" "3001"
start_bot "$BOTS_DIR/liquidation-bot" "liquidation-bot" "3002"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  All bots started successfully!                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Bot Endpoints:${NC}"
echo -e "  • Oracle Price Bot:   ${BLUE}http://localhost:3000${NC}"
echo -e "  • Auto-Repay Bot:     ${BLUE}http://localhost:3001${NC}"
echo -e "  • Liquidation Bot:    ${BLUE}http://localhost:3002${NC}"
echo ""
echo -e "${BLUE}Management:${NC}"
echo -e "  • View logs:          ${YELLOW}tail -f logs/<bot-name>.log${NC}"
echo -e "  • Stop all bots:      ${YELLOW}./stop-bots.sh${NC}"
echo -e "  • Check status:       ${YELLOW}./status-bots.sh${NC}"
echo ""
echo -e "${BLUE}Health Check:${NC}"
echo -e "  ${YELLOW}curl http://localhost:3000/health${NC}  # Oracle Bot"
echo -e "  ${YELLOW}curl http://localhost:3001/health${NC}  # Auto-Repay Bot"
echo -e "  ${YELLOW}curl http://localhost:3002/health${NC}  # Liquidation Bot"
echo ""
