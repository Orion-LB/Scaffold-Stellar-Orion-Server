# 🏗️ Orion RWA Lending - System Integration Architecture

## Overview

This document describes the complete integration architecture connecting all components of the Orion RWA Lending Protocol:

- **Smart Contracts** (Soroban/Rust)
- **Backend Bots** (TypeScript/Node.js)
- **Frontend** (React/TypeScript)

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                          │
│  - Dashboard UI                                                     │
│  - Vault Management                                                 │
│  - Lending Pool Interface                                          │
│  - Real-time Health Display                                        │
└────────────┬────────────────────────────────────┬───────────────────┘
             │                                    │
             │ Stellar SDK                        │ REST API
             │ (Direct Contract Calls)            │
             │                                    │
             ▼                                    ▼
┌────────────────────────────┐      ┌─────────────────────────────────┐
│   SMART CONTRACTS          │      │      BACKEND BOTS               │
│                            │      │                                 │
│  ┌──────────────────────┐ │      │  ┌───────────────────────────┐ │
│  │  RWA Vault Contract  │◄├──────┼──┤  Auto-Repay Bot          │ │
│  │  - Deposits          │ │      │  │  - Monitors yield         │ │
│  │  - Withdrawals       │ │      │  │  - Routes to repayment    │ │
│  │  - Yield tracking    │ │      │  │  - Port 3001 Admin API    │ │
│  └──────────┬───────────┘ │      │  └────────────┬──────────────┘ │
│             │              │      │               │                 │
│  ┌──────────▼───────────┐ │      │  ┌────────────▼──────────────┐ │
│  │  Lending Pool        │◄├──────┼──┤  Liquidation Bot          │ │
│  │  - Loan origination  │ │      │  │  - Health monitoring      │ │
│  │  - Repayments        │ │      │  │  - Warning issuance       │ │
│  │  - Liquidations      │ │      │  │  - Liquidation execution  │ │
│  │  - Interest accrual  │ │      │  │  - Port 3002 Admin API    │ │
│  └──────────┬───────────┘ │      │  └────────────┬──────────────┘ │
│             │              │      │               │                 │
│  ┌──────────▼───────────┐ │      │  ┌────────────▼──────────────┐ │
│  │  Oracle Contract     │◄├──────┼──┤  Oracle Price Bot         │ │
│  │  - Price feeds       │ │      │  │  - Fetches prices         │ │
│  │  - Price updates     │ │      │  │  - Submits to oracle      │ │
│  │  - Staleness checks  │ │      │  │  - Price aggregation      │ │
│  └──────────────────────┘ │      │  └───────────────────────────┘ │
└────────────────────────────┘      └─────────────────────────────────┘
             │                                     │
             │                                     │
             └─────────────────┬───────────────────┘
                               │
                               ▼
                    ┌────────────────────┐
                    │  Stellar Network   │
                    │  (Soroban RPC)     │
                    │  - Testnet/Mainnet │
                    └────────────────────┘
```

## Component Integration Details

### 1. Smart Contracts Layer

#### Contract Addresses Configuration

**File**: `contracts/deployed-addresses.json`

```json
{
  "network": "testnet",
  "contracts": {
    "rwa_vault": "CVAULT_CONTRACT_ID_HERE",
    "lending_pool": "CLENDING_POOL_CONTRACT_ID_HERE",
    "oracle": "CORACLE_CONTRACT_ID_HERE",
    "strwa_token": "CSTRWA_TOKEN_CONTRACT_ID_HERE",
    "usdc_token": "CUSDC_TOKEN_CONTRACT_ID_HERE"
  },
  "deployed_at": "2025-01-09T12:00:00Z",
  "network_passphrase": "Test SDF Network ; September 2015",
  "rpc_url": "https://soroban-testnet.stellar.org:443"
}
```

#### Contract Events

All contracts emit events that bots and frontend can listen to:

```rust
// RWA Vault Events
env.events().publish((
    Symbol::new(&env, "deposit_made"),
    depositor,
    amount,
));

env.events().publish((
    Symbol::new(&env, "yield_funded"),
    depositor,
    yield_amount,
));

env.events().publish((
    Symbol::new(&env, "withdrawal_made"),
    withdrawer,
    amount,
));

// Lending Pool Events
env.events().publish((
    Symbol::new(&env, "loan_originated"),
    borrower,
    collateral_amount,
    borrowed_amount,
));

