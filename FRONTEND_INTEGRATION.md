# Frontend Integration Guide

This guide explains how to deploy the Stellar smart contracts and integrate them with your frontend application.

## 📋 Prerequisites

1. **Install Stellar CLI (soroban-cli)**
   ```bash
   cargo install --locked soroban-cli --features opt
   ```

2. **Install Node.js dependencies** (for frontend)
   ```bash
   npm install @stellar/stellar-sdk stellar-base
   # OR
   npm install soroban-client
   ```

## 🚀 Deployment Process

### Step 1: Optimize Contract WASMs

The contracts are already built. For production, optimize them:

```bash
# Install stellar-contract-optimizer (optional but recommended)
cargo install --locked stellar-contract-optimizer

# Optimize all contracts
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/usdc_mock.wasm
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/mock_rwa_token.wasm
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/strwa_token.wasm
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/rwa_vault.wasm
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/lending_pool.wasm
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/mock_oracle.wasm
```

### Step 2: Configure Network

Choose your deployment network:

**Testnet (Recommended for Development)**
```bash
# Add testnet network
stellar network add \
  --global testnet \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015"
```

**Futurenet**
```bash
stellar network add \
  --global futurenet \
  --rpc-url https://rpc-futurenet.stellar.org:443 \
  --network-passphrase "Test SDF Future Network ; October 2022"
```

**Mainnet (Production)**
```bash
stellar network add \
  --global mainnet \
  --rpc-url https://mainnet.sorobanrpc.com:443 \
  --network-passphrase "Public Global Stellar Network ; September 2015"
```

### Step 3: Create/Configure Identity

```bash
# Generate a new identity
stellar keys generate admin --network testnet

# Fund the account (testnet only)
stellar keys fund admin --network testnet

# OR use existing identity
stellar keys add admin --secret-key YOUR_SECRET_KEY --network testnet
```

### Step 4: Deploy Contracts

Deploy in this specific order (due to dependencies):

```bash
# 1. Deploy USDC Mock
USDC_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/usdc_mock.wasm \
  --source admin \
  --network testnet)
echo "USDC Address: $USDC_ID"

# 2. Deploy Mock RWA Token
RWA_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/mock_rwa_token.wasm \
  --source admin \
  --network testnet)
echo "RWA Token Address: $RWA_ID"

# 3. Deploy stRWA Token
STRWA_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/strwa_token.wasm \
  --source admin \
  --network testnet)
echo "stRWA Token Address: $STRWA_ID"

# 4. Deploy RWA Vault
VAULT_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/rwa_vault.wasm \
  --source admin \
  --network testnet)
echo "Vault Address: $VAULT_ID"

# 5. Deploy Oracle
ORACLE_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/mock_oracle.wasm \
  --source admin \
  --network testnet)
echo "Oracle Address: $ORACLE_ID"

# 6. Deploy Lending Pool
LENDING_POOL_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/lending_pool.wasm \
  --source admin \
  --network testnet)
echo "Lending Pool Address: $LENDING_POOL_ID"
```

### Step 5: Initialize Contracts

