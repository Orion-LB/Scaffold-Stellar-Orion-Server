# Bot Multi-Asset Compatibility Report

**Date**: 2025-11-10
**Protocol Version**: Multi-Asset (3 RWA types: Invoices, TBills, Real Estate)

## Executive Summary

All three bots (Oracle Price Bot, Auto-Repay Bot, Liquidation Bot) are currently configured for the **old single-asset architecture** and require updates to support the new **multi-asset deployment** with 3 asset types.

| Bot                  | Current Status | Multi-Asset Ready | Priority | Effort |
| -------------------- | -------------- | ----------------- | -------- | ------ |
| **Oracle Price Bot** | ❌ Failing     | ❌ No             | HIGH     | Medium |
| **Auto-Repay Bot**   | ✅ Running     | ⚠️ Partial        | MEDIUM   | Low    |
| **Liquidation Bot**  | ✅ Running     | ⚠️ Partial        | MEDIUM   | Low    |

---

## 1. Oracle Price Bot

### Current Status: ❌ FAILING

**Error**: `Error: Unsupported API fetcher: Ondo Finance`

### Architecture Analysis

#### Current Configuration

```typescript
// bots/oracle-price-bot/src/config/sources.ts
export const DATA_SOURCES: Record<string, DataSource[]> = {
  TBILL_TOKEN: [
    // ❌ Only 1 asset configured
    {
      name: "Franklin Templeton API",
      type: "api",
      url: "https://api.franklintempleton.com/tbill/price",
      weight: 40,
      priority: 1,
    },
    {
      name: "Chainlink RWA Feed",
      type: "chainlink",
      url: "https://rwa-oracle.chain.link/tbill",
      weight: 30,
      priority: 2,
    },
    {
      name: "Ondo Finance", // ❌ NOT IMPLEMENTED
      type: "api",
      url: "https://api.ondo.finance/ousg/nav",
      weight: 30,
      priority: 3,
    },
  ],
};
```

**Environment Variables** (`.env`):

```bash
STRWA_TOKEN_ADDRESS=CCCTL6UHRPOODYKYOXAW6Y3NKOFPFKB7QIYRRYGEANM2KHYYYAT4PJUS
# ❌ This is an OLD address, not one of our 3 new stRWA tokens
```

#### Required Configuration (Multi-Asset)

```typescript
export const DATA_SOURCES: Record<string, DataSource[]> = {
  STRWA_INVOICES: [
    {
      name: "Mock Oracle - Invoices",
      type: "custom",
      url: "http://localhost:8080/price/invoices",
      weight: 100,
      priority: 1,
      timeout: 5000,
      retries: 3,
    },
  ],
  STRWA_TBILLS: [
    {
      name: "Mock Oracle - TBills",
      type: "custom",
      url: "http://localhost:8080/price/tbills",
      weight: 100,
      priority: 1,
      timeout: 5000,
      retries: 3,
    },
  ],
  STRWA_REALESTATE: [
    {
      name: "Mock Oracle - Real Estate",
      type: "custom",
      url: "http://localhost:8080/price/realestate",
      weight: 100,
      priority: 1,
      timeout: 5000,
      retries: 3,
    },
  ],
};
```

**Environment Variables** (`.env` - required):

```bash
# New multi-asset addresses from deployed-addresses.json
STRWA_INVOICES_ADDRESS=CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL
STRWA_TBILLS_ADDRESS=CDGL6V3VT6HAIWNDQLYTLWFXF4O7L3TNWYD3OUEE4JNCLX3EXHH2HSEA
STRWA_REALESTATE_ADDRESS=CD5WDVFPWBLERKA3RYQT6L7V5J5NLHL3HP64WYJUVZMNUQLAGPLEYOZR
ORACLE_CONTRACT_ID=CD5XYT6WXOB567JC3QZGJ7RWHWP4N3C4GJ5LX75WDWUGL7NPXFJJC6AZ
```

### Issues Identified

#### 1. Missing Fetcher Implementation

**File**: `bots/oracle-price-bot/src/bot.ts:33`

```typescript
function createFetcher(source: DataSource): PriceFetcher {
  switch (source.type) {
    case "chainlink":
      return new ChainlinkFetcher(source);
    case "api":
      if (source.name.includes("Franklin")) {
        return new FranklinTempletonFetcher(source);
      }
      // ❌ No handler for "Ondo Finance" - THROWS ERROR
      throw new Error(`Unsupported API fetcher: ${source.name}`);
    default:
      throw new Error(`Unsupported fetcher type: ${source.type}`);
  }
}
```

