# Orion RWA Bots - Startup Guide

## Overview

The Orion RWA lending protocol includes three automated bots that maintain protocol health:

1. **Oracle Price Bot** - Updates on-chain prices for stRWA tokens
2. **Auto-Repay Bot** - Automatically repays loans when yield is sufficient
3. **Liquidation Bot** - Issues warnings and liquidates under-collateralized loans

## Prerequisites

Before starting the bots, ensure you have:

- [x] Node.js v18+ installed
- [x] Stellar CLI installed (`stellar --version`)
- [x] All contracts deployed to testnet (see [DEPLOYMENT_COMPLETE.md](./DEPLOYMENT_COMPLETE.md))
- [x] Funded Stellar testnet accounts for each bot

## Quick Start

### 1. Generate Bot Keys

The setup script generates 3 Stellar keypairs (one per bot) and funds them with testnet XLM:

```bash
./setup-bot-keys.sh
```

**What it does:**

- Generates 3 Stellar accounts: `oracle-bot-testnet`, `auto-repay-bot-testnet`, `liquidation-bot-testnet`
- Funds each account with testnet XLM via Friendbot
- Creates `.env` files in each bot directory with:
  - `BOT_SECRET_KEY` - Bot's Stellar secret key
  - Contract addresses (oracle, vaults, lending pool, tokens)
  - Network configuration (RPC URL, network passphrase)

**Output:**

- `bots/oracle-price-bot/.env`
- `bots/auto-repay-bot/.env`
- `bots/liquidation-bot/.env`
- `bots/orchestrator/.env`

### 2. Install Dependencies

```bash
cd bots/oracle-price-bot && npm install && cd ../..
cd bots/auto-repay-bot && npm install && cd ../..
cd bots/liquidation-bot && npm install && cd ../..
```

Or install all at once:

```bash
for bot in oracle-price-bot auto-repay-bot liquidation-bot; do
  (cd bots/$bot && npm install)
done
```

### 3. Build Bots

```bash
cd bots/oracle-price-bot && npm run build && cd ../..
cd bots/auto-repay-bot && npm run build && cd ../..
cd bots/liquidation-bot && npm run build && cd ../..
```

Or build all at once:

```bash
for bot in oracle-price-bot auto-repay-bot liquidation-bot; do
  (cd bots/$bot && npm run build)
done
```

### 4. Start All Bots

```bash
./start-bots.sh
```

**What it does:**

- Starts each bot as a background process
- Redirects logs to `logs/<bot-name>.log`
- Saves process IDs to `logs/<bot-name>.pid`

### 5. Check Bot Status

```bash
./status-bots.sh
```

**Sample output:**

```
Bot Status Check
================

Oracle Price Bot:
  Status: RUNNING (PID: 12345)
  Port: 3000
  Health: OK

Auto-Repay Bot:
  Status: RUNNING (PID: 12346)
  Port: 3001
  Health: OK

Liquidation Bot:
  Status: RUNNING (PID: 12347)
  Port: 3002
  Health: OK
```

## Detailed Bot Configuration

### Oracle Price Bot

**Purpose**: Fetches external price data and updates on-chain oracle prices for stRWA tokens

**Configuration** (`bots/oracle-price-bot/.env`):

```bash
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
BOT_SECRET_KEY=<generated-secret-key>
ORACLE_CONTRACT_ID=<deployed-oracle-address>
STRWA_TOKEN_ADDRESS=<strwa-token-address>  # Currently single token
PORT=3000
```

**Multi-Asset Update Required**: Currently configured for single stRWA token. Needs update for 3 asset types.

**Data Sources** (configured in `src/config/sources.ts`):

- Franklin Templeton API (weight: 40%, priority: 1)
- Chainlink RWA Feed (weight: 30%, priority: 2)
- Ondo Finance (weight: 30%, priority: 3) - **NOT IMPLEMENTED**

**Update Schedule**:

- Time-based: Every 60 seconds
- Event-based: When price changes >0.5%

**Health Endpoint**: `http://localhost:3000/health`

**Admin API**:

- `GET /health` - Bot health status
- `GET /metrics` - Price update metrics
- `POST /pause` - Pause bot
- `POST /resume` - Resume bot
- `POST /update/:asset` - Trigger manual update

### Auto-Repay Bot