env.events().publish((
    Symbol::new(&env, "loan_repaid"),
    borrower,
    repayment_amount,
    remaining_debt,
));

env.events().publish((
    Symbol::new(&env, "warning_issued"),
    borrower,
    warnings_issued,
    penalty,
));

env.events().publish((
    Symbol::new(&env, "loan_liquidated"),
    borrower,
    liquidator,
    collateral_seized,
));

// Oracle Events
env.events().publish((
    Symbol::new(&env, "price_updated"),
    token_address,
    new_price,
    timestamp,
));
```

### 2. Backend Bots Layer

#### Shared Configuration

**File**: `bots/shared/config.ts`

```typescript
import { readFileSync } from "fs";
import { join } from "path";

export interface DeployedContracts {
  network: string;
  contracts: {
    rwa_vault: string;
    lending_pool: string;
    oracle: string;
    strwa_token: string;
    usdc_token: string;
  };
  network_passphrase: string;
  rpc_url: string;
}

export class SharedConfig {
  private static instance: SharedConfig;
  public contracts: DeployedContracts;

  private constructor() {
    // Load from deployed-addresses.json
    const contractsPath = join(
      __dirname,
      "../../../contracts/deployed-addresses.json",
    );
    this.contracts = JSON.parse(readFileSync(contractsPath, "utf-8"));
  }

  static getInstance(): SharedConfig {
    if (!SharedConfig.instance) {
      SharedConfig.instance = new SharedConfig();
    }
    return SharedConfig.instance;
  }

  getContractId(contractName: keyof DeployedContracts["contracts"]): string {
    return this.contracts.contracts[contractName];
  }

  getNetworkPassphrase(): string {
    return this.contracts.network_passphrase;
  }

  getRpcUrl(): string {
    return this.contracts.rpc_url;
  }
}
```

#### Shared Borrower Registry

**File**: `bots/shared/borrowers.json`

```json
{
  "borrowers": ["GABC123...", "GDEF456...", "GHIJ789..."],
  "last_updated": "2025-01-09T12:00:00Z"
}
```

**File**: `bots/shared/borrower-registry.ts`

```typescript
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export interface BorrowerRegistryData {
  borrowers: string[];
  last_updated: string;
}

export class BorrowerRegistry {
  private static REGISTRY_PATH = join(__dirname, "./borrowers.json");
  private data: BorrowerRegistryData;

  constructor() {
    this.load();
  }

  load(): void {
    try {
      this.data = JSON.parse(
        readFileSync(BorrowerRegistry.REGISTRY_PATH, "utf-8"),
      );
    } catch (error) {
      // Initialize empty registry
      this.data = {
        borrowers: [],
        last_updated: new Date().toISOString(),
      };
      this.save();
    }
  }

  save(): void {
    this.data.last_updated = new Date().toISOString();
    writeFileSync(
      BorrowerRegistry.REGISTRY_PATH,
      JSON.stringify(this.data, null, 2),
    );
  }

  addBorrower(address: string): void {
    if (!this.data.borrowers.includes(address)) {
      this.data.borrowers.push(address);
      this.save();
    }
  }

  removeBorrower(address: string): void {
    this.data.borrowers = this.data.borrowers.filter((b) => b !== address);
    this.save();
  }

  getBorrowers(): string[] {
    return [...this.data.borrowers];
  }

  hasBorrower(address: string): boolean {
    return this.data.borrowers.includes(address);
  }
}
```

#### Bot Orchestrator

**File**: `bots/orchestrator/index.ts`

```typescript
import { OraclePriceBot } from "../oracle-price-bot/src/bot";
import { AutoRepayBot } from "../auto-repay-bot/src/bot";
import { LiquidationBot } from "../liquidation-bot/src/bot";
import { SharedConfig } from "../shared/config";

export class BotOrchestrator {
  private oracleBot: OraclePriceBot;
  private autoRepayBot: AutoRepayBot;
  private liquidationBot: LiquidationBot;