```bash
# Get admin address
ADMIN=$(stellar keys address admin)

# Initialize USDC (constructor auto-called during deployment)
stellar contract invoke \
  --id $USDC_ID \
  --source admin \
  --network testnet \
  -- initialize \
  --admin $ADMIN \
  --initial_supply 1000000000000000

# Initialize RWA Token (constructor auto-called)
stellar contract invoke \
  --id $RWA_ID \
  --source admin \
  --network testnet \
  -- initialize \
  --admin $ADMIN \
  --manager $ADMIN \
  --initial_supply 1000000000000000

# Initialize stRWA Token
stellar contract invoke \
  --id $STRWA_ID \
  --source admin \
  --network testnet \
  -- initialize \
  --admin $ADMIN

# Set vault address in stRWA
stellar contract invoke \
  --id $STRWA_ID \
  --source admin \
  --network testnet \
  -- set_vault_address \
  --vault $VAULT_ID

# Initialize Vault
stellar contract invoke \
  --id $VAULT_ID \
  --source admin \
  --network testnet \
  -- initialize \
  --admin $ADMIN \
  --rwa_token_address $RWA_ID \
  --strwa_token_address $STRWA_ID

stellar contract invoke \
  --id $VAULT_ID \
  --source admin \
  --network testnet \
  -- set_usdc_address \
  --usdc_address $USDC_ID

stellar contract invoke \
  --id $VAULT_ID \
  --source admin \
  --network testnet \
  -- set_lending_pool \
  --pool_address $LENDING_POOL_ID

# Initialize Oracle
stellar contract invoke \
  --id $ORACLE_ID \
  --source admin \
  --network testnet \
  -- initialize \
  --admin $ADMIN

# Set initial price for stRWA
stellar contract invoke \
  --id $ORACLE_ID \
  --source admin \
  --network testnet \
  -- set_price \
  --asset $STRWA_ID \
  --price 1000000 \
  --bot $ADMIN

# Initialize Lending Pool
stellar contract invoke \
  --id $LENDING_POOL_ID \
  --source admin \
  --network testnet \
  -- initialize \
  --admin $ADMIN \
  --vault_address $VAULT_ID \
  --oracle_address $ORACLE_ID \
  --usdc_address $USDC_ID \
  --strwa_address $STRWA_ID \
  --rwa_address $RWA_ID

# Set liquidation bot
stellar contract invoke \
  --id $LENDING_POOL_ID \
  --source admin \
  --network testnet \
  -- set_liquidation_bot \
  --caller $ADMIN \
  --bot_address $ADMIN

# Set token risk profile (5% APR = low risk)
stellar contract invoke \
  --id $LENDING_POOL_ID \
  --source admin \
  --network testnet \
  -- update_token_risk_profile \
  --caller $ADMIN \
  --rwa_token_address $RWA_ID \
  --token_yield_apr 500 \
  --token_expiry 31536000

# Whitelist vault in RWA token
stellar contract invoke \
  --id $RWA_ID \
  --source admin \
  --network testnet \
  -- allow_user \
  --user $VAULT_ID \
  --operator $ADMIN
```

### Step 6: Save Contract Addresses

Create a config file for your frontend:

```bash
cat > contract-addresses.json <<EOF
{
  "network": "testnet",
  "admin": "$ADMIN",
  "contracts": {
    "usdc": "$USDC_ID",
    "rwaToken": "$RWA_ID",
    "stRwaToken": "$STRWA_ID",
    "vault": "$VAULT_ID",
    "oracle": "$ORACLE_ID",
    "lendingPool": "$LENDING_POOL_ID"
  }
}
EOF
```

## 🌐 Frontend Integration (React/Next.js Example)

### Install Dependencies

```bash
npm install @stellar/stellar-sdk
```

### Configuration File

Create `src/config/contracts.ts`:

```typescript
export const CONTRACT_ADDRESSES = {
  testnet: {
    usdc: 'CAAAA...', // Replace with actual addresses from deployment
    rwaToken: 'CBBBB...',
    stRwaToken: 'CCCCC...',
    vault: 'CDDDD...',
    oracle: 'CEEEE...',
    lendingPool: 'CFFFF...',
  },
  mainnet: {
    // Add mainnet addresses when ready
  }
};

export const NETWORK_CONFIG = {
  testnet: {
    networkPassphrase: 'Test SDF Network ; September 2015',
    rpcUrl: 'https://soroban-testnet.stellar.org:443',
    horizonUrl: 'https://horizon-testnet.stellar.org',
  },
  mainnet: {
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    rpcUrl: 'https://mainnet.sorobanrpc.com:443',
    horizonUrl: 'https://horizon.stellar.org',
  }
};
```

### Create Stellar Client Utility

Create `src/lib/stellar.ts`:

```typescript
import * as StellarSdk from '@stellar/stellar-sdk';
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from '@/config/contracts';

const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
const networkConfig = NETWORK_CONFIG[network];
const contractAddresses = CONTRACT_ADDRESSES[network];

// Initialize Soroban RPC Server
export const server = new StellarSdk.SorobanRpc.Server(networkConfig.rpcUrl);

// Helper to get contract
export function getContract(contractId: string) {
  return new StellarSdk.Contract(contractId);
}

// Build transaction for contract invocation
export async function buildContractTransaction(
  sourceAccount: string,
  contractId: string,
  method: string,
  args: StellarSdk.xdr.ScVal[]
) {
  const account = await server.getAccount(sourceAccount);

  const contract = getContract(contractId);

  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: networkConfig.networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  // Simulate transaction to get resource requirements
  const simulated = await server.simulateTransaction(transaction);

  if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
    return StellarSdk.SorobanRpc.assembleTransaction(transaction, simulated)
      .build();
  } else {
    throw new Error(`Simulation failed: ${simulated.error}`);
  }
}

// Sign and submit transaction
export async function submitTransaction(
  transaction: StellarSdk.Transaction,
  signWith: (tx: StellarSdk.Transaction) => Promise<StellarSdk.Transaction>
) {
  const signedTx = await signWith(transaction);
  const response = await server.sendTransaction(signedTx);

  // Poll for result
  let result = await server.getTransaction(response.hash);
  while (result.status === 'NOT_FOUND') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    result = await server.getTransaction(response.hash);
  }

  if (result.status === 'SUCCESS') {
    return result;
  } else {
    throw new Error(`Transaction failed: ${result.status}`);
  }
}

// Helper to convert JS values to ScVal
export function nativeToScVal(value: any, type?: string): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(value, type);
}

export { contractAddresses };
```

### Contract Interaction Hooks

Create `src/hooks/useLendingPool.ts`:

```typescript
import { useState } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
  buildContractTransaction,
  submitTransaction,
  contractAddresses,
  nativeToScVal
} from '@/lib/stellar';

export function useLendingPool() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // LP Deposit USDC
  async function depositLiquidity(
    userAddress: string,
    amount: bigint,
    signTransaction: (tx: StellarSdk.Transaction) => Promise<StellarSdk.Transaction>
  ) {
    setLoading(true);
    setError(null);

    try {
      const args = [
        nativeToScVal(userAddress, 'address'),
        nativeToScVal(amount, 'i128'),
      ];

      const tx = await buildContractTransaction(
        userAddress,
        contractAddresses.lendingPool,
        'lp_deposit',
        args
      );

      const result = await submitTransaction(tx, signTransaction);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Originate Loan
  async function originateLoan(
    borrower: string,
    collateralAmount: bigint,
    loanAmount: bigint,
    durationMonths: number,
    signTransaction: (tx: StellarSdk.Transaction) => Promise<StellarSdk.Transaction>
  ) {
    setLoading(true);
    setError(null);

    try {
      const args = [
        nativeToScVal(borrower, 'address'),
        nativeToScVal(collateralAmount, 'i128'),
        nativeToScVal(loanAmount, 'i128'),
        nativeToScVal(durationMonths, 'u32'),
      ];

      const tx = await buildContractTransaction(
        borrower,
        contractAddresses.lendingPool,
        'originate_loan',
        args
      );

      const result = await submitTransaction(tx, signTransaction);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Repay Loan
  async function repayLoan(
    borrower: string,
    amount: bigint,
    signTransaction: (tx: StellarSdk.Transaction) => Promise<StellarSdk.Transaction>
  ) {
    setLoading(true);
    setError(null);

    try {
      const args = [
        nativeToScVal(borrower, 'address'),
        nativeToScVal(amount, 'i128'),
      ];

      const tx = await buildContractTransaction(
        borrower,
        contractAddresses.lendingPool,
        'repay_loan',
        args
      );

      const result = await submitTransaction(tx, signTransaction);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Get Loan Info (read-only)
  async function getLoan(borrower: string) {
    try {
      const args = [nativeToScVal(borrower, 'address')];

      const tx = await buildContractTransaction(
        borrower, // Can be any address for read operations
        contractAddresses.lendingPool,
        'get_loan',
        args
      );

      // For read-only, we only need to simulate
      const simulated = await server.simulateTransaction(tx);

      if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
        return simulated.result?.retval;
      }
      return null;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }

  return {
    loading,
    error,
    depositLiquidity,
    originateLoan,
    repayLoan,
    getLoan,
  };
}
```

