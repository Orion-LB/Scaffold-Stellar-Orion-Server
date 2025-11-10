# Orion Protocol — Smart Contract Integration Guide

Complete integration guide for connecting your Orion Protocol frontend to the deployed Stellar smart contracts.

---

## 🎯 Overview

This guide maps your frontend architecture (Landing → Dashboard → Stake/Borrow/Profile) to the deployed smart contracts with exact function calls, data flows, and wallet integration patterns.

**Your Frontend Stack:**

- Landing page with "Launch App"
- Dashboard with sidebar navigation (Stake, Borrow, Profile)
- Wallet integration (Freighter)
- Real-time health factor visualization
- Auto-repay yield routing
- Admin panel for liquidity management

**Deployed Contracts:**

- ✅ MockRWA (permissioned RWA token with whitelist)
- ✅ stRWA (receipt token for staked RWA)
- ✅ RWA Vault (custody + yield distribution)
- ✅ USDC Mock (stable coin)
- ✅ Oracle (price feeds)
- ✅ Lending Pool (collateralized lending + auto-repay)

---

## 📋 Quick Setup (5 Minutes)

### Step 1: Deploy Contracts

```bash
# Generate identity and fund testnet account
stellar keys generate admin --network testnet
stellar keys fund admin --network testnet

# Deploy all contracts
./scripts/deploy.sh testnet

# Initialize contracts
./scripts/initialize.sh testnet
```

Contract addresses saved to: `.soroban/contract-addresses-testnet.json`

### Step 2: Install Frontend SDK

```bash
# In your frontend project
npm install @stellar/stellar-sdk

# Optional: Use our TypeScript SDK
cd frontend-sdk
npm install && npm run build
cd ../your-frontend
npm install ../frontend-sdk
```

### Step 3: Configure Frontend

```typescript
// src/config/contracts.ts
import addresses from "../../.soroban/contract-addresses-testnet.json";

export const CONTRACTS = addresses.contracts;
// {
//   usdc: "CAAAA...",
//   rwaToken: "CBBBB...",
//   stRwaToken: "CCCCC...",
//   vault: "CDDDD...",
//   oracle: "CEEEE...",
//   lendingPool: "CFFFF..."
// }

export const NETWORK_CONFIG = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    rpcUrl: "https://soroban-testnet.stellar.org:443",
  },
};
```

---

## 🔌 Page-by-Page Integration

### 1. Landing Page (`/`)

**Purpose:** Marketing entry point

**Smart Contract Interaction:** None

**Implementation:**

```typescript
// No contract calls needed
// Just route to /dashboard on "Launch App" click
<button onClick={() => router.push('/dashboard')}>
  Launch App
</button>
```

---

### 2. Wallet Connection (Modal/Header)

**Purpose:** Connect Freighter wallet and check whitelist status

**Smart Contract Reads:**

- `MockRWA.allowed(userAddress)` — Check if user is whitelisted

**Implementation:**

```typescript
// src/hooks/useWallet.ts
import { useState } from "react";
import * as StellarSdk from "@stellar/stellar-sdk";
import { CONTRACTS, NETWORK_CONFIG } from "@/config/contracts";

export function useWallet() {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isWhitelisted, setIsWhitelisted] = useState(false);

  async function connect() {
    if (!window.freighter) {
      throw new Error("Please install Freighter wallet");
    }

    // Get public key from Freighter
    const key = await window.freighter.getPublicKey();
    setPublicKey(key);
    setConnected(true);

    // Check whitelist status
    await checkWhitelist(key);
  }

  async function checkWhitelist(address: string) {
    const server = new StellarSdk.SorobanRpc.Server(
      NETWORK_CONFIG.testnet.rpcUrl,
    );

    try {
      const contract = new StellarSdk.Contract(CONTRACTS.rwaToken);
      const account = await server.getAccount(address);

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_CONFIG.testnet.networkPassphrase,
      })
        .addOperation(
          contract.call(
            "allowed",
            StellarSdk.nativeToScVal(address, "address"),
          ),
        )
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(tx);

      if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
        const allowed = simulated.result?.retval;
        setIsWhitelisted(!!allowed);
      }
    } catch (error) {
      console.error("Whitelist check failed:", error);
      setIsWhitelisted(false);
    }
  }

  async function signTransaction(tx: StellarSdk.Transaction) {
    if (!window.freighter) {
      throw new Error("Freighter not available");
    }

    const signedTxXDR = await window.freighter.signTransaction(tx.toXDR(), {
      network: "testnet",
    });

    return StellarSdk.TransactionBuilder.fromXDR(
      signedTxXDR,
      NETWORK_CONFIG.testnet.networkPassphrase,
    );
  }

  return {
    connected,
    publicKey,
    isWhitelisted,
    connect,
    signTransaction,
  };
}
```

**UI Toast Notifications:**

```typescript
// On successful connection
toast.success("Wallet connected");

// While checking whitelist
toast.info("Checking whitelist status...");

// If not whitelisted
if (!isWhitelisted) {
  toast.error("Wallet not whitelisted. Contact your partner institution.");
  // Disable Stake/Borrow sections
}

// If whitelisted
toast.success("✅ Whitelisted - Full access enabled");
```

**UI Gating:**