  constructor() {
    const config = SharedConfig.getInstance();

    this.oracleBot = new OraclePriceBot({
      network: config.contracts.network,
      rpcUrl: config.getRpcUrl(),
      networkPassphrase: config.getNetworkPassphrase(),
      oracleContractId: config.getContractId("oracle"),
      stRwaTokenAddress: config.getContractId("strwa_token"),
      botSecretKey: process.env.ORACLE_BOT_SECRET_KEY!,
    });

    this.autoRepayBot = new AutoRepayBot({
      network: config.contracts.network,
      rpcUrl: config.getRpcUrl(),
      networkPassphrase: config.getNetworkPassphrase(),
      vaultContractId: config.getContractId("rwa_vault"),
      lendingPoolContractId: config.getContractId("lending_pool"),
      botSecretKey: process.env.AUTO_REPAY_BOT_SECRET_KEY!,
    });

    this.liquidationBot = new LiquidationBot({
      network: config.contracts.network,
      rpcUrl: config.getRpcUrl(),
      networkPassphrase: config.getNetworkPassphrase(),
      lendingPoolContractId: config.getContractId("lending_pool"),
      oracleContractId: config.getContractId("oracle"),
      stRwaTokenAddress: config.getContractId("strwa_token"),
      botSecretKey: process.env.LIQUIDATION_BOT_SECRET_KEY!,
    });
  }

  async startAll(): Promise<void> {
    console.log("🚀 Starting all bots...\n");

    // Start Oracle Bot first (other bots depend on prices)
    await this.oracleBot.start();
    console.log("✅ Oracle Price Bot started\n");

    // Wait 10 seconds for first price update
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Start Auto-Repay Bot
    await this.autoRepayBot.start();
    console.log("✅ Auto-Repay Bot started\n");

    // Start Liquidation Bot
    await this.liquidationBot.start();
    console.log("✅ Liquidation Bot started\n");

    console.log("🎉 All bots running successfully!\n");
    console.log("Admin APIs:");
    console.log("  - Auto-Repay:   http://localhost:3001");
    console.log("  - Liquidation:  http://localhost:3002");
  }

  async stopAll(): Promise<void> {
    console.log("🛑 Stopping all bots...\n");

    await this.liquidationBot.stop();
    console.log("✅ Liquidation Bot stopped\n");

    await this.autoRepayBot.stop();
    console.log("✅ Auto-Repay Bot stopped\n");

    await this.oracleBot.stop();
    console.log("✅ Oracle Price Bot stopped\n");

    console.log("👋 All bots stopped");
  }

  getMetrics(): object {
    return {
      oracle: this.oracleBot.metrics.getMetrics(),
      autoRepay: this.autoRepayBot.metrics.getMetrics(),
      liquidation: this.liquidationBot.metrics.getMetrics(),
    };
  }
}