**Fix Required**: Add custom fetcher or remove Ondo Finance from sources

#### 2. Single Asset Configuration

**File**: `bots/oracle-price-bot/src/config/sources.ts`

**Issue**: Only `TBILL_TOKEN` is configured, but we need:

- `STRWA_INVOICES`
- `STRWA_TBILLS`
- `STRWA_REALESTATE`

#### 3. Wrong Token Address

**File**: `bots/oracle-price-bot/.env:7`

```bash
STRWA_TOKEN_ADDRESS=CCCTL6UHRPOODYKYOXAW6Y3NKOFPFKB7QIYRRYGEANM2KHYYYAT4PJUS
# ❌ This is NOT in our deployed-addresses.json
```

### Migration Plan

#### Step 1: Create Custom Mock Fetcher

Create `bots/oracle-price-bot/src/fetcher/mock.ts`:

```typescript
import { PriceFetcher } from "./base";
import { DataSource } from "../config/sources";

export class MockPriceFetcher extends PriceFetcher {
  private prices: Map<string, number> = new Map([
    ["STRWA_INVOICES", 1.05], // $1.05 per invoice stRWA
    ["STRWA_TBILLS", 1.02], // $1.02 per TBills stRWA
    ["STRWA_REALESTATE", 1.08], // $1.08 per Real Estate stRWA
  ]);

  constructor(source: DataSource) {
    super(source);
  }

  async fetchPrice(asset: string): Promise<number> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const price = this.prices.get(asset);
    if (!price) {
      throw new Error(`No mock price configured for ${asset}`);
    }

    // Add small random variation (±0.1%)
    const variation = (Math.random() - 0.5) * 0.002;
    return price * (1 + variation);
  }
}
```

#### Step 2: Update Fetcher Factory

Modify `bots/oracle-price-bot/src/bot.ts`:

```typescript
import { MockPriceFetcher } from "./fetcher/mock";

function createFetcher(source: DataSource): PriceFetcher {
  switch (source.type) {
    case "chainlink":
      return new ChainlinkFetcher(source);
    case "custom":
      return new MockPriceFetcher(source); // ✅ Add this
    case "api":
      if (source.name.includes("Franklin")) {
        return new FranklinTempletonFetcher(source);
      }
      // Remove or implement Ondo Finance
      throw new Error(`Unsupported API fetcher: ${source.name}`);
    default:
      throw new Error(`Unsupported fetcher type: ${source.type}`);
  }
}
```

#### Step 3: Update Data Sources Configuration

Replace `bots/oracle-price-bot/src/config/sources.ts`:

```typescript
export const DATA_SOURCES: Record<string, DataSource[]> = {
  STRWA_INVOICES: [
    {
      name: "Mock Oracle - Invoices",
      type: "custom",
      url: "", // Not used for mock
      weight: 100,
      priority: 1,
      timeout: 5000,
      retries: 3,
    },
  ],
  STRWA_TBILLS: [
    {
      name: "Mock Oracle - TBills",
      type: "custom",
      url: "",
      weight: 100,
      priority: 1,
      timeout: 5000,
      retries: 3,
    },
  ],
  STRWA_REALESTATE: [
    {
      name: "Mock Oracle - Real Estate",
      type: "custom",
      url: "",
      weight: 100,
      priority: 1,
      timeout: 5000,
      retries: 3,
    },
  ],
};
```

#### Step 4: Update Environment Variables

Update `bots/oracle-price-bot/.env`:

```bash
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
BOT_SECRET_KEY=<keep existing>
ORACLE_CONTRACT_ID=CD5XYT6WXOB567JC3QZGJ7RWHWP4N3C4GJ5LX75WDWUGL7NPXFJJC6AZ
# Multi-asset token addresses
STRWA_INVOICES_ADDRESS=CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL
STRWA_TBILLS_ADDRESS=CDGL6V3VT6HAIWNDQLYTLWFXF4O7L3TNWYD3OUEE4JNCLX3EXHH2HSEA
STRWA_REALESTATE_ADDRESS=CD5WDVFPWBLERKA3RYQT6L7V5J5NLHL3HP64WYJUVZMNUQLAGPLEYOZR
PORT=3000
```

#### Step 5: Update Transaction Manager

Modify `bots/oracle-price-bot/src/blockchain/transaction.ts` to map asset names to addresses:

