# Bot Management Guide

This guide explains how to manage the Orion RWA Lending bots.

## Quick Start

### 1. Configure Environment Variables

Before starting bots, create `.env` files for each bot:

```bash
# Oracle Price Bot
cd bots/oracle-price-bot
cp .env.example .env
# Edit .env with your configuration
```

**Required Environment Variables:**

#### Oracle Price Bot (`bots/oracle-price-bot/.env`)

```env
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
BOT_SECRET_KEY=S...  # Your bot's secret key
ORACLE_CONTRACT_ID=CD5XYT6WXOB567JC3QZGJ7RWHWP4N3C4GJ5LX75WDWUGL7NPXFJJC6AZ
STRWA_TOKEN_ADDRESS=CCCTL6UHRPOODYKYOXAW6Y3NKOFPFKB7QIYRRYGEANM2KHYYYAT4PJUS
PORT=3000
```

#### Auto-Repay Bot (`bots/auto-repay-bot/.env`)

```env
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
BOT_SECRET_KEY=S...  # Your bot's secret key
VAULT_CONTRACT_ID=CB3I43AX6VBYTHLVGXK3TVM5RZXLTSHT5RIHOTK2BHORNQY3RF3QH2TT
LENDING_POOL_CONTRACT_ID=CBJM554JCHWRFG7QFBKMPAPOO4DBJPLKHSH2T7U4FRLCPDS36U44WT5Y
PORT=3001
```

#### Liquidation Bot (`bots/liquidation-bot/.env`)

```env
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
BOT_SECRET_KEY=S...  # Your bot's secret key
LENDING_POOL_CONTRACT_ID=CBJM554JCHWRFG7QFBKMPAPOO4DBJPLKHSH2T7U4FRLCPDS36U44WT5Y
ORACLE_CONTRACT_ID=CD5XYT6WXOB567JC3QZGJ7RWHWP4N3C4GJ5LX75WDWUGL7NPXFJJC6AZ
STRWA_TOKEN_ADDRESS=CCCTL6UHRPOODYKYOXAW6Y3NKOFPFKB7QIYRRYGEANM2KHYYYAT4PJUS
PORT=3002
```

### 2. Start All Bots

```bash
./start-bots.sh
```

This script will:

1. Check prerequisites (Node.js, npm)
2. Verify all `.env` files exist
3. Install dependencies if needed
4. Build TypeScript projects
5. Start all bots in the background

### 3. Check Bot Status

```bash
./status-bots.sh
```

This shows:

- Running status
- PID (Process ID)
- Memory usage
- Health check status
- Last log entries

### 4. Stop All Bots

```bash
./stop-bots.sh
```

This gracefully stops all running bots.

## Individual Bot Management

### Start a Single Bot

```bash
cd bots/oracle-price-bot
npm run build
npm start
```

### View Bot Logs

```bash
# Real-time log viewing
tail -f logs/oracle-price-bot.log
tail -f logs/auto-repay-bot.log
tail -f logs/liquidation-bot.log

# View last 100 lines
tail -n 100 logs/oracle-price-bot.log
```

### Development Mode (with hot reload)

```bash
cd bots/oracle-price-bot
npm run dev
```

## Bot Endpoints

Each bot exposes an HTTP API:

### Oracle Price Bot (Port 3000)

```bash
# Health check
curl http://localhost:3000/health

# Get current metrics
curl http://localhost:3000/metrics

# Get last update
curl http://localhost:3000/last-update
```

### Auto-Repay Bot (Port 3001)

```bash
# Health check
curl http://localhost:3001/health

# Get metrics
curl http://localhost:3001/metrics

# Get repayment history
curl http://localhost:3001/repayments
```

### Liquidation Bot (Port 3002)

```bash
# Health check
curl http://localhost:3002/health

# Get metrics
curl http://localhost:3002/metrics

# Get liquidation history
curl http://localhost:3002/liquidations
```

## Bot Architecture

### 1. Oracle Price Bot

**Purpose:** Fetches real-world asset prices and submits them to the oracle contract

**Key Functions:**

- Fetches stRWA token prices from external APIs
- Validates price data
- Submits prices to oracle contract every 60 seconds
- Handles API failures with fallback mechanisms

**Configuration:**

- Update interval: 60 seconds (configurable)
- API sources: Franklin Templeton, Ondo Finance, fallback prices

### 2. Auto-Repay Bot

**Purpose:** Automatically repays loans using yield generated from staked RWA tokens

**Key Functions:**

- Monitors vault for yield funding events
- Tracks borrower yield balances
- Automatically repays loans when yield is available
- Prevents missed payments

**Configuration:**

- Check interval: 300 seconds (5 minutes)
- Minimum repayment: 1 USDC