```typescript
// Disable actions if not whitelisted
<StakeButton disabled={!isWhitelisted}>
  {isWhitelisted ? 'Stake' : 'Wallet Not Whitelisted'}
</StakeButton>
```

---

### 3. Dashboard (`/dashboard`)

**Purpose:** Portfolio overview and risk metrics

**Smart Contract Reads:**

```typescript
// User balances
MockRWA.balance(userAddress); // RWA balance
stRWA.balance(userAddress); // stRWA balance
USDC.balance(userAddress); // USDC balance

// Vault stats
Vault.get_stake_info(userAddress); // User's staked amount
Vault.get_claimable_yield(userAddress); // Claimable yield

// Loan status
LendingPool.get_loan(userAddress); // Loan details
LendingPool.get_lp_deposit(userAddress); // LP deposits

// Oracle price
Oracle.get_price(stRwaAddress); // stRWA price feed
```

**Implementation:**

```typescript
// src/hooks/useDashboard.ts
import { useState, useEffect } from "react";
import * as StellarSdk from "@stellar/stellar-sdk";
import { CONTRACTS, NETWORK_CONFIG } from "@/config/contracts";

interface DashboardData {
  rwaBalance: bigint;
  stRwaBalance: bigint;
  usdcBalance: bigint;
  claimableYield: bigint;
  loanInfo: LoanInfo | null;
  healthFactor: number;
  netAPY: number;
  positionValue: bigint;
}

export function useDashboard(userAddress: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchDashboard() {
    setLoading(true);
    const server = new StellarSdk.SorobanRpc.Server(
      NETWORK_CONFIG.testnet.rpcUrl,
    );

    try {
      // Fetch all balances in parallel
      const [rwa, stRwa, usdc, yield, loan, price] = await Promise.all([
        getTokenBalance(server, CONTRACTS.rwaToken, userAddress),
        getTokenBalance(server, CONTRACTS.stRwaToken, userAddress),
        getTokenBalance(server, CONTRACTS.usdc, userAddress),
        getClaimableYield(server, userAddress),
        getLoan(server, userAddress),
        getStRwaPrice(server),
      ]);

      // Calculate derived metrics
      const collateralValue = (stRwa * price) / BigInt(1_000000);
      const debt = loan?.outstandingDebt || BigInt(0);
      const healthFactor =
        debt > 0 ? Number((collateralValue * BigInt(100)) / debt) / 100 : 999;

      setData({
        rwaBalance: rwa,
        stRwaBalance: stRwa,
        usdcBalance: usdc,
        claimableYield: yield,
        loanInfo: loan,
        healthFactor,
        netAPY: 7.5, // Calculate from actual APY
        positionValue: collateralValue + usdc,
      });
    } catch (error) {
      console.error("Dashboard fetch failed:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userAddress) {
      fetchDashboard();
      // Refresh every 10 seconds
      const interval = setInterval(fetchDashboard, 10000);
      return () => clearInterval(interval);
    }
  }, [userAddress]);

  return { data, loading, refetch: fetchDashboard };
}

// Helper: Get token balance
async function getTokenBalance(
  server: StellarSdk.SorobanRpc.Server,
  tokenAddress: string,
  userAddress: string,
): Promise<bigint> {
  // Implementation similar to wallet hook
  // Returns balance from token.balance(userAddress)
}

// Helper: Get claimable yield
async function getClaimableYield(
  server: StellarSdk.SorobanRpc.Server,
  userAddress: string,
): Promise<bigint> {
  // Call Vault.get_claimable_yield(userAddress)
}

// Helper: Get loan info
async function getLoan(
  server: StellarSdk.SorobanRpc.Server,
  userAddress: string,
): Promise<LoanInfo | null> {
  // Call LendingPool.get_loan(userAddress)
}

// Helper: Get stRWA price
async function getStRwaPrice(
  server: StellarSdk.SorobanRpc.Server,
): Promise<bigint> {
  // Call Oracle.get_price(stRwaAddress)
  // Returns price with 6 decimals (1_000000 = $1)
}
```

**Dashboard UI Components:**

```typescript
// Portfolio Overview Card
<Card>
  <h3>Total Position Value</h3>
  <h2>${formatUSD(data.positionValue)}</h2>

  <div className="balances">
    <div>RWA: {formatToken(data.rwaBalance, 18)}</div>
    <div>stRWA: {formatToken(data.stRwaBalance, 18)}</div>
    <div>USDC: {formatToken(data.usdcBalance, 6)}</div>
  </div>
</Card>

// Health Factor Gauge
<HealthGauge value={data.healthFactor}>
  <div className={`health-bar ${getHealthColor(data.healthFactor)}`}>
    <span>Health Factor: {data.healthFactor.toFixed(2)}</span>
  </div>
</HealthGauge>

// Helper
function getHealthColor(health: number) {
  if (health >= 1.5) return 'green';
  if (health >= 1.2) return 'yellow';
  return 'red';
}
```

---

### 4. Stake Section (`/app/stake` or Dashboard Sidebar → Stake)

**Purpose:** Stake RWA → receive stRWA + manage yield

**Smart Contract Writes:**

```typescript
// 1. Approve RWA tokens
MockRWA.approve(vaultAddress, amount, expirationLedger);

// 2. Stake RWA
Vault.stake(userAddress, amount);

// 3. Unstake stRWA
Vault.unstake(userAddress, amount);

// 4. Claim yield
Vault.claim_yield(userAddress);
```