```typescript
private assetAddresses: Map<string, string> = new Map([
  ["STRWA_INVOICES", process.env.STRWA_INVOICES_ADDRESS!],
  ["STRWA_TBILLS", process.env.STRWA_TBILLS_ADDRESS!],
  ["STRWA_REALESTATE", process.env.STRWA_REALESTATE_ADDRESS!],
]);

async submitPrice(asset: string, price: number, timestamp: number): Promise<string> {
  const tokenAddress = this.assetAddresses.get(asset);
  if (!tokenAddress) {
    throw new Error(`Unknown asset: ${asset}`);
  }

  // Submit to oracle contract with token address
  const priceScaled = BigInt(Math.floor(price * 1e18));
  // ... rest of implementation
}
```

---

## 2. Auto-Repay Bot

### Current Status: ✅ RUNNING (but not multi-asset compatible)

**Error**: None (bot starts successfully)
**Warning**: Configured for old vault address

### Architecture Analysis

#### Current Configuration

**Environment Variables** (`.env`):

```bash
VAULT_CONTRACT_ID=CB3I43AX6VBYTHLVGXK3TVM5RZXLTSHT5RIHOTK2BHORNQY3RF3QH2TT
# ❌ This is an OLD vault address, not one of our 3 new vaults
LENDING_POOL_CONTRACT_ID=CBJM554JCHWRFG7QFBKMPAPOO4DBJPLKHSH2T7U4FRLCPDS36U44WT5Y
# ❌ This is an OLD lending pool address
```

**Code Architecture**:

```typescript
// bots/auto-repay-bot/src/index.ts
const networkConfig: NetworkConfig = {
  vaultContractId: process.env.VAULT_CONTRACT_ID || "", // ❌ Single vault only
  lendingPoolContractId: process.env.LENDING_POOL_CONTRACT_ID || "",
  // ...
};
```

#### Required Configuration (Multi-Asset)

**Environment Variables**:

```bash
# All 3 vaults
VAULT_INVOICES_ID=CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G
VAULT_TBILLS_ID=CAFQWK3D3QLMGSW2OL6HE3VTCLCKZKPWNTCTKBM5MFLKKZWIKTA6Z7DP
VAULT_REALESTATE_ID=CAGUJJGFK7N5WC4CEYS3CS6QH7RIAWBPZIMB6ELVHGBJ5KBA3R3WMWLI

# New lending pool
LENDING_POOL_CONTRACT_ID=CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ
```

### Issues Identified

#### 1. Single Vault Limitation

**File**: `bots/auto-repay-bot/src/config/network.ts`

```typescript
export interface NetworkConfig {
  rpcUrl: string;
  botSecretKey: string;
  networkPassphrase: string | undefined;
  vaultContractId: string; // ❌ Should be: vaultContractIds: string[]
  lendingPoolContractId: string;
}
```

#### 2. Event Monitoring Limited to Single Vault

**File**: `bots/auto-repay-bot/src/monitor/events.ts`

The bot monitors yield claim events from only one vault. With multi-asset, it needs to monitor all 3 vaults.

#### 3. Wrong Contract Addresses

Both vault and lending pool addresses in `.env` don't match our new deployment.

### Migration Plan

#### Step 1: Update Network Config Interface

Modify `bots/auto-repay-bot/src/config/network.ts`:

```typescript
export interface NetworkConfig {
  rpcUrl: string;
  botSecretKey: string;
  networkPassphrase: string | undefined;
  vaultContractIds: string[]; // ✅ Changed to array
  lendingPoolContractId: string;
}
```

#### Step 2: Update Configuration Loading

Modify `bots/auto-repay-bot/src/index.ts`:

```typescript
const networkConfig: NetworkConfig = {
  rpcUrl:
    process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org:443",
  botSecretKey: process.env.BOT_SECRET_KEY || "",
  networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE,
  vaultContractIds: [
    process.env.VAULT_INVOICES_ID || "",
    process.env.VAULT_TBILLS_ID || "",
    process.env.VAULT_REALESTATE_ID || "",
  ].filter(Boolean), // ✅ Array of vaults
  lendingPoolContractId: process.env.LENDING_POOL_CONTRACT_ID || "",
};
```

#### Step 3: Update Event Monitor

Modify `bots/auto-repay-bot/src/monitor/events.ts` to monitor all vaults:

```typescript
export class EventMonitor {
  constructor(private config: NetworkConfig) {}

  async monitorYieldClaims(): Promise<YieldClaimEvent[]> {
    const allEvents: YieldClaimEvent[] = [];

    // Monitor all vaults
    for (const vaultId of this.config.vaultContractIds) {
      const events = await this.fetchEventsForVault(vaultId);
      allEvents.push(...events);
    }

    return allEvents;
  }

  private async fetchEventsForVault(
    vaultId: string,
  ): Promise<YieldClaimEvent[]> {
    // Fetch events for specific vault
    // ...
  }
}
```

#### Step 4: Update Environment Variables

Update `bots/auto-repay-bot/.env`:

```bash
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
BOT_SECRET_KEY=<keep existing>

# Multi-asset vault addresses
VAULT_INVOICES_ID=CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G
VAULT_TBILLS_ID=CAFQWK3D3QLMGSW2OL6HE3VTCLCKZKPWNTCTKBM5MFLKKZWIKTA6Z7DP
VAULT_REALESTATE_ID=CAGUJJGFK7N5WC4CEYS3CS6QH7RIAWBPZIMB6ELVHGBJ5KBA3R3WMWLI

# New lending pool
LENDING_POOL_CONTRACT_ID=CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ

PORT=3001
CHECK_INTERVAL=300000
MIN_REPAYMENT_AMOUNT=1000000
LOG_LEVEL=info
```

---

## 3. Liquidation Bot

### Current Status: ✅ RUNNING (but not multi-asset compatible)

**Error**: None (bot starts successfully)
**Warning**: Configured for single stRWA token, old lending pool

### Architecture Analysis

#### Current Configuration

**Environment Variables** (`.env`):

```bash
LENDING_POOL_CONTRACT_ID=CBJM554JCHWRFG7QFBKMPAPOO4DBJPLKHSH2T7U4FRLCPDS36U44WT5Y
# ❌ Old lending pool address
STRWA_TOKEN_ADDRESS=CCCTL6UHRPOODYKYOXAW6Y3NKOFPFKB7QIYRRYGEANM2KHYYYAT4PJUS
# ❌ Old single stRWA token address
```

**Code Architecture**:

```typescript
// bots/liquidation-bot/src/index.ts
const networkConfig: NetworkConfig = {
  stRwaTokenAddress: process.env.STRWA_TOKEN_ADDRESS || "", // ❌ Single token
  // ...
};
```

#### Required Configuration (Multi-Asset)

The lending pool now supports multi-collateral loans with this structure:

```rust
pub struct Loan {
    pub borrower: Address,
    pub collaterals: Vec<CollateralInput>,  // Multiple collaterals!
    // ...
}

pub struct CollateralInput {
    pub token_address: Address,  // Which stRWA token
    pub amount: i128
}
```

**Environment Variables**:

```bash
# All 3 stRWA token addresses
STRWA_INVOICES_ADDRESS=CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL
STRWA_TBILLS_ADDRESS=CDGL6V3VT6HAIWNDQLYTLWFXF4O7L3TNWYD3OUEE4JNCLX3EXHH2HSEA
STRWA_REALESTATE_ADDRESS=CD5WDVFPWBLERKA3RYQT6L7V5J5NLHL3HP64WYJUVZMNUQLAGPLEYOZR

# New lending pool
LENDING_POOL_CONTRACT_ID=CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ
ORACLE_CONTRACT_ID=CD5XYT6WXOB567JC3QZGJ7RWHWP4N3C4GJ5LX75WDWUGL7NPXFJJC6AZ
```

### Issues Identified

#### 1. Single Token Price Fetching

**File**: `bots/liquidation-bot/src/bot.ts:95-96`

```typescript
const [price, priceTimestamp] = await this.oracle.getPrice(
  this.config.stRwaTokenAddress, // ❌ Only gets price for 1 token
);
```

With multi-collateral loans, we need prices for ALL tokens in the loan.

#### 2. Health Calculation Assumes Single Collateral

**File**: `bots/liquidation-bot/src/calculator/health.ts`

Current health calculation:

```typescript
healthFactor = (collateralAmount * price) / outstandingDebt;
```

Required for multi-collateral:

```typescript
totalCollateralValue = sum(
  collateral1.amount * price1,
  collateral2.amount * price2,
  collateral3.amount * price3,
);
healthFactor = totalCollateralValue / outstandingDebt;
```

#### 3. Loan Structure Mismatch

**File**: `bots/liquidation-bot/src/calculator/health.ts:11`

```typescript
export interface Loan {
  collateralAmount: bigint; // ❌ Should be: collaterals: CollateralInput[]
  outstandingDebt: bigint;
  // ...
}
```