// Main entry point
if (require.main === module) {
  const orchestrator = new BotOrchestrator();

  orchestrator.startAll().catch((error) => {
    console.error("Failed to start bots:", error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n\nReceived SIGINT, shutting down gracefully...\n");
    await orchestrator.stopAll();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\n\nReceived SIGTERM, shutting down gracefully...\n");
    await orchestrator.stopAll();
    process.exit(0);
  });
}
```

### 3. Frontend Integration

#### Contract Client SDK

**File**: `frontend/src/lib/stellar/contracts.ts`

```typescript
import * as StellarSdk from "@stellar/stellar-sdk";
import deployedAddresses from "../../../../contracts/deployed-addresses.json";

export class ContractClients {
  private server: StellarSdk.SorobanRpc.Server;
  private networkPassphrase: string;

  constructor() {
    this.server = new StellarSdk.SorobanRpc.Server(deployedAddresses.rpc_url);
    this.networkPassphrase = deployedAddresses.network_passphrase;
  }

  // RWA Vault Client
  async vaultDeposit(
    userKeypair: StellarSdk.Keypair,
    amount: bigint,
  ): Promise<string> {
    const contract = new StellarSdk.Contract(
      deployedAddresses.contracts.rwa_vault,
    );

    const account = await this.server.getAccount(userKeypair.publicKey());

    const args = [
      StellarSdk.nativeToScVal(userKeypair.publicKey(), { type: "address" }),
      StellarSdk.nativeToScVal(amount, { type: "i128" }),
    ];

    let transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call("deposit", ...args))
      .setTimeout(30)
      .build();

    // Simulate
    const simulated = await this.server.simulateTransaction(transaction);

    if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      throw new Error("Simulation failed");
    }

    // Assemble
    transaction = StellarSdk.SorobanRpc.assembleTransaction(
      transaction,
      simulated,
    ).build();

    // Sign
    transaction.sign(userKeypair);

    // Submit
    const response = await this.server.sendTransaction(transaction);

    return response.hash;
  }

  async vaultWithdraw(
    userKeypair: StellarSdk.Keypair,
    amount: bigint,
  ): Promise<string> {
    const contract = new StellarSdk.Contract(
      deployedAddresses.contracts.rwa_vault,
    );

    const account = await this.server.getAccount(userKeypair.publicKey());

    const args = [
      StellarSdk.nativeToScVal(userKeypair.publicKey(), { type: "address" }),
      StellarSdk.nativeToScVal(amount, { type: "i128" }),
    ];

    let transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call("withdraw", ...args))
      .setTimeout(30)
      .build();

    const simulated = await this.server.simulateTransaction(transaction);

    if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      throw new Error("Simulation failed");
    }

    transaction = StellarSdk.SorobanRpc.assembleTransaction(
      transaction,
      simulated,
    ).build();

    transaction.sign(userKeypair);

    const response = await this.server.sendTransaction(transaction);

    return response.hash;
  }

  async vaultGetBalance(userAddress: string): Promise<bigint> {
    const contract = new StellarSdk.Contract(
      deployedAddresses.contracts.rwa_vault,
    );

    const account = await this.server.getAccount(userAddress);

    const args = [StellarSdk.nativeToScVal(userAddress, { type: "address" })];

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call("get_balance", ...args))
      .setTimeout(30)
      .build();

    const simulated = await this.server.simulateTransaction(transaction);

    if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      throw new Error("Failed to get balance");
    }

    // Parse result
    const result = StellarSdk.scValToNative(simulated.result!.retval);
    return BigInt(result);
  }

  // Lending Pool Client
  async lendingPoolBorrow(
    userKeypair: StellarSdk.Keypair,
    collateralAmount: bigint,
    borrowAmount: bigint,
  ): Promise<string> {
    const contract = new StellarSdk.Contract(
      deployedAddresses.contracts.lending_pool,
    );

    const account = await this.server.getAccount(userKeypair.publicKey());

    const args = [
      StellarSdk.nativeToScVal(userKeypair.publicKey(), { type: "address" }),
      StellarSdk.nativeToScVal(collateralAmount, { type: "i128" }),
      StellarSdk.nativeToScVal(borrowAmount, { type: "i128" }),
    ];

    let transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call("borrow", ...args))
      .setTimeout(30)
      .build();

    const simulated = await this.server.simulateTransaction(transaction);

    if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      throw new Error("Simulation failed");
    }

    transaction = StellarSdk.SorobanRpc.assembleTransaction(
      transaction,
      simulated,
    ).build();

    transaction.sign(userKeypair);

    const response = await this.server.sendTransaction(transaction);

    return response.hash;
  }

  async lendingPoolRepay(
    userKeypair: StellarSdk.Keypair,
    repayAmount: bigint,
  ): Promise<string> {
    const contract = new StellarSdk.Contract(
      deployedAddresses.contracts.lending_pool,
    );

    const account = await this.server.getAccount(userKeypair.publicKey());

    const args = [
      StellarSdk.nativeToScVal(userKeypair.publicKey(), { type: "address" }),
      StellarSdk.nativeToScVal(repayAmount, { type: "i128" }),
    ];

    let transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call("repay_loan", ...args))
      .setTimeout(30)
      .build();

    const simulated = await this.server.simulateTransaction(transaction);

    if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      throw new Error("Simulation failed");
    }

    transaction = StellarSdk.SorobanRpc.assembleTransaction(
      transaction,
      simulated,
    ).build();

    transaction.sign(userKeypair);

    const response = await this.server.sendTransaction(transaction);

    return response.hash;
  }

  async lendingPoolGetLoan(borrowerAddress: string): Promise<any> {
    const contract = new StellarSdk.Contract(
      deployedAddresses.contracts.lending_pool,
    );

    const account = await this.server.getAccount(borrowerAddress);

    const args = [
      StellarSdk.nativeToScVal(borrowerAddress, { type: "address" }),
    ];

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call("get_loan", ...args))
      .setTimeout(30)
      .build();

    const simulated = await this.server.simulateTransaction(transaction);

    if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      return null; // No loan
    }

    const result = StellarSdk.scValToNative(simulated.result!.retval);
    return result;
  }

  // Oracle Client
  async oracleGetPrice(tokenAddress: string): Promise<[bigint, number]> {
    const contract = new StellarSdk.Contract(
      deployedAddresses.contracts.oracle,
    );

    // Use any account for read-only operations
    const account = await this.server.getAccount(tokenAddress);

    const args = [StellarSdk.nativeToScVal(tokenAddress, { type: "address" })];

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call("get_price", ...args))
      .setTimeout(30)
      .build();

    const simulated = await this.server.simulateTransaction(transaction);

    if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      throw new Error("Failed to get price");
    }

    const result = StellarSdk.scValToNative(simulated.result!.retval);
    return [BigInt(result.price), result.timestamp];
  }
}
```

#### Real-time Updates with Event Polling

**File**: `frontend/src/lib/stellar/event-listener.ts`

```typescript
import * as StellarSdk from "@stellar/stellar-sdk";
import deployedAddresses from "../../../../contracts/deployed-addresses.json";