### Wallet Integration (Freighter Example)

Create `src/hooks/useWallet.ts`:

```typescript
import { useState, useEffect } from 'react';

declare global {
  interface Window {
    freighter: any;
  }
}

export function useWallet() {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  async function connect() {
    if (!window.freighter) {
      alert('Please install Freighter wallet extension');
      return;
    }

    try {
      const key = await window.freighter.getPublicKey();
      setPublicKey(key);
      setConnected(true);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  }

  async function signTransaction(tx: any) {
    if (!window.freighter) {
      throw new Error('Freighter not installed');
    }

    const signedTx = await window.freighter.signTransaction(
      tx.toXDR(),
      {
        network: process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet',
        networkPassphrase: 'Test SDF Network ; September 2015',
      }
    );

    return StellarSdk.TransactionBuilder.fromXDR(
      signedTx,
      'Test SDF Network ; September 2015'
    );
  }

  function disconnect() {
    setPublicKey(null);
    setConnected(false);
  }

  return {
    connected,
    publicKey,
    connect,
    disconnect,
    signTransaction,
  };
}
```

### Example React Component

```typescript
import { useLendingPool } from '@/hooks/useLendingPool';
import { useWallet } from '@/hooks/useWallet';

export function LendingPoolUI() {
  const { connected, publicKey, connect, signTransaction } = useWallet();
  const { depositLiquidity, originateLoan, loading, error } = useLendingPool();

  async function handleDeposit() {
    if (!publicKey) return;

    const amount = BigInt(1000_000000); // 1000 USDC (6 decimals)
    await depositLiquidity(publicKey, amount, signTransaction);
  }

  async function handleBorrow() {
    if (!publicKey) return;

    const collateral = BigInt(200_000000000000000000); // 200 stRWA (18 decimals)
    const loanAmount = BigInt(100_000000); // 100 USDC
    const duration = 12; // 12 months

    await originateLoan(publicKey, collateral, loanAmount, duration, signTransaction);
  }

  if (!connected) {
    return <button onClick={connect}>Connect Wallet</button>;
  }

  return (
    <div>
      <p>Connected: {publicKey}</p>
      <button onClick={handleDeposit} disabled={loading}>
        Deposit Liquidity
      </button>
      <button onClick={handleBorrow} disabled={loading}>
        Borrow USDC
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

## 📚 Additional Resources

- [Stellar Documentation](https://developers.stellar.org/)
- [Soroban Docs](https://soroban.stellar.org/)
- [Stellar SDK](https://github.com/stellar/js-stellar-sdk)
- [Freighter Wallet](https://www.freighter.app/)

## 🔧 Troubleshooting

### Common Issues

1. **Transaction Simulation Failed**: Check that all contracts are initialized and addresses are correct
2. **Insufficient Balance**: Fund your testnet account using `stellar keys fund`
3. **Authorization Errors**: Ensure proper auth setup and wallet connection
4. **Network Issues**: Verify RPC URL is accessible and network is selected correctly

### Testing

Use the deployment script to verify contracts:

```bash
# Test LP deposit
stellar contract invoke \
  --id $LENDING_POOL_ID \
  --source admin \
  --network testnet \
  -- get_total_liquidity

# Test loan origination
stellar contract invoke \
  --id $LENDING_POOL_ID \
  --source admin \
  --network testnet \
  -- get_available_liquidity
```