### Migration Plan

#### Step 1: Update Loan Interface

Modify `bots/liquidation-bot/src/calculator/health.ts`:

```typescript
export interface CollateralInput {
  tokenAddress: string;
  amount: bigint;
}

export interface Loan {
  collaterals: CollateralInput[]; // ✅ Changed from collateralAmount
  outstandingDebt: bigint;
  penalties: bigint;
  lastPaymentTime: number;
  warningsIssued: number;
  lastWarningTime: number;
}
```

#### Step 2: Update Health Calculator

Modify `bots/liquidation-bot/src/calculator/health.ts`:

```typescript
export class HealthCalculator {
  async calculateHealth(
    borrower: string,
    loan: Loan,
    oracle: OracleClient,
    priceTimestamp: number,
  ): Promise<HealthFactorResult> {
    // Calculate total collateral value across all tokens
    let totalCollateralValue = 0n;

    for (const collateral of loan.collaterals) {
      const [price, timestamp] = await oracle.getPrice(collateral.tokenAddress);

      // Validate price freshness
      const now = Date.now() / 1000;
      if (now - timestamp > 24 * 3600) {
        throw new Error(`Stale price for ${collateral.tokenAddress}`);
      }

      // Calculate value: amount * price (both scaled by 1e18)
      const value = (collateral.amount * price) / 10n ** 18n;
      totalCollateralValue += value;
    }

    // Calculate health factor
    const healthFactor = Number(
      (totalCollateralValue * 100n) / loan.outstandingDebt,
    );

    return {
      healthFactor,
      needsLiquidation: healthFactor < 110,
      totalCollateralValue,
      outstandingDebt: loan.outstandingDebt,
    };
  }
}
```

#### Step 3: Update Oracle Client

Modify `bots/liquidation-bot/src/bot.ts`:

```typescript
class OracleClient {
  constructor(private config: NetworkConfig) {}

  async getPrice(tokenAddress: string): Promise<[bigint, number]> {
    // Fetch price for specific token from oracle contract
    // The oracle contract has set_price() per token address

    const contract = new Contract(this.config.oracleContractId);
    const result = await contract.call(
      "get_price",
      tokenAddress, // ✅ Pass token address to oracle
    );

    return [result.price, result.timestamp];
  }
}
```

#### Step 4: Update Monitoring Loop

Modify `bots/liquidation-bot/src/bot.ts:90-103`:

```typescript
private async monitorAllLoans(): Promise<void> {
  const startTime = Date.now();
  try {
    const borrowers = await this.borrowerRegistry.getActiveBorrowers();
    this.logger.info("Monitoring loans", { count: borrowers.length });

    // ✅ No longer fetch single price here
    // Prices are fetched per-token in health calculator

    const results: MonitoringResult[] = [];
    for (const borrower of borrowers) {
      try {
        const result = await this.monitorLoan(borrower);  // ✅ Removed price param
        results.push(result);
      } catch (error: any) {
        // ...
      }
    }
    // ...
  }
}

public async monitorLoan(borrower: string): Promise<MonitoringResult> {
  const loan = await this.lendingPool.getLoan(borrower);
  if (!loan) {
    return { borrower, success: true, healthy: true, healthFactor: Infinity };
  }

  // ✅ Health calculator now fetches prices for all collateral tokens
  const health = await this.healthCalculator.calculateHealth(
    borrower,
    loan,
    this.oracle,  // Pass oracle client for multi-token price fetching
    Date.now() / 1000,
  );
  // ...
}
```

#### Step 5: Update Environment Variables

Update `bots/liquidation-bot/.env`:

```bash
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
BOT_SECRET_KEY=<keep existing>

# Multi-asset token addresses (for price lookups)
STRWA_INVOICES_ADDRESS=CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL
STRWA_TBILLS_ADDRESS=CDGL6V3VT6HAIWNDQLYTLWFXF4O7L3TNWYD3OUEE4JNCLX3EXHH2HSEA
STRWA_REALESTATE_ADDRESS=CD5WDVFPWBLERKA3RYQT6L7V5J5NLHL3HP64WYJUVZMNUQLAGPLEYOZR

# New lending pool and oracle
LENDING_POOL_CONTRACT_ID=CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ
ORACLE_CONTRACT_ID=CD5XYT6WXOB567JC3QZGJ7RWHWP4N3C4GJ5LX75WDWUGL7NPXFJJC6AZ

PORT=3002
CHECK_INTERVAL=300000
WARNING_THRESHOLD_1=150
WARNING_THRESHOLD_2=120
WARNING_THRESHOLD_3=110
LIQUIDATION_THRESHOLD=110
LOG_LEVEL=info
```