**Purpose**: Monitors borrowers' vault yields and automatically repays loans when sufficient yield is available

**Configuration** (`bots/auto-repay-bot/.env`):

```bash
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
BOT_SECRET_KEY=<generated-secret-key>
VAULT_CONTRACT_ID=<vault-address>  # Currently single vault
LENDING_POOL_CONTRACT_ID=<lending-pool-address>
PORT=3001
CHECK_INTERVAL=300000  # 5 minutes
MIN_REPAYMENT_AMOUNT=1000000  # 1 USDC minimum
LOG_LEVEL=info
```

**Multi-Asset Update Required**: Currently configured for single vault. Needs update for 3 vaults.

**Monitoring**:

- Event-based: Listens for yield claim events (every 30s)
- Time-based: Full borrower scan (every 5 minutes)

**Eligibility Criteria**:

- Borrower has active loan
- Claimable yield >= `MIN_REPAYMENT_AMOUNT`
- Loan outstanding debt > 0

**Health Endpoint**: `http://localhost:3001/health`

**Admin API**:

- `GET /health` - Bot health status
- `GET /metrics` - Repayment metrics
- `POST /process` - Trigger manual repayment processing

### Liquidation Bot

**Purpose**: Monitors loan health factors, issues warnings, and liquidates under-collateralized positions

**Configuration** (`bots/liquidation-bot/.env`):

```bash
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
BOT_SECRET_KEY=<generated-secret-key>
LENDING_POOL_CONTRACT_ID=<lending-pool-address>
ORACLE_CONTRACT_ID=<oracle-address>
STRWA_TOKEN_ADDRESS=<strwa-token-address>  # Currently single token
PORT=3002
CHECK_INTERVAL=300000  # 5 minutes
WARNING_THRESHOLD_1=150  # 150% health factor
WARNING_THRESHOLD_2=120  # 120% health factor
WARNING_THRESHOLD_3=110  # 110% health factor (final warning)
LIQUIDATION_THRESHOLD=110  # <110% triggers liquidation
LOG_LEVEL=info
```

**Multi-Asset Update Required**: Currently configured for single stRWA token. Needs multi-collateral support.

**Monitoring**:

- Continuous monitoring: Every 15 seconds
- Warning cooldown: 1 hour between warnings

**Warning System**:

1. **Warning 1**: Health factor <150% - "Monitor closely"
2. **Warning 2**: Health factor <120% - "Add collateral soon"
3. **Warning 3**: Health factor <110% - "Liquidation imminent"

**Liquidation**:

- Triggered when health factor <110%
- Economics check: Only liquidates if profitable (reward > gas cost)
- Liquidator receives 5% reward

**Health Endpoint**: `http://localhost:3002/health`

**Admin API**:

- `GET /health` - Bot health status
- `GET /metrics` - Liquidation metrics
- `GET /borrowers` - List monitored borrowers
- `POST /monitor/:borrower` - Check specific borrower

## Managing Bots

### Start Individual Bot

```bash
# Oracle Price Bot
cd bots/oracle-price-bot && npm start

# Auto-Repay Bot
cd bots/auto-repay-bot && npm start

# Liquidation Bot
cd bots/liquidation-bot && npm start
```

### Stop All Bots

```bash
./stop-bots.sh
```

Or manually:

```bash
kill $(cat logs/oracle-price-bot.pid)
kill $(cat logs/auto-repay-bot.pid)
kill $(cat logs/liquidation-bot.pid)
```

### View Logs

```bash
# Tail all logs
tail -f logs/*.log

# Individual bot logs
tail -f logs/oracle-price-bot.log
tail -f logs/auto-repay-bot.log
tail -f logs/liquidation-bot.log
```

### Restart Bots

```bash
./stop-bots.sh && ./start-bots.sh
```

## Troubleshooting

### Error: "invalid encoded string"

**Cause**: `BOT_SECRET_KEY` in `.env` file is corrupted or contains ANSI color codes

**Fix**: Regenerate keys

```bash
./setup-bot-keys.sh
```

### Error: "Unsupported API fetcher: Ondo Finance"

**Cause**: Oracle Price Bot references price source that isn't implemented

**Fix**: Update `bots/oracle-price-bot/src/config/sources.ts` to remove Ondo Finance or implement the fetcher

### Error: "Contract not found"