export type EventCallback = (event: any) => void;

export class EventListener {
  private server: StellarSdk.SorobanRpc.Server;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastLedger: number = 0;

  constructor() {
    this.server = new StellarSdk.SorobanRpc.Server(deployedAddresses.rpc_url);
  }

  async start(
    contractId: string,
    eventTypes: string[],
    callback: EventCallback,
  ): Promise<void> {
    // Get current ledger
    const latestLedger = await this.server.getLatestLedger();
    this.lastLedger = latestLedger.sequence;

    // Poll every 5 seconds
    this.pollingInterval = setInterval(async () => {
      await this.pollEvents(contractId, eventTypes, callback);
    }, 5000);
  }

  private async pollEvents(
    contractId: string,
    eventTypes: string[],
    callback: EventCallback,
  ): Promise<void> {
    try {
      const latestLedger = await this.server.getLatestLedger();
      const currentLedger = latestLedger.sequence;

      if (currentLedger === this.lastLedger) {
        return; // No new ledgers
      }

      // Get events for this contract
      const events = await this.server.getEvents({
        filters: [
          {
            type: "contract",
            contractIds: [contractId],
          },
        ],
        startLedger: this.lastLedger + 1,
      });

      for (const event of events.events) {
        // Parse event
        const parsedEvent = this.parseEvent(event);

        // Check if it matches requested types
        if (eventTypes.includes(parsedEvent.type)) {
          callback(parsedEvent);
        }
      }

      this.lastLedger = currentLedger;
    } catch (error) {
      console.error("Failed to poll events:", error);
    }
  }

  private parseEvent(event: any): any {
    // Extract event type and data
    const topic = event.topic;
    const value = StellarSdk.scValToNative(event.value);

    return {
      type: topic[0],
      data: value,
      ledger: event.ledger,
      txHash: event.txHash,
    };
  }

  stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}
```

#### Health Factor Display Component

**File**: `frontend/src/components/HealthFactorDisplay.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { ContractClients } from '../lib/stellar/contracts';

interface HealthFactorProps {
  borrowerAddress: string;
}

export const HealthFactorDisplay: React.FC<HealthFactorProps> = ({
  borrowerAddress,
}) => {
  const [healthFactor, setHealthFactor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const contractClients = new ContractClients();

  useEffect(() => {
    const calculateHealth = async () => {
      try {
        // Get loan
        const loan = await contractClients.lendingPoolGetLoan(borrowerAddress);

        if (!loan) {
          setHealthFactor(null);
          setLoading(false);
          return;
        }

        // Get price
        const [price] = await contractClients.oracleGetPrice(
          loan.strwa_token_address
        );

        // Calculate health
        const collateralValue =
          (BigInt(loan.collateral_amount) * price) / BigInt(10 ** 18);
        const totalDebt = BigInt(loan.outstanding_debt) + BigInt(loan.penalties);

        const health =
          totalDebt > 0n
            ? Number((collateralValue * 100n) / totalDebt) / 100
            : Infinity;

        setHealthFactor(health);
        setLoading(false);
      } catch (error) {
        console.error('Failed to calculate health:', error);
        setLoading(false);
      }
    };

    calculateHealth();

    // Refresh every 30 seconds
    const interval = setInterval(calculateHealth, 30000);

    return () => clearInterval(interval);
  }, [borrowerAddress]);

  if (loading) {
    return <div>Loading health factor...</div>;
  }

  if (healthFactor === null) {
    return <div>No active loan</div>;
  }

  const getHealthColor = (health: number): string => {
    if (health >= 1.5) return 'green';
    if (health >= 1.2) return 'yellow';
    if (health >= 1.1) return 'orange';
    return 'red';
  };

  const getHealthStatus = (health: number): string => {
    if (health >= 1.5) return 'Healthy';
    if (health >= 1.2) return 'Warning Level 1';
    if (health >= 1.1) return 'Warning Level 2';
    return 'Critical - Liquidation Risk';
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc' }}>
      <h3>Loan Health Factor</h3>
      <div
        style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: getHealthColor(healthFactor),
        }}
      >
        {healthFactor === Infinity ? '∞' : healthFactor.toFixed(2)}
      </div>
      <div style={{ fontSize: '18px', marginTop: '10px' }}>
        {getHealthStatus(healthFactor)}
      </div>
      {healthFactor < 1.5 && healthFactor !== Infinity && (
        <div style={{ marginTop: '20px', color: 'red' }}>
          ⚠️ Action needed: Add collateral or repay debt
        </div>
      )}
    </div>
  );
};
```

## Data Flow Examples

### Example 1: Loan Origination Flow

```
1. USER (Frontend)
   ↓ Deposits stRWA collateral