---

## Summary of Required Changes

### Oracle Price Bot

- [ ] Create `MockPriceFetcher` class for testing
- [ ] Update `createFetcher()` to handle custom type
- [ ] Replace `DATA_SOURCES` config with 3 asset types
- [ ] Update `.env` with 3 stRWA token addresses
- [ ] Update `TransactionManager` to map assets to addresses
- [ ] Remove or implement "Ondo Finance" fetcher

**Estimated Effort**: 2-3 hours

### Auto-Repay Bot

- [ ] Change `vaultContractId` to `vaultContractIds` array in config
- [ ] Update event monitoring to track all 3 vaults
- [ ] Update `.env` with 3 vault addresses
- [ ] Update lending pool address in `.env`
- [ ] Test yield claim detection across vaults

**Estimated Effort**: 1-2 hours

### Liquidation Bot

- [ ] Update `Loan` interface to use `collaterals: CollateralInput[]`
- [ ] Rewrite `HealthCalculator.calculateHealth()` for multi-collateral
- [ ] Update `OracleClient.getPrice()` to accept token address
- [ ] Remove single price fetch from monitoring loop
- [ ] Update `.env` with 3 stRWA token addresses
- [ ] Update lending pool and oracle addresses in `.env`
- [ ] Test health factor calculation with mixed collateral

**Estimated Effort**: 2-3 hours

---

## Testing Checklist

### Oracle Price Bot

- [ ] Bot starts without errors
- [ ] Fetches prices for all 3 assets
- [ ] Submits prices to oracle contract
- [ ] Health endpoint responds
- [ ] Metrics show updates for all 3 assets

### Auto-Repay Bot

- [ ] Bot starts without errors
- [ ] Monitors all 3 vaults for yield claims
- [ ] Detects eligible borrowers across vaults
- [ ] Executes repayments successfully
- [ ] Health endpoint responds

### Liquidation Bot

- [ ] Bot starts without errors
- [ ] Fetches prices for all collateral tokens in a loan
- [ ] Calculates correct health factor for multi-collateral loans
- [ ] Issues warnings at correct thresholds
- [ ] Liquidates unprofitable loans
- [ ] Health endpoint responds

---

## Deployment Addresses Reference

From [contracts/deployed-addresses.json](./contracts/deployed-addresses.json):

```json
{
  "network": "testnet",
  "contracts": {
    "strwa_invoices": "CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL",
    "strwa_tbills": "CDGL6V3VT6HAIWNDQLYTLWFXF4O7L3TNWYD3OUEE4JNCLX3EXHH2HSEA",
    "strwa_realestate": "CD5WDVFPWBLERKA3RYQT6L7V5J5NLHL3HP64WYJUVZMNUQLAGPLEYOZR",
    "vault_invoices": "CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G",
    "vault_tbills": "CAFQWK3D3QLMGSW2OL6HE3VTCLCKZKPWNTCTKBM5MFLKKZWIKTA6Z7DP",
    "vault_realestate": "CAGUJJGFK7N5WC4CEYS3CS6QH7RIAWBPZIMB6ELVHGBJ5KBA3R3WMWLI",
    "lending_pool": "CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ",
    "oracle": "CD5XYT6WXOB567JC3QZGJ7RWHWP4N3C4GJ5LX75WDWUGL7NPXFJJC6AZ"
  }
}
```

---

## Conclusion

**Current State**: All 3 bots are architected for single-asset operations and contain hardcoded addresses from a previous deployment.

**Required State**: Multi-asset support with 3 RWA types (Invoices, TBills, Real Estate), 3 vaults, and multi-collateral loan handling.

**Total Estimated Effort**: 5-8 hours of development + testing

**Priority Order**:

1. **Oracle Price Bot** (HIGH) - Currently failing, required for price updates
2. **Liquidation Bot** (MEDIUM) - Running but won't handle multi-collateral correctly
3. **Auto-Repay Bot** (MEDIUM) - Running but only monitors 1 vault

**Next Steps**:

1. Apply fixes to Oracle Price Bot first (unblock price updates)
2. Test with mock prices for all 3 assets
3. Update Auto-Repay and Liquidation bots
4. Full integration testing with multi-collateral loans

---

**Report Generated**: 2025-11-10
**Status**: ⚠️ Bots require migration before production use