**Smart Contract Reads:**

```typescript
Vault.get_claimable_yield(userAddress);
MockRWA.balance(userAddress);
stRWA.balance(userAddress);
```

**Implementation:**

```typescript
// src/hooks/useVault.ts
import { useState } from "react";
import * as StellarSdk from "@stellar/stellar-sdk";
import { CONTRACTS, NETWORK_CONFIG } from "@/config/contracts";

export function useVault(userAddress: string, signFn) {
  const [loading, setLoading] = useState(false);

  async function stake(amount: bigint) {
    setLoading(true);
    const server = new StellarSdk.SorobanRpc.Server(
      NETWORK_CONFIG.testnet.rpcUrl,
    );

    try {
      // Step 1: Approve RWA tokens
      toast.info("Approving RWA tokens...");

      const approveTx = await buildTransaction(
        server,
        userAddress,
        CONTRACTS.rwaToken,
        "approve",
        [
          StellarSdk.nativeToScVal(userAddress, "address"),
          StellarSdk.nativeToScVal(CONTRACTS.vault, "address"),
          StellarSdk.nativeToScVal(amount, "i128"),
          StellarSdk.nativeToScVal(1000000, "u32"), // expiration ledger
        ],
      );

      const signedApproveTx = await signFn(approveTx);
      await submitTransaction(server, signedApproveTx);

      toast.success("✅ RWA tokens approved");

      // Step 2: Stake
      toast.info("Staking RWA...");

      const stakeTx = await buildTransaction(
        server,
        userAddress,
        CONTRACTS.vault,
        "stake",
        [
          StellarSdk.nativeToScVal(userAddress, "address"),
          StellarSdk.nativeToScVal(amount, "i128"),
        ],
      );

      const signedStakeTx = await signFn(stakeTx);
      const result = await submitTransaction(server, signedStakeTx);

      toast.success("✅ stRWA minted successfully");
      return result;
    } catch (error: any) {
      toast.error(`Stake failed: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function unstake(amount: bigint) {
    setLoading(true);

    try {
      toast.info("Unstaking stRWA...");

      const tx = await buildTransaction(
        server,
        userAddress,
        CONTRACTS.vault,
        "unstake",
        [
          StellarSdk.nativeToScVal(userAddress, "address"),
          StellarSdk.nativeToScVal(amount, "i128"),
        ],
      );

      const signedTx = await signFn(tx);
      await submitTransaction(server, signedTx);

      toast.success("✅ RWA tokens returned");
    } catch (error: any) {
      toast.error(`Unstake failed: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function claimYield() {
    setLoading(true);

    try {
      toast.info("Claiming yield...");

      const tx = await buildTransaction(
        server,
        userAddress,
        CONTRACTS.vault,
        "claim_yield",
        [StellarSdk.nativeToScVal(userAddress, "address")],
      );

      const signedTx = await signFn(tx);
      await submitTransaction(server, signedTx);

      toast.success("✅ Yield claimed");
    } catch (error: any) {
      toast.error(`Claim failed: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  return { stake, unstake, claimYield, loading };
}

// Helper functions
async function buildTransaction(
  server: StellarSdk.SorobanRpc.Server,
  sourceAccount: string,
  contractId: string,
  method: string,
  args: StellarSdk.xdr.ScVal[],
): Promise<StellarSdk.Transaction> {
  const account = await server.getAccount(sourceAccount);
  const contract = new StellarSdk.Contract(contractId);

  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_CONFIG.testnet.networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(transaction);

  if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
    return StellarSdk.SorobanRpc.assembleTransaction(
      transaction,
      simulated,
    ).build();
  } else {
    throw new Error(`Simulation failed: ${simulated.error}`);
  }
}

async function submitTransaction(
  server: StellarSdk.SorobanRpc.Server,
  tx: StellarSdk.Transaction,
) {
  const response = await server.sendTransaction(tx);

  // Poll for result
  let result = await server.getTransaction(response.hash);
  let attempts = 0;

  while (result.status === "NOT_FOUND" && attempts < 20) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    result = await server.getTransaction(response.hash);
    attempts++;
  }

  if (result.status === "SUCCESS") {
    return result;
  } else {
    throw new Error(`Transaction failed: ${result.status}`);
  }
}
```

**Stake UI Component:**

```typescript
// src/components/StakeModal.tsx
export function StakeModal({ userAddress, signTransaction }) {
  const [selectedVault, setSelectedVault] = useState('alexVault');
  const [amount, setAmount] = useState('');
  const { stake, unstake, claimYield, loading } = useVault(
    userAddress,
    signTransaction
  );
  const [rwaBalance, setRwaBalance] = useState(BigInt(0));
  const [claimable, setClaimable] = useState(BigInt(0));

  async function handleStake() {
    const amountBigInt = BigInt(
      Math.floor(parseFloat(amount) * 1e18)
    ); // 18 decimals
    await stake(amountBigInt);
    // Refresh balances after success
  }

  return (
    <div className="stake-modal">
      <h2>Stake RWA</h2>

      {/* Vault Selection */}
      <select
        value={selectedVault}
        onChange={(e) => setSelectedVault(e.target.value)}
      >
        <option value="alexVault">Alex Vault</option>
        <option value="ethVault">ETH Vault</option>
      </select>

      {/* Amount Input */}
      <div className="input-group">
        <label>Deposit Amount (alexRWA)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
        <span className="balance">
          Balance: {formatToken(rwaBalance, 18)}
        </span>
        <button onClick={() => setAmount(formatToken(rwaBalance, 18))}>
          MAX
        </button>
      </div>

      {/* Preview Output */}
      <div className="preview">
        <label>You will receive</label>
        <div className="output">
          {amount || '0.00'} OrionalexRWA
        </div>
      </div>

      {/* Claimable Yield */}
      {claimable > 0 && (
        <div className="yield-section">
          <p>Claimable Yield: {formatToken(claimable, 6)} USDC</p>
          <button onClick={claimYield} disabled={loading}>
            Claim Yield
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="actions">
        <button
          onClick={handleStake}
          disabled={loading || !amount}
          className="btn-primary"
        >
          {loading ? 'Staking...' : 'Stake'}
        </button>

        <button
          onClick={() => {/* show unstake UI */}}
          className="btn-secondary"
        >
          Unstake
        </button>
      </div>

      {/* Get Mock RWA Button (Test Only) */}
      <div className="test-utils">
        <button onClick={mintTestRWA} className="btn-outline">
          Get Mock RWA (Testnet)
        </button>
      </div>
    </div>
  );
}

// Helper: Mint test RWA tokens (for testing)
async function mintTestRWA(userAddress: string, signFn) {
  // Call admin function to mint test tokens
  toast.info('Minting test RWA...');
  // Implementation depends on your MockRWA contract
}
```

---

### 5. Borrow Section (`/app/borrow` or Dashboard Sidebar → Borrow)

**Purpose:** Deposit stRWA collateral, borrow USDC, manage loans

**Smart Contract Writes:**

```typescript
// 1. Approve stRWA as collateral
stRWA.approve(lendingPoolAddress, amount, expirationLedger);

// 2. Originate loan
LendingPool.originate_loan(
  borrower,
  collateralAmount,
  loanAmount,
  durationMonths,
);

// 3. Repay loan
LendingPool.repay_loan(borrower, amount);

// 4. Close loan early
LendingPool.close_loan_early(borrower);
```

**Smart Contract Reads:**

```typescript
LendingPool.get_loan(borrower);
LendingPool.get_available_liquidity();
Oracle.get_price(stRwaAddress);
Vault.get_claimable_yield(borrower); // For auto-repay UI state
```

**Implementation:**

```typescript
// src/hooks/useLending.ts
export function useLending(userAddress: string, signFn) {
  const [loading, setLoading] = useState(false);

  async function borrowUSDC(
    collateralAmount: bigint,
    loanAmount: bigint,
    durationMonths: number,
  ) {
    setLoading(true);

    try {
      // Step 1: Approve stRWA collateral
      toast.info("Approving collateral...");

      const approveTx = await buildTransaction(
        server,
        userAddress,
        CONTRACTS.stRwaToken,
        "approve",
        [
          StellarSdk.nativeToScVal(userAddress, "address"),
          StellarSdk.nativeToScVal(CONTRACTS.lendingPool, "address"),
          StellarSdk.nativeToScVal(collateralAmount, "i128"),
          StellarSdk.nativeToScVal(1000000, "u32"),
        ],
      );

      await submitTransaction(server, await signFn(approveTx));
      toast.success("✅ Collateral approved");

      // Step 2: Originate loan
      toast.info("Originating loan...");

      const borrowTx = await buildTransaction(
        server,
        userAddress,
        CONTRACTS.lendingPool,
        "originate_loan",
        [
          StellarSdk.nativeToScVal(userAddress, "address"),
          StellarSdk.nativeToScVal(collateralAmount, "i128"),
          StellarSdk.nativeToScVal(loanAmount, "i128"),
          StellarSdk.nativeToScVal(durationMonths, "u32"),
        ],
      );

      await submitTransaction(server, await signFn(borrowTx));
      toast.success("✅ USDC borrowed successfully");
    } catch (error: any) {
      toast.error(`Borrow failed: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function repayLoan(amount: bigint) {
    setLoading(true);

    try {
      toast.info("Repaying loan...");

      // First approve USDC
      const approveTx = await buildTransaction(
        server,
        userAddress,
        CONTRACTS.usdc,
        "approve",
        [
          StellarSdk.nativeToScVal(userAddress, "address"),
          StellarSdk.nativeToScVal(CONTRACTS.lendingPool, "address"),
          StellarSdk.nativeToScVal(amount, "i128"),
          StellarSdk.nativeToScVal(1000000, "u32"),
        ],
      );

      await submitTransaction(server, await signFn(approveTx));

      // Then repay
      const repayTx = await buildTransaction(
        server,
        userAddress,
        CONTRACTS.lendingPool,
        "repay_loan",
        [
          StellarSdk.nativeToScVal(userAddress, "address"),
          StellarSdk.nativeToScVal(amount, "i128"),
        ],
      );

      await submitTransaction(server, await signFn(repayTx));
      toast.success("✅ Loan repaid");
    } catch (error: any) {
      toast.error(`Repay failed: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  return { borrowUSDC, repayLoan, loading };
}
```

**Borrow UI Component:**

```typescript
// src/components/BorrowModal.tsx
export function BorrowModal({ userAddress, signTransaction }) {
  const [borrowAsset, setBorrowAsset] = useState('USDC');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [collateralAmount, setCollateralAmount] = useState('');
  const [duration, setDuration] = useState(12); // months
  const [healthFactor, setHealthFactor] = useState(999);
  const [autoRepayEnabled, setAutoRepayEnabled] = useState(false);

  const { borrowUSDC, repayLoan, loading } = useLending(
    userAddress,
    signTransaction
  );

  // Calculate health factor in real-time
  useEffect(() => {
    if (collateralAmount && borrowAmount) {
      const collateral = BigInt(parseFloat(collateralAmount) * 1e18);
      const loan = BigInt(parseFloat(borrowAmount) * 1e6);
      // Assume 1:1 price for demo
      const health = Number(collateral / loan) / 1e12;
      setHealthFactor(health);
    }
  }, [collateralAmount, borrowAmount]);

  async function handleBorrow() {
    const collateral = BigInt(parseFloat(collateralAmount) * 1e18);
    const loan = BigInt(parseFloat(borrowAmount) * 1e6);

    // Check 140% collateral requirement
    if (healthFactor < 1.4) {
      toast.error('Insufficient collateral (need 140% ratio)');
      return;
    }

    await borrowUSDC(collateral, loan, duration);

    // Show auto-repay modal if needed
    if (autoRepayEnabled) {
      showAutoRepayModal();
    }
  }

  return (
    <div className="borrow-modal">
      <h2>Borrow</h2>

      {/* Borrow Asset Selection */}
      <select
        value={borrowAsset}
        onChange={(e) => setBorrowAsset(e.target.value)}
      >
        <option value="USDC">USDC</option>
        <option value="XLM">XLM (Coming Soon)</option>
      </select>

      {/* Borrow Amount */}
      <div className="input-group">
        <label>Borrow Amount</label>
        <input
          type="number"
          value={borrowAmount}
          onChange={(e) => setBorrowAmount(e.target.value)}
          placeholder="0.00"
        />
      </div>

      {/* Loan Duration */}
      <div className="duration-selector">
        <label>Loan Duration</label>
        <input
          type="range"
          min="3"
          max="24"
          value={duration}
          onChange={(e) => setDuration(parseInt(e.target.value))}
        />
        <span>{duration} months</span>
      </div>

      {/* Collateral Section */}
      <div className="collateral-section">
        <h3>Collateral</h3>
        <div className="input-group">
          <label>OrionalexRWA (stRWA)</label>
          <input
            type="number"
            value={collateralAmount}
            onChange={(e) => setCollateralAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Health Factor Display */}
      <div className="health-display">
        <label>Health Factor</label>
        <div className={`health-bar ${getHealthColor(healthFactor)}`}>
          <div
            className="health-fill"
            style={{ width: `${Math.min(healthFactor * 50, 100)}%` }}
          />
        </div>
        <span className="health-value">{healthFactor.toFixed(2)}</span>
        {healthFactor < 1.4 && (
          <p className="warning">⚠️ Need 140% collateral ratio to borrow</p>
        )}
      </div>

      {/* Interest Rate Info */}
      <div className="loan-info">
        <p>Interest Rate: 7% APR (auto-calculated)</p>
        <p>LP Share: 10% of interest</p>
        <p>Compound: Monthly</p>
      </div>

      {/* Auto-Repay Toggle */}
      <div className="auto-repay-toggle">
        <label>
          <input
            type="checkbox"
            checked={autoRepayEnabled}
            onChange={(e) => setAutoRepayEnabled(e.target.checked)}
          />
          Enable Auto-Repay from Yield
        </label>
      </div>

      {/* Borrow Button */}
      <button
        onClick={handleBorrow}
        disabled={loading || healthFactor < 1.4}
        className="btn-primary"
      >
        {loading ? 'Processing...' : 'Borrow'}
      </button>
    </div>
  );
}

function getHealthColor(health: number): string {
  if (health >= 1.5) return 'green';
  if (health >= 1.2) return 'yellow';
  return 'red';
}
```

**Auto-Repay Modal (Pops up on borrow):**

```typescript
// src/components/AutoRepayModal.tsx
export function AutoRepayModal({ userAddress, loanAmount }) {
  const [claimableYield, setClaimableYield] = useState(BigInt(0));

  useEffect(() => {
    // Fetch claimable yield from vault
    fetchClaimableYield();
  }, []);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Enable Auto-Repay?</h2>

        <div className="explanation">
          <p>
            Your yield from staked RWA will automatically repay your loan
            interest and principal over time.
          </p>
          <ul>
            <li>Claimable yield: {formatToken(claimableYield, 6)} USDC</li>
            <li>Loan amount: {formatToken(loanAmount, 6)} USDC</li>
            <li>Auto-repay runs whenever new yield is funded</li>
          </ul>
        </div>

        <div className="actions">
          <button onClick={enableAutoRepay} className="btn-primary">
            Enable Auto-Repay
          </button>
          <button onClick={close} className="btn-secondary">
            Skip for Now
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### 6. Profile Section (`/profile`)

**Purpose:** User activity overview and auto-repay management

**Smart Contract Reads:**

```typescript
// All user balances and positions
MockRWA.balance(userAddress);
stRWA.balance(userAddress);
USDC.balance(userAddress);

// Vault info
Vault.get_stake_info(userAddress);
Vault.get_claimable_yield(userAddress);

// Loan info
LendingPool.get_loan(userAddress);

// LP deposits
LendingPool.get_lp_deposit(userAddress);
```

**Implementation:**

```typescript
// src/components/Profile.tsx
export function Profile({ userAddress }) {
  const { data, loading } = useDashboard(userAddress);
  const [autoRepayStatus, setAutoRepayStatus] = useState(false);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="profile-page">
      {/* Wallet Balances */}
      <section className="balances-section">
        <h2>Wallet Balances</h2>
        <div className="balance-cards">
          <BalanceCard
            token="alexRWA"
            amount={data.rwaBalance}
            decimals={18}
          />
          <BalanceCard
            token="OrionalexRWA"
            amount={data.stRwaBalance}
            decimals={18}
          />
          <BalanceCard
            token="USDC"
            amount={data.usdcBalance}
            decimals={6}
          />
        </div>
      </section>

      {/* Yield Earnings */}
      <section className="yield-section">
        <h2>Current Yield</h2>
        <div className="yield-card">
          <p>Claimable: {formatToken(data.claimableYield, 6)} USDC</p>
          <button onClick={claimYield}>Claim Yield</button>
        </div>
      </section>

      {/* Active Loans */}
      {data.loanInfo && (
        <section className="loan-section">
          <h2>Active Loan</h2>
          <div className="loan-details">
            <p>Collateral: {formatToken(data.loanInfo.collateralAmount, 18)} stRWA</p>
            <p>Borrowed: {formatToken(data.loanInfo.principal, 6)} USDC</p>
            <p>Outstanding: {formatToken(data.loanInfo.outstandingDebt, 6)} USDC</p>
            <p>Interest Rate: {data.loanInfo.interestRate / 100}% APR</p>
            <p>Health Factor: {data.healthFactor.toFixed(2)}</p>
          </div>

          {/* LTV Risk Meter */}
          <div className="ltv-meter">
            <label>LTV Risk</label>
            <div className={`meter ${getHealthColor(data.healthFactor)}`}>
              <div
                className="meter-fill"
                style={{ width: `${(data.loanInfo.outstandingDebt * BigInt(100) / data.loanInfo.collateralAmount)}%` }}
              />
            </div>
          </div>

          {/* Auto-Repay Toggle */}
          <div className="auto-repay-control">
            <label>
              <input
                type="checkbox"
                checked={autoRepayStatus}
                onChange={handleAutoRepayToggle}
              />
              Auto-Repay from Yield
            </label>
            {autoRepayStatus && (
              <p className="status-text">
                ✅ Yield will automatically repay your loan
              </p>
            )}
          </div>
        </section>
      )}

      {/* Transaction History */}
      <section className="history-section">
        <h2>Transaction History</h2>
        <TransactionHistory userAddress={userAddress} />
      </section>
    </div>
  );
}

// Auto-repay toggle handler
function handleAutoRepayToggle(enabled: boolean) {
  if (enabled) {
    // Show modal with explanation
    showAutoRepayOnModal();
  } else {
    // Show modal with summary
    showAutoRepayOffModal();
  }
}
```

**Auto-Repay On Modal:**

```typescript
export function AutoRepayOnModal({ loanInfo, claimableYield, onConfirm }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Enable Auto-Repay</h2>

        <div className="explanation">
          <h3>How it works:</h3>
          <ul>
            <li>Your yield automatically repays loan interest first</li>
            <li>Remaining yield repays principal</li>
            <li>Happens whenever new yield is funded to the vault</li>
          </ul>

          <h3>Current Status:</h3>
          <ul>
            <li>Claimable yield: {formatToken(claimableYield, 6)} USDC</li>
            <li>Outstanding debt: {formatToken(loanInfo.outstandingDebt, 6)} USDC</li>
            <li>If enabled now, {formatToken(Math.min(claimableYield, loanInfo.outstandingDebt), 6)} USDC will be applied immediately</li>
          </ul>
        </div>

        <div className="actions">
          <button onClick={onConfirm} className="btn-primary">
            Enable Auto-Repay
          </button>
          <button onClick={close} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Auto-Repay Off Modal:**

```typescript
export function AutoRepayOffModal({ totalYield, yieldUsed, remainingLoan, onConfirm }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Disable Auto-Repay</h2>

        <div className="summary">
          <h3>Summary:</h3>
          <ul>
            <li>Total yield earned: {formatToken(totalYield, 6)} USDC</li>
            <li>Already used to repay: {formatToken(yieldUsed, 6)} USDC</li>
            <li>Remaining loan: {formatToken(remainingLoan, 6)} USDC</li>
          </ul>

          <p className="warning">
            ⚠️ Future yield will NOT automatically repay your loan. You'll need to manually repay.
          </p>
        </div>

        <div className="actions">
          <button onClick={onConfirm} className="btn-primary">
            Confirm Disable
          </button>
          <button onClick={close} className="btn-secondary">
            Keep Auto-Repay On
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### 7. Admin Panel (`/admin`)

**Purpose:** Manage LP liquidity pool (testnet demo only)

**Smart Contract Writes:**

```typescript
// LP deposit USDC
LendingPool.lp_deposit(admin, amount);

// LP withdraw USDC
LendingPool.lp_withdraw(admin, amount);

// Update oracle price (demo fallback)
Oracle.set_price(asset, price, bot);

// Fund yield to vault (simulate institutional yield)
Vault.admin_fund_yield(amount);
```

**Implementation:**

```typescript
// src/components/AdminPanel.tsx
export function AdminPanel({ adminAddress, signTransaction }) {
  const [lpAmount, setLpAmount] = useState('');
  const [totalLiquidity, setTotalLiquidity] = useState(BigInt(0));

  async function depositLP() {
    const amount = BigInt(parseFloat(lpAmount) * 1e6);

    toast.info('Depositing USDC to LP pool...');

    // Approve USDC
    const approveTx = await buildTransaction(
      server,
      adminAddress,
      CONTRACTS.usdc,
      'approve',
      [
        StellarSdk.nativeToScVal(adminAddress, 'address'),
        StellarSdk.nativeToScVal(CONTRACTS.lendingPool, 'address'),
        StellarSdk.nativeToScVal(amount, 'i128'),
        StellarSdk.nativeToScVal(1000000, 'u32'),
      ]
    );
    await submitTransaction(server, await signTransaction(approveTx));

    // Deposit
    const depositTx = await buildTransaction(
      server,
      adminAddress,
      CONTRACTS.lendingPool,
      'lp_deposit',
      [
        StellarSdk.nativeToScVal(adminAddress, 'address'),
        StellarSdk.nativeToScVal(amount, 'i128'),
      ]
    );
    await submitTransaction(server, await signTransaction(depositTx));

    toast.success('✅ LP deposit successful');
  }

  async function fundYield() {
    // Simulate institutional yield payment
    const amount = BigInt(parseFloat(yieldAmount) * 1e6);

    toast.info('Funding yield to vault...');

    const tx = await buildTransaction(
      server,
      adminAddress,
      CONTRACTS.vault,
      'admin_fund_yield',
      [
        StellarSdk.nativeToScVal(adminAddress, 'address'),
        StellarSdk.nativeToScVal(amount, 'i128'),
      ]
    );

    await submitTransaction(server, await signTransaction(tx));
    toast.success('✅ Yield funded - users can now claim');
  }

  return (
    <div className="admin-panel">
      <h1>Admin Panel</h1>

      {/* LP Liquidity Management */}
      <section className="lp-section">
        <h2>Liquidity Pool Management</h2>
        <p>Total Liquidity: {formatToken(totalLiquidity, 6)} USDC</p>

        <div className="input-group">
          <input
            type="number"
            value={lpAmount}
            onChange={(e) => setLpAmount(e.target.value)}
            placeholder="Amount in USDC"
          />
          <button onClick={depositLP}>Deposit to LP</button>
        </div>
      </section>

      {/* Yield Funding */}
      <section className="yield-section">
        <h2>Fund Yield (Simulate Institution Payment)</h2>
        <div className="input-group">
          <input
            type="number"
            placeholder="Yield amount in USDC"
          />
          <button onClick={fundYield}>Fund Yield</button>
        </div>
      </section>

      {/* System Analytics */}
      <section className="analytics">
        <h2>System Metrics</h2>
        <div className="metrics-grid">
          <MetricCard label="Total Value Locked" value="$XXX" />
          <MetricCard label="Total Borrowed" value="$XXX" />
          <MetricCard label="Pool Utilization" value="XX%" />
          <MetricCard label="Active Loans" value="X" />
        </div>
      </section>
    </div>
  );
}
```

---

## 🔔 Liquidation Notifications

**Implementation:**

```typescript
// src/hooks/useLiquidationMonitor.ts
export function useLiquidationMonitor(userAddress: string) {
  const [warnings, setWarnings] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      const loan = await getLoan(userAddress);
      if (!loan) return;

      const price = await getStRwaPrice();
      const collateralValue =
        (loan.collateralAmount * price) / BigInt(1_000000);
      const debt = loan.outstandingDebt + loan.penalties;
      const healthFactor = Number((collateralValue * BigInt(100)) / debt) / 100;

      if (healthFactor < 1.2) {
        setWarnings((prev) => prev + 1);

        if (warnings === 0) {
          toast.warn(
            "⚠️ Warning #1: Your health factor is below 1.2. Add collateral or repay debt.",
          );
        } else if (warnings === 1) {
          toast.error(
            "🚨 Warning #2: Health factor critical! Liquidation imminent.",
          );
        } else if (warnings === 2) {
          toast.error(
            "🔴 FINAL WARNING: Add collateral NOW to avoid liquidation!",
          );
        }
      }

      // Check if liquidated
      if (healthFactor < 1.1) {
        toast.error("💥 Your position has been liquidated");
        // Trigger liquidation event handling
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [userAddress, warnings]);

  return { warnings };
}
```

**Toast Notification Styling:**

```tsx
// src/utils/toast.ts
import { toast as hotToast } from "react-hot-toast";

export const toast = {
  success: (msg: string) => hotToast.success(msg, { duration: 4000 }),
  error: (msg: string) => hotToast.error(msg, { duration: 6000 }),
  info: (msg: string) => hotToast(msg, { icon: "ℹ️", duration: 4000 }),
  warn: (msg: string) => hotToast(msg, { icon: "⚠️", duration: 6000 }),
};
```

---

## 📊 Contract Events & Real-time Updates

**Event Subscriptions:**

```typescript
// src/hooks/useContractEvents.ts
export function useContractEvents(userAddress: string) {
  useEffect(() => {
    const server = new StellarSdk.SorobanRpc.Server(
      NETWORK_CONFIG.testnet.rpcUrl,
    );

    // Poll for new events every 5 seconds
    const interval = setInterval(async () => {
      // Get latest transactions for user
      // Parse events and update UI
      // Example events to watch:
      // - Stake(user, amountRWA, sharesMinted)
      // - YieldClaimed(user, amount)
      // - Borrowed(user, amountUSDC)
      // - Repaid(user, amountUSDC)
      // - LiquidationTriggered(user, collateralSeized)
    }, 5000);

    return () => clearInterval(interval);
  }, [userAddress]);
}
```

---

## 🧪 Testing Your Integration

### 1. Setup Test Account

```bash
# Generate test identity
stellar keys generate testuser --network testnet
stellar keys fund testuser --network testnet

# Get address
USER_ADDR=$(stellar keys address testuser)

# Whitelist user in RWA token
stellar contract invoke \
  --id $RWA_ID \
  --source admin \
  --network testnet \
  -- allow_user \
  --user $USER_ADDR \
  --operator $(stellar keys address admin)
```

### 2. Fund Test User

```bash
# Transfer test RWA tokens
stellar contract invoke \
  --id $RWA_ID \
  --source admin \
  --network testnet \
  -- transfer \
  --from $(stellar keys address admin) \
  --to $USER_ADDR \
  --amount 1000000000000000000  # 1 RWA (18 decimals)

# Transfer test USDC
stellar contract invoke \
  --id $USDC_ID \
  --source admin \
  --network testnet \
  -- transfer \
  --from $(stellar keys address admin) \
  --to $USER_ADDR \
  --amount 1000000000  # 1000 USDC (6 decimals)
```

### 3. Test Complete Flow

```typescript
// 1. Connect wallet
await wallet.connect();

// 2. Check whitelist
const isWhitelisted = await checkWhitelist(userAddress);
// Expected: true

// 3. Stake RWA
await stake(BigInt(100_000000000000000000)); // 100 RWA
// Expected: Receive 100 stRWA

// 4. Borrow USDC
await borrowUSDC(
  BigInt(200_000000000000000000), // 200 stRWA collateral
  BigInt(100_000000), // 100 USDC loan
  12, // 12 months
);
// Expected: Receive 100 USDC, health factor = 2.0

// 5. Simulate yield funding (admin)
await fundYield(BigInt(10_000000)); // 10 USDC yield

// 6. Claim yield
await claimYield();
// Expected: Receive 10 USDC

// 7. Repay loan
await repayLoan(BigInt(50_000000)); // 50 USDC
// Expected: Debt reduced, health factor improves
```

---

## 🚀 Deployment Checklist

- [ ] Deploy contracts to testnet (`./scripts/deploy.sh testnet`)
- [ ] Initialize contracts (`./scripts/initialize.sh testnet`)
- [ ] Update frontend config with contract addresses
- [ ] Test wallet connection and whitelist check
- [ ] Test stake/unstake flow
- [ ] Test borrow/repay flow
- [ ] Test auto-repay toggle
- [ ] Test admin LP deposit
- [ ] Test liquidation notifications
- [ ] Deploy frontend to hosting (Vercel/Netlify)
- [ ] Update contract addresses in production config

---

## 📚 Additional Resources

- **Contract Tests:** See `contracts/lending-pool/src/test.rs` for usage examples
- **TypeScript SDK:** See `frontend-sdk/README.md` for full API docs
- **Stellar Docs:** https://developers.stellar.org/
- **Freighter Wallet:** https://www.freighter.app/

---

## 🆘 Troubleshooting

### "User not whitelisted"

**Solution:** Run whitelist command:

```bash
stellar contract invoke --id $RWA_ID --source admin --network testnet \
  -- allow_user --user $USER_ADDRESS --operator $ADMIN
```

### "Insufficient collateral"

**Solution:** Ensure collateral is at least 140% of loan:

```typescript
if (collateralValue / loanAmount < 1.4) {
  // Need more collateral
}
```

### "Transaction simulation failed"

**Solution:**

1. Check contracts are initialized
2. Verify token approvals
3. Check user has sufficient balance
4. Ensure network RPC is accessible

### "One loan per user"

**Solution:** Repay existing loan first:

```typescript
const existingLoan = await getLoan(userAddress);
if (existingLoan) {
  await repayLoan(existingLoan.outstandingDebt);
}
```

---

## 🎉 You're Ready!

Your Orion Protocol frontend is now fully integrated with the Stellar smart contracts. Users can:

✅ Connect wallet and check whitelist status
✅ Stake RWA → receive stRWA
✅ Claim yield from RWA holdings
✅ Borrow USDC against stRWA collateral
✅ Enable auto-repay from yield
✅ Monitor health factor in real-time
✅ Receive liquidation warnings

Happy building! 🚀
