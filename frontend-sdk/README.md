# Stellar RWA Lending SDK

TypeScript SDK for easy integration with the Stellar RWA Lending Protocol smart contracts.

## Installation

```bash
npm install @your-org/stellar-lending-sdk
# or
yarn add @your-org/stellar-lending-sdk
```

## Quick Start

```typescript
import StellarLendingSDK from '@your-org/stellar-lending-sdk';

// Initialize SDK
const sdk = new StellarLendingSDK('testnet', {
  usdc: 'CAAAA...', // Your deployed contract addresses
  rwaToken: 'CBBBB...',
  stRwaToken: 'CCCCC...',
  vault: 'CDDDD...',
  oracle: 'CEEEE...',
  lendingPool: 'CFFFF...',
});

// Define sign function (Freighter wallet example)
async function signWithFreighter(tx) {
  const signedTx = await window.freighter.signTransaction(
    tx.toXDR(),
    { network: 'testnet' }
  );
  return StellarSdk.TransactionBuilder.fromXDR(
    signedTx,
    'Test SDF Network ; September 2015'
  );
}

// LP deposits USDC
const userAddress = 'GAAAA...';
const depositAmount = BigInt(1000_000000); // 1000 USDC (6 decimals)
await sdk.lpDeposit(userAddress, depositAmount, signWithFreighter);

// Borrow USDC
const collateral = BigInt(200_000000000000000000); // 200 stRWA (18 decimals)
const loanAmount = BigInt(100_000000); // 100 USDC
const duration = 12; // 12 months
await sdk.originateLoan(
  userAddress,
  collateral,
  loanAmount,
  duration,
  signWithFreighter
);

// Repay loan
const paymentAmount = BigInt(50_000000); // 50 USDC
await sdk.repayLoan(userAddress, paymentAmount, signWithFreighter);

// Get loan info
const loanInfo = await sdk.getLoan(userAddress);
console.log('Loan:', loanInfo);

// Get pool liquidity
const totalLiquidity = await sdk.getTotalLiquidity();
const availableLiquidity = await sdk.getAvailableLiquidity();
console.log(`Pool: ${totalLiquidity}, Available: ${availableLiquidity}`);
```

## API Reference

### Constructor

```typescript
new StellarLendingSDK(network: string, contractAddresses: ContractAddresses)
```

- `network`: `'testnet'`, `'futurenet'`, or `'mainnet'`
- `contractAddresses`: Object with deployed contract addresses

### Lending Pool Methods

#### `lpDeposit(depositor, amount, signFn)`
LP deposits USDC to earn interest.

#### `lpWithdraw(depositor, amount, signFn)`
LP withdraws available USDC (not locked in loans).

#### `getLPDeposit(depositor)`
Get LP deposit information (read-only).

#### `originateLoan(borrower, collateralAmount, loanAmount, durationMonths, signFn)`
Originate a new loan with stRWA collateral.
- Requires 140% collateral ratio
- Duration: 3-24 months
- Auto-calculated interest rate (7-14% based on token risk)

#### `repayLoan(borrower, amount, signFn)`
Make a loan payment. Automatically uses vault yield first, then USDC.

#### `closeLoanEarly(borrower, signFn)`
Close loan before maturity. Charges 5% fee on remaining debt.

#### `getLoan(borrower)`
Get loan information (read-only).

#### `getTotalLiquidity()`
Get total USDC in the pool (read-only).

#### `getAvailableLiquidity()`
Get available USDC not locked in loans (read-only).

### Vault Methods

#### `stake(user, amount, signFn)`
Stake RWA tokens to receive stRWA (1:1 ratio).

#### `unstake(user, amount, signFn)`
Unstake stRWA to receive RWA tokens back.

#### `claimYield(user, signFn)`
Claim accumulated USDC yield from RWA holdings.

### Token Methods

#### `approveToken(tokenAddress, from, spender, amount, expirationLedger, signFn)`
Approve token spending for another contract.

#### `getTokenBalance(tokenAddress, address)`
Get token balance (read-only).

## React Hook Example

```typescript
import { useState } from 'react';
import StellarLendingSDK from '@your-org/stellar-lending-sdk';

export function useLendingPool(sdk: StellarLendingSDK, signFn) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deposit(userAddress: string, amount: bigint) {
    setLoading(true);
    setError(null);
    try {
      await sdk.lpDeposit(userAddress, amount, signFn);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function borrow(
    userAddress: string,
    collateral: bigint,
    loanAmount: bigint,
    duration: number
  ) {
    setLoading(true);
    setError(null);
    try {
      await sdk.originateLoan(
        userAddress,
        collateral,
        loanAmount,
        duration,
        signFn
      );
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { deposit, borrow, loading, error };
}
```

## Type Definitions

```typescript
interface LoanInfo {
  borrower: string;
  collateralAmount: bigint;
  principal: bigint;
  outstandingDebt: bigint;
  interestRate: number; // Basis points (700 = 7%)
  startTime: number;
  endTime: number;
  lastInterestUpdate: number;
  warningsIssued: number;
  lastWarningTime: number;
  penalties: bigint;
  yieldSharePercent: number; // Basis points (1000 = 10%)
}

interface LPDepositInfo {
  depositor: string;
  totalDeposited: bigint;
  lockedAmount: bigint;
  availableAmount: bigint;
  totalInterestEarned: bigint;
}
```

## Interest Rate System

The protocol automatically calculates interest rates based on token risk:

- **High Risk** (token yield < 5% APR):
  - Borrowing Rate: **14% APR**
  - LP Share: **20%** of interest

- **Low Risk** (token yield ≥ 5% APR):
  - Borrowing Rate: **7% APR**
  - LP Share: **10%** of interest

Interest compounds monthly.

## Collateral & Liquidation

- **Required Collateral**: 140% of loan value (LTV ratio)
- **Warning Threshold**: 110% collateral ratio OR 2 weeks no payment
- **Liquidation Threshold**: 110% collateral ratio
- **Liquidation Reward**: 10% to liquidation bot

## Important Notes

1. **Decimals**:
   - USDC: 6 decimals (1 USDC = 1_000000)
   - RWA/stRWA: 18 decimals (1 token = 1_000000000000000000)

2. **Approvals**:
   Always approve tokens before staking or depositing:
   ```typescript
   await sdk.approveToken(
     sdk.contracts.usdc,
     userAddress,
     sdk.contracts.lendingPool,
     amount,
     expirationLedger,
     signFn
   );
   ```

3. **Auto-Yield Deduction**:
   When repaying, the protocol automatically uses accumulated yield from the vault first, then USDC.

4. **One Loan Per User**:
   Each address can only have one active loan at a time.

## License

MIT
