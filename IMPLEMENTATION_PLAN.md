# Orion Frontend Integration - Implementation Plan

**Date**: November 9, 2025
**Status**: In Progress

---

## ✅ Completed

1. **Contract Addresses Updated**
   - Loaded from `/orion-backend/Scaffold-Stellar-Orion-Server/.soroban/contract-addresses-testnet.json`
   - All contracts mapped in `src/services/contracts/index.ts`

2. **New Services Created**
   - `USDCService.ts` - USDC token operations (7 decimals)
   - `StakedRWAService.ts` - stRWA token operations (18 decimals)

3. **VaultService Updated**
   - Methods aligned with actual contract: `stake()`, `unstake()`, `claim_yield()`, `claimable_yield()`
   - Helper methods for decimal conversion added

---

## 🔄 In Progress

### Phase 1: Service Layer Completion (Current)

#### A. Update LendingPoolService
**Contract Functions from docs:**
```typescript
// LP Functions
- lp_deposit(depositor, amount)
- lp_withdraw(depositor, amount)
- get_lp_deposit(depositor) → LPDeposit

// Loan Functions
- originate_loan(borrower, collateral_amount, loan_amount, duration_months)
- repay_loan(borrower, amount)
- close_loan_early(borrower)
- get_loan(borrower) → Loan

// Risk Management
- check_and_issue_warning(borrower)
- liquidate_loan(caller, borrower)
- update_loan_interest(borrower)

// Admin
- set_liquidation_bot(caller, bot_address)
- update_token_risk_profile(caller, rwa_token, yield_apr, expiry)

// View
- get_total_liquidity() → i128
- get_available_liquidity() → i128
- get_token_risk_profile(rwa_token) → TokenRiskProfile
```

**Key Types:**
```typescript
interface Loan {
  borrower: Address;
  collateral_amount: i128;  // stRWA (18 decimals)
  principal: i128;           // USDC (7 decimals)
  outstanding_debt: i128;    // USDC (7 decimals)
  interest_rate: i128;       // Basis points (700 = 7%)
  start_time: u64;
  end_time: u64;
  last_interest_update: u64;
  warnings_issued: u32;
  last_warning_time: u64;
  penalties: i128;
  yield_share_percent: i128; // Basis points (1000 = 10%)
}

interface LPDeposit {
  depositor: Address;
  total_deposited: i128;
  locked_amount: i128;
  available_amount: i128;
  total_interest_earned: i128;
}
```

#### B. Update OracleService
**Contract Functions:**
```typescript
- submit_price(bot, asset, price)  // Bot only
- get_price(asset) → i128          // Basis points
- get_price_data(asset) → (i128, u64) // (price, timestamp)
```

#### C. Update MockRWAService
**Contract Functions:**
```typescript
- balance(account) → i128
- transfer(from, to, amount)
- approve(owner, spender, amount)
- transfer_from(spender, from, to, amount)
- burn(from, amount)
- allowed(account) → bool
- allow_user(user, operator)       // Manager only
- disallow_user(user, operator)    // Manager only
```

---

### Phase 2: Wallet Integration

#### Create Freighter Wallet Hook
**File**: `src/hooks/useFreighterWallet.ts`

```typescript
import { useState, useEffect } from 'react';
import type { StellarWalletProvider } from '@/services/contracts';

export function useFreighterWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isFreighterInstalled, setIsFreighterInstalled] = useState(false);

  useEffect(() => {
    // Check if Freighter is installed
    const checkFreighter = async () => {
      if (window.freighter) {
        setIsFreighterInstalled(true);
        // Check if already connected
        const publicKey = await window.freighter.getPublicKey();
        if (publicKey) {
          setAddress(publicKey);
          setIsConnected(true);
        }
      }
    };
    checkFreighter();
  }, []);

  const connect = async () => {
    if (!window.freighter) {
      alert('Please install Freighter wallet extension');
      return;
    }

    try {
      const publicKey = await window.freighter.getPublicKey();
      setAddress(publicKey);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setIsConnected(false);
  };

  const getWalletProvider = (): StellarWalletProvider | undefined => {
    if (!address) return undefined;

    return {
      address,
      networkPassphrase: 'Test SDF Network ; September 2015',
      signTransaction: async (xdr: string, options) => {
        const signedTxXdr = await window.freighter.signTransaction(xdr, {
          network: 'testnet',
          networkPassphrase: options.networkPassphrase,
        });
        return { signedTxXdr };
      },
    };
  };

  return {
    address,
    isConnected,
    isFreighterInstalled,
    connect,
    disconnect,
    getWalletProvider,
  };
}
```

---

### Phase 3: Page Integration

#### A. Dashboard - Wallet Connection
**File**: `src/pages/Dashboard.tsx`

**Requirements:**
1. Connect wallet button in header
2. Display connected address
3. Show wallet balances (RWA, stRWA, USDC)
4. Quick action buttons (Stake, Borrow)

#### B. Stake Page
**File**: `src/pages/Stake.tsx`

**Flow:**
1. Display RWA balance
2. Display stRWA balance
3. Display claimable yield
4. Input amount to stake/unstake
5. Execute transactions:
   - For Stake: `rwa.approve()` → `vault.stake()`
   - For Unstake: `vault.unstake()`
   - For Claim: `vault.claim_yield()`

#### C. Borrow Page
**File**: `src/pages/Borrow.tsx`

**Flow:**
1. Display stRWA balance (available collateral)
2. Get current stRWA price from oracle
3. Calculate max borrow amount (140% LTV)
4. Input collateral and loan amount
5. Display health factor preview
6. Execute: `strwa.approve()` → `lendingPool.originate_loan()`
7. For repayment: `usdc.approve()` → `lendingPool.repay_loan()`

#### D. Profile Page
**File**: `src/pages/Profile.tsx`

**Display:**
1. All token balances
2. Active loans with health meters
3. Staking positions
4. Transaction history (from events)

---

## 📋 Integration Checklist

### Service Layer
- [x] Contract addresses configured
- [x] USDC Service created
- [x] StakedRWA Service created
- [x] VaultService updated
- [ ] LendingPoolService updated
- [ ] OracleService updated
- [ ] MockRWAService updated

### Wallet Integration
- [ ] Freighter hook created
- [ ] Wallet provider type definitions
- [ ] Connect/disconnect functionality
- [ ] Transaction signing

### Page Integration
- [ ] Dashboard wallet connection
- [ ] Stake page contract integration
- [ ] Borrow page contract integration
- [ ] Profile page contract integration

### Testing
- [ ] Validation script created
- [ ] All contract calls tested
- [ ] Explorer verification

---

## 🧪 Testing Strategy

### Validation Script
**File**: `scripts/test-contract-integration.ts`

**Tests:**
1. Wallet connection
2. Read operations (balances, prices)
3. Approve transactions
4. Stake/unstake
5. Borrow/repay
6. Event listening

**Usage:**
```bash
npm run test:integration
```

---

## 🔑 Environment Variables

**File**: `.env.local`
```bash
VITE_STELLAR_NETWORK=testnet
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

---

## 📝 Notes

- All amounts use BigInt for precision
- USDC uses 7 decimals
- RWA/stRWA use 18 decimals
- Prices in basis points (100 = 1.00 USDC)
- Interest rates in basis points (700 = 7%)

---

**Next Steps:**
1. Complete remaining service updates
2. Implement Freighter wallet hook
3. Integrate wallet connection in Dashboard
4. Integrate Stake page
5. Integrate Borrow page
6. Create validation script
7. Test all contract calls
