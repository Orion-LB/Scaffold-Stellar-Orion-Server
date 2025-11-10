# Orion RWA Lending Protocol

Multi-Asset DeFi Lending Platform for Tokenized Real-World Assets on Stellar

[![Stellar](https://img.shields.io/badge/Stellar-Soroban-blue)](https://stellar.org)
[![Status](https://img.shields.io/badge/Status-Testnet-green)]()

---

## Overview

Orion Protocol is a decentralized lending platform that enables holders of tokenized real-world assets (RWAs) to unlock liquidity while maintaining compliance with regulatory requirements. The system transforms illiquid, yield-bearing institutional assets into collateral for USDC loans with automated yield-to-debt routing.

### The Challenge

Traditional RWA tokens face three fundamental constraints:

- **Transfer Restrictions**: Regulatory compliance requires whitelist-enforced transfers
- **Yield Isolation**: Off-chain yields cannot be automatically captured on-chain
- **Liquidity Constraints**: Asset holders cannot access DeFi lending without liquidating positions

### Solution Architecture

Orion implements a two-layer system:

1. **Vault Layer**: Converts restricted RWA tokens into freely transferable stRWA receipt tokens (1:1 ratio)
2. **Lending Layer**: Provides USDC loans collateralized by stRWA tokens with automated yield-based repayment

The system supports three distinct RWA asset types: Invoices, Treasury Bills, and Real Estate, each with independent vaults and pricing mechanisms.

---

## Core Features

**Asset Management**

- Multi-asset support (Invoices, TBills, Real Estate)
- Whitelist-compliant RWA token transfers
- Vault-based staking with 1:1 stRWA receipt tokens
- Segregated yield pools per asset type

**Lending Operations**

- Multi-collateral loan origination
- 140% collateralization ratio (LTV: 71.4%)
- Oracle-based real-time asset pricing
- Interest rate tiers based on asset yield profiles

**Automated Systems**

- Auto-repay from accumulated vault yields
- Health factor monitoring and liquidation triggers
- Progressive warning system (150%, 120%, 110% thresholds)
- Bot-driven price feeds and risk management

---

## System Architecture

### Smart Contracts (Soroban/Rust)

**Core Infrastructure**

- Mock Oracle: `CDQ3C3T477QZFH6KQMQEA4HTIVIHOMN5YKDWHBDQT4EBO4MNXI5ZXKVX`
- Lending Pool: `CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ`
- USDC Mock: `CAXHQJ6IHN2TPAJ4NEOXJJLRRAO74BEAWA3RXHD6NSOWRBQCTVZA3ZGS`

**RWA Tokens** (3 types)

- Invoices RWA: `CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP`
- TBills RWA: `CD3ZKDA3VG4PQAPXCPJV6VZJ65ACA2N7ISPUF4FN73ITMCNHKCEGMZAW`
- Real Estate RWA: `CCSCN4NNINMSENMRRFYHW7M6D3NBMK33NE3BA5XCCT26CSCJT5ZKYF46`

**stRWA Tokens** (vault receipts)

- Invoices stRWA: `CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL`
- TBills stRWA: `CDGL6V3VT6HAIWNDQLYTLWFXF4O7L3TNWYD3OUEE4JNCLX3EXHH2HSEA`
- Real Estate stRWA: `CD5WDVFPWBLERKA3RYQT6L7V5J5NLHL3HP64WYJUVZMNUQLAGPLEYOZR`

**Vaults** (3 independent vaults)

- Invoices Vault: `CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G`
- TBills Vault: `CAFQWK3D3QLMGSW2OL6HE3VTCLCKZKPWNTCTKBM5MFLKKZWIKTA6Z7DP`
- Real Estate Vault: `CAGUJJGFK7N5WC4CEYS3CS6QH7RIAWBPZIMB6ELVHGBJ5KBA3R3WMWLI`

### Automation Bots (TypeScript/Node.js)

Three independent bot services handle protocol automation:

- **Oracle Price Bot** (Port 3000): Fetches and submits price data for all stRWA tokens
- **Auto-Repay Bot** (Port 3001): Monitors vault yields and automatically repays eligible loans
- **Liquidation Bot** (Port 3002): Tracks loan health factors and executes liquidations

### Frontend (React/TypeScript)

User interface for wallet connection, asset management, loan operations, and portfolio monitoring.

---

## Quick Start

### Prerequisites

- Rust toolchain (latest stable)
- Node.js 18+ and npm
- Stellar CLI: `cargo install --locked stellar-cli`
- Stellar testnet account with XLM funding

### Deploy Contracts

```bash
# Build all contracts
cd contracts
stellar contract build

# Contracts are already deployed to testnet
# See contracts/deployed-addresses.json for addresses
```

### Start Automation Bots

```bash
# Start all bots
./start-bots.sh

# Check bot status
./status-bots.sh

# View logs
tail -f logs/oracle-price-bot.log
tail -f logs/auto-repay-bot.log
tail -f logs/liquidation-bot.log

# Stop all bots
./stop-bots.sh
```

### Launch Frontend

```bash
cd frontend
npm install
npm run dev
```

Access at: `http://localhost:3000`

---

## Project Structure

```
├── contracts/                      # Soroban smart contracts (Rust)
│   ├── mock-rwa-token/            # RWA token with allowlist
│   ├── strwa-token/               # Vault receipt token
│   ├── rwa-vault/                 # Staking vault with yield
│   ├── lending-pool/              # Multi-collateral lending
│   ├── mock-oracle/               # Price feed oracle
│   └── deployed-addresses.json    # Contract addresses
│
├── bots/                          # Automation services (TypeScript)
│   ├── shared/                    # Contract clients & types
│   ├── oracle-price-bot/          # Price feed automation
│   ├── auto-repay-bot/            # Yield-based repayment
│   ├── liquidation-bot/           # Risk management
│   └── orchestrator/              # Bot coordination
│
├── frontend/                      # User interface (React)
│   └── src/                       # Application code
│
├── start-bots.sh                  # Bot startup script
├── stop-bots.sh                   # Bot shutdown script
└── status-bots.sh                 # Bot health check
```

---

## User Flow

### Staking Flow

1. User mints or receives RWA tokens (subject to whitelist)
2. User stakes RWA tokens in vault
3. Vault mints stRWA receipt tokens 1:1
4. User receives freely transferable stRWA tokens

### Borrowing Flow

1. User deposits stRWA tokens as collateral
2. System calculates borrowing capacity (71.4% LTV)
3. User originates USDC loan with chosen duration
4. Interest accrues based on asset risk profile

### Auto-Repay Flow

1. Admin funds vault yield pool
2. Yield accrues to stakers over time
3. Auto-repay bot identifies eligible borrowers
4. Bot executes repayment from accumulated yield
5. Loan principal decreases automatically

### Liquidation Flow

1. Liquidation bot monitors all active loans
2. Health factor warnings issued at 150%, 120%, 110%
3. Loans below 110% health factor become eligible for liquidation
4. Bot executes liquidation: repays debt, seizes collateral
5. Remaining collateral returned to borrower (if any)

---

## Configuration

### Bot Configuration

Each bot requires environment configuration:

```bash
# bots/oracle-price-bot/.env
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
BOT_SECRET_KEY=SDJL...WZZ5Q
ORACLE_CONTRACT_ID=CDQ3C3T477QZFH6KQMQEA4HTIVIHOMN5YKDWHBDQT4EBO4MNXI5ZXKVX
STRWA_INVOICES_ADDRESS=CDHGP...K74IL
STRWA_TBILLS_ADDRESS=CDGL6...H2HSEA
STRWA_REALESTATE_ADDRESS=CD5WD...LEYOZR
```

```bash
# bots/auto-repay-bot/.env
VAULT_INVOICES_ID=CCYAD...E32N2G
VAULT_TBILLS_ID=CAFQW...6Z7DP
VAULT_REALESTATE_ID=CAGUJ...3WMWLI
LENDING_POOL_CONTRACT_ID=CCW2T...545TWJ
```

Contract addresses are centrally managed in `contracts/deployed-addresses.json`.

### Network Configuration

Current deployment: Stellar Testnet

- RPC: `https://soroban-testnet.stellar.org`
- Network Passphrase: `Test SDF Network ; September 2015`
- Deployer: `GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D`

---

## Monitoring

### Bot Health Endpoints

```bash
# Oracle Price Bot
curl http://localhost:3000/health

# Auto-Repay Bot
curl http://localhost:3001/health

# Liquidation Bot
curl http://localhost:3002/health
```

### Contract Verification

```bash
# Check Oracle price
stellar contract invoke \
  --id CDQ3C3T477QZFH6KQMQEA4HTIVIHOMN5YKDWHBDQT4EBO4MNXI5ZXKVX \
  --source-account testnet-deployer \
  --network testnet \
  -- get_price --asset CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL

# Check vault balance
stellar contract invoke \
  --id CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G \
  --source-account testnet-deployer \
  --network testnet \
  -- get_total_deposits
```

---

## Technical Specifications

### Collateralization

- Minimum collateral ratio: 140% (71.4% LTV)
- Warning threshold 1: 150% (borrower notification)
- Warning threshold 2: 120% (increased urgency)
- Liquidation threshold: 110% (immediate action)

### Interest Rates

Dynamic rates based on asset yield profile:

- High-yield assets (>5% APY): 7% borrowing APR, 10% to liquidity providers
- Standard assets (<5% APY): 14% borrowing APR, 20% to liquidity providers

### Token Decimals

- USDC: 6 decimals (1 USDC = 1,000,000)
- RWA/stRWA: 18 decimals (1 token = 1,000,000,000,000,000,000)

### Security Features

- Whitelist enforcement on RWA tokens
- Vault-contract exclusive minting for stRWA
- Authorization checks on all bot operations
- Health factor monitoring with progressive warnings
- Event emission for all critical operations

---

## Documentation

**Deployment & Integration**

- [DEPLOYMENT_SNAPSHOT.md](DEPLOYMENT_SNAPSHOT.md) - Current deployment addresses
- [MULTI_ASSET_VERIFICATION.md](MULTI_ASSET_VERIFICATION.md) - System verification report
- [ORACLE_FIX_COMPLETE.md](ORACLE_FIX_COMPLETE.md) - Oracle contract updates

**Bot Operations**

- [BOT_MIGRATION_COMPLETE.md](BOT_MIGRATION_COMPLETE.md) - Multi-asset bot migration
- [BOT_STARTUP_GUIDE.md](BOT_STARTUP_GUIDE.md) - Bot management guide
- [BOT_MANAGEMENT.md](BOT_MANAGEMENT.md) - Bot architecture documentation

**System Integration**

- [COMPLETE_SYSTEM_INTEGRATION.md](COMPLETE_SYSTEM_INTEGRATION.md) - Full integration guide
- [SYSTEM_INTEGRATION.md](SYSTEM_INTEGRATION.md) - Technical architecture
- [QUICK_START.md](QUICK_START.md) - Quick start guide

---

## Technology Stack

**Smart Contracts**

- Language: Rust
- Framework: Soroban SDK
- Platform: Stellar blockchain
- Network: Testnet (production deployment pending)

**Automation Layer**

- Runtime: Node.js 18+
- Language: TypeScript
- SDK: @stellar/stellar-sdk
- Architecture: Microservices

**Frontend**

- Framework: React 18
- Language: TypeScript
- Wallet: Freighter integration
- Styling: Tailwind CSS

---

## Development Status

**Completed Features**

- Multi-asset smart contract deployment (3 RWA types)
- Vault staking and receipt token system
- Multi-collateral lending pool
- Oracle price feed integration
- Three automation bots (oracle, auto-repay, liquidation)
- Bot orchestration and management scripts
- Health monitoring and liquidation system

**Current Status**

- All contracts deployed to Stellar testnet
- Bots operational with multi-asset support
- Oracle contract fixed (get_price and set_price functions working)
- System ready for frontend integration testing

**Known Issues**

- Oracle bot experiencing TypeScript SDK encoding issue ("Bad union switch: 4")
- Issue is isolated to bot code, not contract functionality
- Contract works correctly via Stellar CLI
- Non-blocking for frontend development

---

## Testing

### Contract Functions

```bash
# Test RWA minting
stellar contract invoke --id CBFKZAVQ57... --network testnet \
  -- mint_rwa_tokens --user GAADP... --amount 1000000000000000000

# Test vault staking
stellar contract invoke --id CCYADH4... --network testnet \
  -- stake --user GAADP... --amount 500000000000000000

# Test price query
stellar contract invoke --id CDQ3C3T4... --network testnet \
  -- get_price --asset CDHGP3...

# Test loan origination
stellar contract invoke --id CCW2TFZ7... --network testnet \
  -- originate_loan --borrower GAADP... --collaterals [...] \
     --loan_amount 100000000 --duration_months 12
```

### Bot Testing

```bash
# Check all bot statuses
./status-bots.sh

# Restart bots
./stop-bots.sh && ./start-bots.sh

# Monitor specific bot
tail -f logs/oracle-price-bot.log
```

---

## Contributing

This is a hackathon project currently in active development. Contributions welcome after initial release.

---

## License

MIT License - see LICENSE file for details

---

## Network Information

**Stellar Testnet**

- RPC URL: https://soroban-testnet.stellar.org
- Network Passphrase: Test SDF Network ; September 2015
- Explorer: https://stellar.expert/explorer/testnet
- Horizon: https://horizon-testnet.stellar.org

**Funding**

- Friendbot: https://friendbot.stellar.org
- Request testnet XLM for development and testing

---

**Deployed**: November 10, 2025
**Network**: Stellar Testnet
**Status**: Operational (Oracle bot TypeScript SDK issue pending resolution)

Making institutional real-world assets composable in decentralized finance.