### 3. Liquidation Bot

**Purpose:** Monitors loan health and liquidates under-collateralized positions

**Key Functions:**

- Monitors all active loans
- Calculates health factors based on current prices
- Issues warnings when health factor drops
- Liquidates positions below 110% collateralization

**Configuration:**

- Check interval: 300 seconds (5 minutes)
- Warning thresholds: 150%, 120%, 110%
- Liquidation threshold: 110%

## Troubleshooting

### Bot Won't Start

**Check prerequisites:**

```bash
node -v  # Should be v18+
npm -v   # Should be v9+
```

**Check .env files:**

```bash
ls -la bots/*/. env
```

**Check logs:**

```bash
cat logs/oracle-price-bot.log
```

### Bot Crashes Frequently

**Check memory usage:**

```bash
./status-bots.sh
```

**Check for errors in logs:**

```bash
grep -i error logs/*.log
```

**Restart bot:**

```bash
./stop-bots.sh
./start-bots.sh
```

### HTTP Endpoints Not Responding

**Check if bot is running:**

```bash
./status-bots.sh
```

**Check port availability:**

```bash
lsof -i :3000  # Oracle bot
lsof -i :3001  # Auto-repay bot
lsof -i :3002  # Liquidation bot
```

**Test connection:**

```bash
curl -v http://localhost:3000/health
```

### Bot Secret Keys

Each bot needs its own funded Stellar account:

```bash
# Generate bot keys
stellar keys generate oracle-bot --network testnet --fund
stellar keys generate auto-repay-bot --network testnet --fund
stellar keys generate liquidation-bot --network testnet --fund

# Get secret keys
stellar keys show oracle-bot
stellar keys show auto-repay-bot
stellar keys show liquidation-bot
```

Add the secret keys to each bot's `.env` file as `BOT_SECRET_KEY`.

## Monitoring

### Check Bot Health

```bash
# All bots status
./status-bots.sh

# Individual bot health
curl http://localhost:3000/health | jq
curl http://localhost:3001/health | jq
curl http://localhost:3002/health | jq
```

### View Metrics

```bash
# Oracle bot metrics
curl http://localhost:3000/metrics | jq

# Auto-repay bot metrics
curl http://localhost:3001/metrics | jq

# Liquidation bot metrics
curl http://localhost:3002/metrics | jq
```

### Continuous Monitoring

```bash
# Watch status every 5 seconds
watch -n 5 ./status-bots.sh

# Monitor logs in real-time
tail -f logs/*.log
```

## Production Deployment

For production deployment, consider:

1. **Use PM2 or systemd** for process management
2. **Set up log rotation** to prevent disk space issues
3. **Configure monitoring** (Prometheus, Grafana)
4. **Set up alerts** for bot failures
5. **Use separate accounts** for each bot
6. **Implement rate limiting** on API endpoints
7. **Set up SSL/TLS** for bot APIs
8. **Configure firewall rules** for security

### Example PM2 Setup

```bash
# Install PM2
npm install -g pm2

# Start bots with PM2
cd bots/oracle-price-bot
pm2 start dist/index.js --name oracle-bot

cd ../auto-repay-bot
pm2 start dist/index.js --name auto-repay-bot

cd ../liquidation-bot
pm2 start dist/index.js --name liquidation-bot

# Save PM2 configuration
pm2 save

# Set up auto-restart on system reboot
pm2 startup
```

## Contract Addresses (Testnet)

Current deployed contracts:

- **USDC Mock**: `CAXHQJ6IHN2TPAJ4NEOXJJLRRAO74BEAWA3RXHD6NSOWRBQCTVZA3ZGS`
- **RWA Token**: `CCHUQ75NY5CFWIXG42RJRZQDMZ2HOAERS4RSX4EL6EEOUE6OMOFLBFVV`
- **stRWA Token**: `CCCTL6UHRPOODYKYOXAW6Y3NKOFPFKB7QIYRRYGEANM2KHYYYAT4PJUS`
- **RWA Vault**: `CB3I43AX6VBYTHLVGXK3TVM5RZXLTSHT5RIHOTK2BHORNQY3RF3QH2TT`
- **Oracle**: `CD5XYT6WXOB567JC3QZGJ7RWHWP4N3C4GJ5LX75WDWUGL7NPXFJJC6AZ`
- **Lending Pool**: `CBJM554JCHWRFG7QFBKMPAPOO4DBJPLKHSH2T7U4FRLCPDS36U44WT5Y`

See `contracts/deployed-addresses.json` for the complete list.

## Support

For issues or questions:

- Check logs: `logs/<bot-name>.log`
- View status: `./status-bots.sh`
- Restart bots: `./stop-bots.sh && ./start-bots.sh`