2. VAULT CONTRACT
   ↓ Marks user as borrower

3. USER (Frontend)
   ↓ Calls borrow() on Lending Pool

4. LENDING POOL CONTRACT
   ↓ Gets price from Oracle

5. ORACLE CONTRACT
   ↓ Returns current stRWA price

6. LENDING POOL CONTRACT
   ↓ Validates LTV (max 140%)
   ↓ Creates loan
   ↓ Emits loan_originated event

7. FRONTEND (Event Listener)
   ↓ Receives event
   ↓ Updates UI

8. AUTO-REPAY BOT (Event Monitor)
   ↓ Detects new borrower
   ↓ Adds to borrowers.json

9. LIQUIDATION BOT (Borrower Registry)
   ↓ Loads updated borrowers.json
   ↓ Starts monitoring new loan
```

### Example 2: Auto-Repayment Flow

```
1. VAULT CONTRACT
   ↓ User's stRWA earns yield
   ↓ Yield credited to user
   ↓ Emits yield_funded event

2. AUTO-REPAY BOT (Event Monitor)
   ↓ Detects yield_funded event
   ↓ Checks if user has loan

3. LENDING POOL CONTRACT
   ↓ Returns loan details

4. AUTO-REPAY BOT (Eligibility Checker)
   ↓ Calculates repayment amount
   ↓ Determines eligible

5. AUTO-REPAY BOT (Executor)
   ↓ Calls repay_loan() on behalf of user

6. LENDING POOL CONTRACT
   ↓ Reduces outstanding debt
   ↓ Emits loan_repaid event

7. FRONTEND (Event Listener)
   ↓ Receives event
   ↓ Updates loan display
   ↓ Shows "Auto-repayment processed" notification
```

### Example 3: Liquidation Flow

```
1. ORACLE PRICE BOT
   ↓ Fetches new stRWA price (price dropped)
   ↓ Submits to Oracle Contract

2. ORACLE CONTRACT
   ↓ Updates price
   ↓ Emits price_updated event

3. LIQUIDATION BOT (Monitoring Loop)
   ↓ Gets updated price
   ↓ Recalculates all loan healths

4. LIQUIDATION BOT (Health Calculator)
   ↓ Finds loan with health = 1.05
   ↓ Marks as liquidatable

5. LIQUIDATION BOT (Economics Calculator)
   ↓ Calculates reward (10% of collateral)
   ↓ Checks profitability
   ↓ Approves liquidation

6. LIQUIDATION BOT (Executor)
   ↓ Calls liquidate_loan()

7. LENDING POOL CONTRACT
   ↓ Seizes collateral
   ↓ Pays liquidator reward
   ↓ Removes loan
   ↓ Emits loan_liquidated event

8. FRONTEND (Event Listener)
   ↓ Receives event
   ↓ Shows "Loan liquidated" notification to user
   ↓ Removes loan from UI

9. LIQUIDATION BOT (Borrower Registry)
   ↓ Removes borrower from borrowers.json
```

## Environment Setup

### Root Configuration File

**File**: `.env.example`

```bash
# Network Configuration
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org:443
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Bot Secret Keys (different keys for each bot)
ORACLE_BOT_SECRET_KEY=S...
AUTO_REPAY_BOT_SECRET_KEY=S...
LIQUIDATION_BOT_SECRET_KEY=S...

# Frontend Configuration
REACT_APP_STELLAR_NETWORK=testnet
REACT_APP_STELLAR_RPC_URL=https://soroban-testnet.stellar.org:443

