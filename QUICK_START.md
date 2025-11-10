# Orion RWA Lending - Quick Start Guide

Get the Orion RWA Lending platform up and running in minutes!

## Prerequisites

- Node.js v18+ ([Download](https://nodejs.org/))
- Stellar CLI ([Install Guide](https://developers.stellar.org/docs/tools/developer-tools))
- Git

## Step 1: Clone & Install

```bash
# Already done if you're reading this!
cd scafold-stellar

# Install contract dependencies
npm install
```

## Step 2: Deploy Contracts (Already Done!)

The contracts are already deployed to Stellar testnet:

```json
{
  "network": "testnet",
  "contracts": {
    "usdc_mock": "CAXHQJ6IHN2TPAJ4NEOXJJLRRAO74BEAWA3RXHD6NSOWRBQCTVZA3ZGS",
    "mock_rwa_token": "CCHUQ75NY5CFWIXG42RJRZQDMZ2HOAERS4RSX4EL6EEOUE6OMOFLBFVV",
    "strwa_token": "CCCTL6UHRPOODYKYOXAW6Y3NKOFPFKB7QIYRRYGEANM2KHYYYAT4PJUS",
    "rwa_vault": "CB3I43AX6VBYTHLVGXK3TVM5RZXLTSHT5RIHOTK2BHORNQY3RF3QH2TT",
    "mock_oracle": "CD5XYT6WXOB567JC3QZGJ7RWHWP4N3C4GJ5LX75WDWUGL7NPXFJJC6AZ",
    "lending_pool": "CBJM554JCHWRFG7QFBKMPAPOO4DBJPLKHSH2T7U4FRLCPDS36U44WT5Y"
  }
}
```

See: `contracts/deployed-addresses.json`

## Step 3: Setup Bot Keys

Generate testnet accounts for the bots:

```bash
./setup-bot-keys.sh
```

This will:

- Create 3 funded testnet accounts
- Generate `.env` files for all bots
- Configure with deployed contract addresses

## Step 4: Start Bots

```bash
./start-bots.sh
```

This will start:

- **Oracle Price Bot** (Port 3000) - Updates stRWA token prices
- **Auto-Repay Bot** (Port 3001) - Automatic loan repayments from yield
- **Liquidation Bot** (Port 3002) - Monitors and liquidates risky positions

## Step 5: Verify Bots Are Running

```bash
./status-bots.sh
```

You should see all 3 bots with status: ● Running

## Step 6: Test the Platform

### Check Bot Health

```bash
curl http://localhost:3000/health  # Oracle
curl http://localhost:3001/health  # Auto-Repay
curl http://localhost:3002/health  # Liquidation
```

### View Bot Metrics

```bash
curl http://localhost:3000/metrics | jq
curl http://localhost:3001/metrics | jq
curl http://localhost:3002/metrics | jq
```

### View Live Logs

```bash
tail -f logs/oracle-price-bot.log
tail -f logs/auto-repay-bot.log
tail -f logs/liquidation-bot.log
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Orion RWA Lending                      │
└─────────────────────────────────────────────────────────┘

┌──────────────────────┐
│  Smart Contracts     │
│  (Stellar Testnet)   │
├──────────────────────┤
│ • USDC Mock          │
│ • RWA Token          │
│ • stRWA Token        │
│ • Vault              │
│ • Oracle             │
│ • Lending Pool       │
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│  Bot Infrastructure  │
├──────────────────────┤
│ • Oracle Price Bot   │───→ Fetches prices, updates oracle
│ • Auto-Repay Bot     │───→ Repays loans from yield
│ • Liquidation Bot    │───→ Liquidates risky positions
└──────────────────────┘
```

## Platform Flow

### 1. User Stakes RWA Tokens

```
User deposits RWA tokens → Vault
Vault mints stRWA tokens 1:1 → User
```

### 2. User Borrows USDC

```
User provides stRWA tokens as collateral
Lending Pool checks health factor (≥140%)
Lending Pool transfers USDC → User
```

### 3. Yield Distribution

```
Admin funds yield → Vault
Vault distributes proportionally to stakers
Auto-Repay Bot uses yield to repay loans
```

### 4. Price Updates

```
Oracle Price Bot fetches real-world prices
Bot submits to Oracle contract every 60s
Lending Pool uses prices for health calculations
```

### 5. Liquidation

```
Liquidation Bot monitors loan health factors
If health < 110%, bot liquidates position
Liquidator receives 10% reward
```

## Common Commands

### Bot Management

```bash
# Start all bots
./start-bots.sh

# Stop all bots
./stop-bots.sh

# Check bot status
./status-bots.sh

# View logs
tail -f logs/*.log

# Restart bots
./stop-bots.sh && ./start-bots.sh
```

### Contract Development

```bash
# Build contracts
stellar contract build

# Run tests
cargo test --all

# Deploy to testnet
./deploy-testnet.sh
```

### Frontend (Coming Soon)

```bash
# Start frontend
cd packages/nextjs
npm run dev

# Access at http://localhost:3000
```

## Project Structure

```
scafold-stellar/
├── contracts/              # Smart contracts (Rust)
│   ├── usdc-mock/
│   ├── mock-rwa-token/
│   ├── strwa-token/
│   ├── rwa-vault/
│   ├── mock-oracle/
│   └── lending-pool/
│
├── bots/                   # Bot infrastructure (TypeScript)
│   ├── oracle-price-bot/
│   ├── auto-repay-bot/
│   ├── liquidation-bot/
│   ├── orchestrator/
│   └── shared/
│
├── packages/              # Frontend (Next.js) - Coming Soon
│   └── nextjs/
│
├── logs/                  # Bot logs
│
├── start-bots.sh         # Start all bots
├── stop-bots.sh          # Stop all bots
├── status-bots.sh        # Check bot status
└── setup-bot-keys.sh     # Generate bot keys
```

## Troubleshooting

### Bots won't start

```bash
# Check Node.js version
node -v  # Should be v18+

# Check if .env files exist
ls -la bots/*/.env

# Re-run setup
./setup-bot-keys.sh
```

### Port already in use

```bash
# Check what's using the ports
lsof -i :3000
lsof -i :3001
lsof -i :3002

# Kill the processes
kill <PID>
```

### Bot crashes

```bash
# Check logs
cat logs/oracle-price-bot.log
cat logs/auto-repay-bot.log
cat logs/liquidation-bot.log

# Check for errors
grep -i error logs/*.log
```

## Next Steps

1. **Review Bot Logs**: Check that bots are operating correctly
2. **Monitor Metrics**: Use the HTTP APIs to view bot metrics
3. **Test Contracts**: Interact with deployed contracts
4. **Integrate Frontend**: Connect frontend to contracts and bots
5. **Deploy to Production**: When ready, deploy to mainnet

## Documentation

- [Bot Management Guide](BOT_MANAGEMENT.md) - Detailed bot operations
- [Contract Specs](contracts/README.md) - Smart contract documentation
- [Auto-Repay Bot Spec](AUTO_REPAY_BOT_SPEC.md) - Auto-repay bot details
- [Liquidation Bot Spec](LIQUIDATION_BOT_SPEC.md) - Liquidation bot details

## Support

For issues or questions:

- Check logs: `logs/<bot-name>.log`
- View status: `./status-bots.sh`
- Restart: `./stop-bots.sh && ./start-bots.sh`

## Security Notes

⚠️ **IMPORTANT:**

- These are testnet deployments
- Bot keys are for testing only
- Never use testnet keys on mainnet
- Keep secret keys secure
- Never commit `.env` files to git

## What's Next?

Now that the platform is running, you can:

1. **Test the platform** with the deployed contracts
2. **Monitor bot operations** using the status and metrics endpoints
3. **Implement frontend** to interact with contracts
4. **Add multi-asset support** (Invoices, T-Bills, Real Estate)
5. **Deploy to mainnet** when ready

Happy building! 🚀
