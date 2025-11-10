# 🌟 Orion RWA Lending Protocol

> **DeFi Liquidity Bridge for Institutional-Grade Tokenized Real-World Assets on Stellar**

[![Stellar](https://img.shields.io/badge/Stellar-Soroban-blue)](https://stellar.org)
[![Status](https://img.shields.io/badge/Status-Integrated%20%26%20Ready-green)]()

---

## 📖 Overview

Orion Protocol enables permissioned Real-World Asset (RWA) tokens to interact with DeFi while maintaining legal compliance. It transforms illiquid, yield-bearing institutional assets into composable DeFi collateral with automated yield-to-debt routing.

### The Problem

- **Whitelist Wall**: RWA tokens can only transfer between legally approved wallets
- **Yield Trap**: Off-chain yields don't reach on-chain holders
- **Liquidity Lock**: Cannot access DeFi lending without selling assets

### Our Solution

**Two-Layer Architecture:**

1. **Vault Layer**: RWA → stRWA (composable receipt tokens)
2. **Lending Layer**: Borrow USDC against stRWA + auto-repay from yield

**Key Innovation**: Self-liquidating credit lines 🚀

---

## ✨ Features

- ✅ **Permissioned Compliance** - Whitelist-enforced transfers
- ✅ **Yield-Bearing Vault** - Capture off-chain yields on-chain
- ✅ **Collateralized Lending** - 75% LTV on stRWA
- ✅ **Auto-Repay System** - Yield automatically reduces debt
- ✅ **Oracle Integration** - Real-time price feeds
- ✅ **Health Monitoring** - Visual risk indicators
- ✅ **3-Warning System** - Progressive penalties
- ✅ **Automated Liquidations** - Bot-driven risk management

---

## 🚀 Quick Start

### Deploy Contracts

```bash
cd contracts && cargo build --release
stellar contract deploy --wasm target/.../rwa_vault.wasm --network testnet
```

### Start Bots

```bash
cd bots/orchestrator
npm install && npm run build && npm start
```

### Launch Frontend

```bash
cd frontend
npm install && npm run dev
```

**Access**: http://localhost:3000

---

## 📁 Structure

```
├── contracts/          # Smart Contracts (Soroban/Rust)
├── bots/              # Backend Automation (TypeScript)
│   ├── shared/        # Contract clients & config
│   ├── oracle-price-bot/
│   ├── auto-repay-bot/
│   ├── liquidation-bot/
│   └── orchestrator/  # Bot management
└── frontend/          # UI (React/TypeScript)
```

---

## 📚 Documentation

- **[COMPLETE_SYSTEM_INTEGRATION.md](COMPLETE_SYSTEM_INTEGRATION.md)** - Full integration guide
- **[Frontend_done.md](Frontend_done.md)** - UI specification
- **[SYSTEM_INTEGRATION.md](SYSTEM_INTEGRATION.md)** - Bot architecture

---

## 🎮 Demo Flow

1. Connect wallet → Get whitelisted
2. Stake RWA → Receive stRWA
3. Borrow USDC against stRWA
4. Enable auto-repay
5. Yield reduces debt automatically
6. Monitor health factor
7. Avoid liquidation!

---

## 🔧 Configuration

```bash
# .env
ORACLE_BOT_SECRET_KEY=S...
AUTO_REPAY_BOT_SECRET_KEY=S...
LIQUIDATION_BOT_SECRET_KEY=S...
```

Contract addresses auto-loaded from `contracts/deployed-addresses.json`

---

## 📊 Monitoring

- **Bot Metrics**: http://localhost:9090
- **Auto-Repay API**: http://localhost:3001
- **Liquidation API**: http://localhost:3002

---

## 🛠️ Tech Stack

- **Contracts**: Rust + Soroban
- **Bots**: TypeScript + Node.js + Stellar SDK
- **Frontend**: React + TypeScript + Freighter

---

**Built for Stellar Soroban Hackathon** 🚀

_Making institutional RWAs composable in DeFi_