# Optional: Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

## Deployment Checklist

### 1. Deploy Contracts

```bash
cd contracts
# Deploy all contracts
./deploy.sh testnet

# Save addresses to deployed-addresses.json
```

### 2. Start Backend Bots

```bash
cd bots

# Install dependencies
npm install

# Start all bots via orchestrator
npm run start:all

# Or start individually:
# npm run start:oracle
# npm run start:auto-repay
# npm run start:liquidation
```

### 3. Start Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy contract addresses
cp ../contracts/deployed-addresses.json src/lib/stellar/

# Start development server
npm run dev
```

## Monitoring & Observability

### Unified Metrics Endpoint

**File**: `bots/orchestrator/metrics-api.ts`

```typescript
import express from "express";
import { BotOrchestrator } from "./index";

const app = express();
const orchestrator = new BotOrchestrator();

app.get("/health", (req, res) => {
  res.json({ status: "ok", bots: "orchestrator" });
});

app.get("/metrics/all", (req, res) => {
  const metrics = orchestrator.getMetrics();
  res.json(metrics);
});

app.get("/metrics/oracle", (req, res) => {
  const metrics = orchestrator.getMetrics();
  res.json(metrics.oracle);
});

app.get("/metrics/auto-repay", (req, res) => {
  const metrics = orchestrator.getMetrics();
  res.json(metrics.autoRepay);
});

app.get("/metrics/liquidation", (req, res) => {
  const metrics = orchestrator.getMetrics();
  res.json(metrics.liquidation);
});

app.listen(9090, () => {
  console.log("📊 Metrics API running on port 9090");
});
```

### Frontend Monitoring Dashboard

**File**: `frontend/src/pages/AdminDashboard.tsx`

```typescript
import React, { useEffect, useState } from 'react';

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      const response = await fetch('http://localhost:9090/metrics/all');
      const data = await response.json();
      setMetrics(data);
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Refresh every 5s

    return () => clearInterval(interval);
  }, []);

  if (!metrics) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Orion RWA Lending - System Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        {/* Oracle Bot */}
        <div style={{ border: '1px solid #ccc', padding: '20px' }}>
          <h2>🔮 Oracle Price Bot</h2>
          <p>Updates: {metrics.oracle.totalUpdates}</p>
          <p>Success Rate: {(metrics.oracle.successRate * 100).toFixed(1)}%</p>
          <p>Last Update: {new Date(metrics.oracle.lastUpdate * 1000).toLocaleString()}</p>
        </div>

        {/* Auto-Repay Bot */}
        <div style={{ border: '1px solid #ccc', padding: '20px' }}>
          <h2>🔄 Auto-Repay Bot</h2>
          <p>Total Repayments: {metrics.autoRepay.totalRepayments}</p>
          <p>Amount Repaid: {metrics.autoRepay.totalAmountRepaid} USDC</p>
          <p>Active Borrowers: {metrics.autoRepay.activeBorrowers}</p>
        </div>

        {/* Liquidation Bot */}
        <div style={{ border: '1px solid #ccc', padding: '20px' }}>
          <h2>🚨 Liquidation Bot</h2>
          <p>Total Liquidations: {metrics.liquidation.totalLiquidations}</p>
          <p>Warnings Issued: {metrics.liquidation.totalWarningsIssued}</p>
          <p>Total Profit: {metrics.liquidation.totalProfit} USDC</p>
        </div>
      </div>
    </div>
  );
};
```

## Summary

This integration architecture ensures:

✅ **Shared Configuration** - All components use `deployed-addresses.json`
✅ **Shared Data** - Bots share `borrowers.json` registry
✅ **Real-time Updates** - Event listening keeps frontend synchronized
✅ **Unified Monitoring** - Metrics API aggregates all bot statistics
✅ **Easy Deployment** - Bot orchestrator manages all bots together
✅ **Type Safety** - TypeScript across bots and frontend
✅ **Hackathon Ready** - Simple, working integration

**Key Integration Points**:

1. Contract addresses centralized in `deployed-addresses.json`
2. Borrower registry shared between Auto-Repay and Liquidation bots
3. Frontend uses event polling for real-time updates
4. Bot orchestrator starts/stops all bots together
5. Unified metrics endpoint for monitoring
6. Consistent error handling and logging across all components

This creates a fully integrated, production-ready (at hackathon level) RWA lending system on Stellar! 🚀