**Cause**: Contract address in `.env` is incorrect or contract not deployed

**Fix**:

1. Check [contracts/deployed-addresses.json](./contracts/deployed-addresses.json) for correct addresses
2. Update `.env` file with correct contract IDs
3. Restart bot

### Bot immediately exits

**Cause**: Build errors or missing dependencies

**Fix**:

```bash
cd bots/<bot-name>
npm install
npm run build
npm start
```

Check logs for specific error:

```bash
cat logs/<bot-name>.log
```

### Health check fails

**Cause**: Bot not responding on configured port

**Check**:

```bash
curl http://localhost:3000/health  # Oracle Price Bot
curl http://localhost:3001/health  # Auto-Repay Bot
curl http://localhost:3002/health  # Liquidation Bot
```

**Fix**: Ensure port is not already in use

```bash
lsof -i :3000
lsof -i :3001
lsof -i :3002
```

## Multi-Asset Migration Status

### Current State (Single-Asset)

All bots are configured for the **old single-asset architecture**:

- 1 stRWA token
- 1 vault
- 1 lending pool

### Required State (Multi-Asset)

Bots need to support **3 asset types**:

- 3 stRWA tokens (Invoices, TBills, Real Estate)
- 3 vaults (one per asset type)
- 1 lending pool (handles all asset types)

### Migration Required

#### 1. Oracle Price Bot

**Current**: Fetches price for single `STRWA_TOKEN_ADDRESS`
**Required**: Fetch and update prices for all 3 stRWA tokens

**Changes needed**:

- Update `src/config/sources.ts` to define data sources for all 3 assets
- Remove or implement "Ondo Finance" fetcher
- Add mock price sources for testing
- Update `.env` with all 3 stRWA token addresses

#### 2. Auto-Repay Bot

**Current**: Monitors single `VAULT_CONTRACT_ID`
**Required**: Monitor all 3 vaults for yield claims

**Changes needed**:

- Update configuration to accept array of vault addresses
- Monitor yield events from all 3 vaults
- Match borrower to correct vault based on collateral type
- Update `.env` with all 3 vault addresses

#### 3. Liquidation Bot

**Current**: Calculates health using single `STRWA_TOKEN_ADDRESS` price
**Required**: Support multi-collateral loans with different token prices

**Changes needed**:

- Fetch prices for all 3 stRWA tokens from oracle
- Calculate total collateral value across multiple tokens
- Support loans with mixed collateral types
- Update `.env` with all 3 stRWA token addresses

## Deployed Contract Addresses

From [contracts/deployed-addresses.json](./contracts/deployed-addresses.json):

```json
{
  "strwa_invoices": "CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL",
  "strwa_tbills": "CDGL6V3VT6HAIWNDQLYTLWFXF4O7L3TNWYD3OUEE4JNCLX3EXHH2HSEA",
  "strwa_realestate": "CD5WDVFPWBLERKA3RYQT6L7V5J5NLHL3HP64WYJUVZMNUQLAGPLEYOZR",
  "vault_invoices": "CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G",
  "vault_tbills": "CAFQWK3D3QLMGSW2OL6HE3VTCLCKZKPWNTCTKBM5MFLKKZWIKTA6Z7DP",
  "vault_realestate": "CAGUJJGFK7N5WC4CEYS3CS6QH7RIAWBPZIMB6ELVHGBJ5KBA3R3WMWLI",
  "lending_pool": "CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ",
  "oracle": "CD5XYT6WXOB567JC3QZGJ7RWHWP4N3C4GJ5LX75WDWUGL7NPXFJJC6AZ"
}
```

## Next Steps

1. **Update Oracle Price Bot** to support 3 stRWA tokens
2. **Update Auto-Repay Bot** to monitor 3 vaults
3. **Update Liquidation Bot** for multi-collateral support
4. **Test bot functionality** with multi-asset loans
5. **Set initial oracle prices** for all 3 tokens
6. **Monitor bot performance** in production

## Support

For issues or questions:

- Check bot logs in `logs/` directory
- Review contract deployment docs: [DEPLOYMENT_COMPLETE.md](./DEPLOYMENT_COMPLETE.md)
- Test workflow: [test-multi-asset-workflow.sh](./test-multi-asset-workflow.sh)

---

**Status**: Bots require multi-asset migration before production use
**Last Updated**: 2025-11-10
