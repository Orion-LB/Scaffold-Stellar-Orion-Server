# Backend Integration Guide - Orion RWA Platform

## 📋 Table of Contents
1. [User Flow Journey](#user-flow-journey)
2. [Contract Architecture](#contract-architecture)
3. [Service Layer Functions](#service-layer-functions)
4. [Frontend Contract Mapping](#frontend-contract-mapping)
5. [Missing Backend Functions](#missing-backend-functions)
6. [Deployment Checklist](#deployment-checklist)

---

## 🚀 User Flow Journey

### Step 1: User Lands on Homepage
**Location:** `/` (Home page)
- User sees landing page with "Launch App" button
- **No contract calls yet**

### Step 2: User Clicks "Launch App"
**Location:** `/dashboard`
**Action:** Redirects to dashboard

**Initial Contract Calls (Auto-triggered):**
```
DashboardNavbar.tsx:
├── useContractServices() hook initialized
├── Freighter wallet detection
└── No balance loading until wallet connected
```

### Step 3: User Connects Wallet
**Component:** `DashboardNavbar.tsx`
**Action:** User clicks "Connect Wallet" button
**Contract Calls:** None yet (just wallet connection via Freighter)

**After Connection - Auto Data Loading:**
```typescript
// All 3 dashboard sections start loading data in parallel:

StakeSection.tsx (useEffect triggered):
├── rwaService.balance(address)           // Get RWA balance
├── stRwaService.balance(address)         // Get stRWA balance
└── vaultService.claimable_yield(address) // Get claimable yield

BorrowSection.tsx (useEffect triggered):
├── stRwaService.balance(address)              // Get stRWA balance
├── usdcService.balance(address)               // Get USDC balance
├── lendingPoolService.get_loan(address)       // Get active loan info
└── oracleService.get_price(CONTRACT_ADDRESSES.STAKED_RWA_A) // Get stRWA price

ProfileSection.tsx (useEffect triggered):
├── rwaService.balance(address)                  // Get RWA balance
├── stRwaService.balance(address)                // Get stRWA balance
├── usdcService.balance(address)                 // Get USDC balance
├── vaultService.claimable_yield(address)        // Get claimable yield
├── lendingPoolService.get_loan(address)         // Get loan info
└── oracleService.get_price()                    // Get oracle price
```

**Auto-refresh Intervals:**
- StakeSection: Every 10 seconds
- BorrowSection: Every 10 seconds
- ProfileSection: Every 15 seconds

---

## 📊 Stake Section - User Flow

### Flow 1: Get RWA Tokens (Minting)
**User Action:** Clicks "Get RWA Tokens" button

**Current Status:** ❌ **MISSING - Backend function required**

**Required Backend Function:**
```rust
// In RWA Token Contract
pub fn mint_rwa_tokens(env: Env, to: Address, amount: i128) -> Result<(), Error> {
    // 1. Mint RWA tokens to user
    // 2. Automatically whitelist user (call allow_user internally)
    // 3. For hackathon: No admin check (anyone can call)
    // 4. Suggested amount: 1000 RWA tokens (1000 * 10^18)
}
```

**Frontend Call Location:** `StakeSection.tsx:82-106`
```typescript
const handleGetMockRWA = async () => {
  // TODO: Uncomment when backend ready
  // const mintAmount = BigInt(1000 * 1e18);
  // const result = await rwaService.mint_rwa_tokens(address, mintAmount);
}
```

---

### Flow 2: Stake RWA Tokens
**User Action:**
1. Enters stake amount
2. Clicks "Stake RWA" button

**Contract Call Sequence:**
```typescript
// Step 1: Approve vault to spend RWA
await rwaService.approve(
  userAddress,
  CONTRACT_ADDRESSES.RWA_VAULT_A,
  amount  // e.g., 100 * 10^18 for 100 RWA
)

// Step 2: Stake RWA tokens
await vaultService.stake(userAddress, amount)

// Step 3: Refresh balances
await rwaService.balance(address)
await stRwaService.balance(address)
```

**⚠️ Backend Modification Required:**
```rust
// In Vault Contract - stake() function should:
pub fn stake(env: Env, user: Address, amount: i128) -> Result<(), Error> {
    // 1. Check if user is whitelisted in RWA token
    let is_whitelisted = rwa_token.allowed(&user);

    // 2. If NOT whitelisted, auto-whitelist
    if !is_whitelisted {
        rwa_token.allow_user(&user); // Auto-whitelist!
    }

    // 3. Transfer RWA from user to vault
    rwa_token.transfer_from(&user, &vault_address, &amount);

    // 4. Mint stRWA 1:1 to user
    strwa_token.mint(&user, &amount);

    Ok(())
}
```

**Frontend Call Location:** `StakeSection.tsx:109-172`

---

### Flow 3: Unstake RWA Tokens
**User Action:**
1. Switches to "Unstake" mode
2. Enters unstake amount
3. Clicks "Unstake" button

**Contract Call Sequence:**
```typescript
// Direct call - no approval needed (burning stRWA)
await vaultService.unstake(userAddress, amount)

// Refresh balances
await rwaService.balance(address)
await stRwaService.balance(address)
```

**Backend Function:** `vault_contract::unstake()` - Already exists ✅

**Frontend Call Location:** `StakeSection.tsx:175-217`

---

### Flow 4: Claim Yield
**User Action:** Clicks "Claim Yield" button

**Contract Call Sequence:**
```typescript
// Claim USDC yield
await vaultService.claim_yield(userAddress)

// Refresh balances
const yield_amount = await vaultService.claimable_yield(address)
```

**Backend Function:** `vault_contract::claim_yield()` - Already exists ✅

**Frontend Call Location:** `StakeSection.tsx:220-250`

---

## 💰 Borrow Section - User Flow

### Flow 1: Select Collateral
**User Action:**
1. Clicks "Add Collateral" button
2. Selects percentage for each platform token (OrionAlexRWA, OrionEthRWA, OrionBtcRWA)
3. Total must equal 100%

**Contract Calls:** None (pure frontend state management)

**Frontend Location:** `BorrowSection.tsx:293-299`
```typescript
const setAssetPercentage = (assetId: string, percentage: number) => {
  setCollateralPercentages(prev => ({
    ...prev,
    [assetId]: percentage
  }));
};
```

---

### Flow 2: Borrow USDC/XLM
**User Action:**
1. Enters borrow amount
2. Selects asset (USDC or XLM)
3. Adds collateral (must be 100%)
4. Clicks "Borrow" button

**Contract Call Sequence:**
```typescript
// Step 1: Approve lending pool to spend stRWA collateral
await stRwaService.approve(
  userAddress,
  CONTRACT_ADDRESSES.LENDING_POOL,
  collateralAmount  // Total stRWA from all selected percentages
)

// Step 2: Originate loan
await lendingPoolService.originate_loan(
  userAddress,
  collateralAmount,  // stRWA, 18 decimals
  loanAmount,        // USDC, 7 decimals
  12                 // Duration in months
)

// Step 3: Refresh balances
await stRwaService.balance(address)
await usdcService.balance(address)
await lendingPoolService.get_loan(address)
```

**Backend Function:** `lending_pool::originate_loan()` - Already exists ✅

**Requirements:**
- Health factor ≥ 1.4 (140% collateralization)
- No existing active loan
- Oracle price < 24 hours old
- Sufficient pool liquidity

**Frontend Call Location:** `BorrowSection.tsx:123-222`

---

### Flow 3: Repay Loan
**User Action:** Clicks "Repay Loan" button (shown when active loan exists)

**Contract Call Sequence:**
```typescript
// Step 1: Approve lending pool to spend USDC
await usdcService.approve(
  userAddress,
  CONTRACT_ADDRESSES.LENDING_POOL,
  repayAmount  // Outstanding debt amount
)

// Step 2: Repay loan
await lendingPoolService.repay_loan(userAddress, repayAmount)

// Step 3: Refresh balances
await stRwaService.balance(address)
await usdcService.balance(address)
await lendingPoolService.get_loan(address)
```

**Backend Logic:**
1. Auto-pulls vault yield first
2. User pays remainder
3. Distributes LP share (10-20%)
4. Reduces principal
5. Auto-closes if debt reaches 0

**Backend Function:** `lending_pool::repay_loan()` - Already exists ✅

**Frontend Call Location:** `BorrowSection.tsx:224-282`

---

## 👤 Profile Section - User Flow

### Flow 1: View Portfolio
**User Action:** Dashboard loads automatically

**Auto Contract Calls:**
```typescript
// Loads every 15 seconds
await rwaService.balance(address)
await stRwaService.balance(address)
await usdcService.balance(address)
await vaultService.claimable_yield(address)
await lendingPoolService.get_loan(address)
await oracleService.get_price()
```

**Calculations Done Frontend:**
```typescript
// Portfolio Value
const rwaValue = rwaBalance * 1  // Assuming RWA = $1
const stRwaValue = stRwaBalance * (stRwaPrice / 100)
const usdcValue = usdcBalance
const totalPortfolioValue = rwaValue + stRwaValue + usdcValue

// Health Factor
const collateralValue = loan.collateral * (stRwaPrice / 100)
const debtValue = loan.debt
const healthFactor = collateralValue / debtValue
```

**Frontend Location:** `ProfileSection.tsx:56-84`

---

### Flow 2: Claim Yield (from Profile)
**User Action:** Clicks "Claim Available Yield" in yield modal

**Contract Call:** Same as Stake Section Flow 4

```typescript
await vaultService.claim_yield(userAddress)

// Refresh
await vaultService.claimable_yield(address)
await usdcService.balance(address)
```

**Frontend Call Location:** `ProfileSection.tsx:168-198`

---

## 🏗️ Contract Architecture

### Contract Addresses (Stellar Testnet)

```typescript
export const CONTRACT_ADDRESSES = {
  USDC: "CAXHQJ6IHN2TPAJ4NEOXJJLRRAO74BEAWA3RXHD6NSOWRBQCTVZA3ZGS",
  MOCK_RWA_A: "CCHUQ75NY5CFWIXG42RJRZQDMZ2HOAERS4RSX4EL6EEOUE6OMOFLBFVV",
  STAKED_RWA_A: "CCCTL6UHRPOODYKYOXAW6Y3NKOFPFKB7QIYRRYGEANM2KHYYYAT4PJUS",
  RWA_VAULT_A: "CB3I43AX6VBYTHLVGXK3TVM5RZXLTSHT5RIHOTK2BHORNQY3RF3QH2TT",
  LENDING_POOL: "CBJM554JCHWRFG7QFBKMPAPOO4DBJPLKHSH2T7U4FRLCPDS36U44WT5Y",
  MOCK_ORACLE: "CD5XYT6WXOB567JC3QZGJ7RWHWP4N3C4GJ5LX75WDWUGL7NPXFJJC6AZ",
};
```

**⚠️ Update Required After Redeployment:**
All contract addresses must be updated in `/src/services/contracts/index.ts` after backend contracts are redeployed with new functions.

---

### Contract Dependencies

```
┌─────────────────┐
│   Frontend UI   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Service Layer   │
├─────────────────┤
│ - RWAService    │──┐
│ - StRWAService  │  │
│ - VaultService  │  │
│ - LendingPool   │  │
│ - OracleService │  │
│ - USDCService   │  │
└────────┬────────┘  │
         │           │
         ▼           ▼
┌──────────────────────────┐
│  Soroban Smart Contracts │
├──────────────────────────┤
│ 1. RWA Token Contract    │
│    - Whitelisted ERC-20  │
│    - 18 decimals         │
│                          │
│ 2. stRWA Token Contract  │
│    - Receipt token       │
│    - 18 decimals         │
│                          │
│ 3. Vault Contract        │
│    - Stake/Unstake       │
│    - Yield distribution  │
│                          │
│ 4. Lending Pool Contract │
│    - Loan origination    │
│    - Repayment           │
│    - Liquidation         │
│                          │
│ 5. Oracle Contract       │
│    - Price feeds         │
│    - Basis points        │
│                          │
│ 6. USDC Mock Contract    │
│    - Standard ERC-20     │
│    - 7 decimals          │
└──────────────────────────┘
```

---

## 🔧 Service Layer Functions

### 1. RWAService (MockRWAService.ts)

**Implemented Functions:**
```typescript
✅ balance(account: string): Promise<bigint>
✅ allowed(account: string): Promise<boolean>
✅ allowance(owner, spender): Promise<bigint>
✅ total_supply(): Promise<bigint>
✅ transfer(from, to, amount): Promise<TransactionResult>
✅ approve(owner, spender, amount): Promise<TransactionResult>
✅ transfer_from(spender, from, to, amount): Promise<TransactionResult>
✅ burn(from, amount): Promise<TransactionResult>
✅ allow_user(user, operator): Promise<TransactionResult>
✅ disallow_user(user, operator): Promise<TransactionResult>
```

**Missing Functions:**
```typescript
❌ mint_rwa_tokens(to: string, amount: bigint): Promise<TransactionResult>
   // Required for "Get RWA Tokens" button
   // Should mint + auto-whitelist user
```

**Frontend Usage:**
- StakeSection: balance(), approve(), mint_rwa_tokens() [missing]
- ProfileSection: balance()

---

### 2. StRWAService (StakedRWAService.ts)

**Implemented Functions:**
```typescript
✅ balance(account: string): Promise<bigint>
✅ allowance(owner, spender): Promise<bigint>
✅ totalSupply(): Promise<bigint>
✅ transfer(from, to, amount): Promise<TransactionResult>
✅ approve(owner, spender, amount): Promise<TransactionResult>
```

**Frontend Usage:**
- All sections: balance()
- BorrowSection: approve() (for collateral)
- ProfileSection: balance()

---

### 3. VaultService (VaultService.ts)

**Implemented Functions:**
```typescript
✅ claimable_yield(userAddress): Promise<bigint>
✅ stake(userAddress, amount): Promise<TransactionResult>
✅ unstake(userAddress, amount): Promise<TransactionResult>
✅ claim_yield(userAddress): Promise<TransactionResult>
✅ admin_fund_yield(amount): Promise<TransactionResult>
✅ set_usdc_address(usdcAddress): Promise<TransactionResult>
✅ set_lending_pool(lendingPoolAddress): Promise<TransactionResult>
```

**Required Modification:**
```rust
// vault_contract::stake() should auto-whitelist
❗ Modify stake() to check whitelist and call allow_user() if needed
```

**Frontend Usage:**
- StakeSection: stake(), unstake(), claim_yield(), claimable_yield()
- ProfileSection: claimable_yield(), claim_yield()

---

### 4. LendingPoolService (LendingPoolService.ts)

**Implemented Functions:**
```typescript
✅ lp_deposit(depositor, amount): Promise<TransactionResult>
✅ lp_withdraw(depositor, amount): Promise<TransactionResult>
✅ get_lp_deposit(depositor): Promise<LPDeposit | null>
✅ originate_loan(borrower, collateral, loan, duration): Promise<TransactionResult>
✅ repay_loan(borrower, amount): Promise<TransactionResult>
✅ close_loan_early(borrower): Promise<TransactionResult>
✅ get_loan(borrower): Promise<LoanInfo | null>
✅ check_and_issue_warning(borrower): Promise<TransactionResult>
✅ liquidate_loan(caller, borrower): Promise<TransactionResult>
✅ update_loan_interest(borrower): Promise<TransactionResult>
✅ set_liquidation_bot(caller, bot): Promise<TransactionResult>
✅ update_token_risk_profile(...): Promise<TransactionResult>
✅ get_total_liquidity(): Promise<bigint>
✅ get_available_liquidity(): Promise<bigint>
✅ get_token_risk_profile(rwa_token): Promise<TokenRiskProfile | null>
```

**Frontend Usage:**
- BorrowSection: originate_loan(), repay_loan(), get_loan()
- ProfileSection: get_loan()

---

### 5. OracleService (OracleService.ts)

**Implemented Functions:**
```typescript
✅ get_price(asset: string): Promise<bigint>
✅ get_price_data(asset: string): Promise<PriceData>
✅ submit_price(bot, asset, price): Promise<TransactionResult>
```

**Frontend Usage:**
- BorrowSection: get_price() (for stRWA price)
- ProfileSection: get_price() (for portfolio valuation)

**⚠️ Price Bot Required:**
Prices must be updated regularly (< 24 hours) by authorized bot calling `submit_price()`

---

### 6. USDCService (USDCService.ts)

**Implemented Functions:**
```typescript
✅ balance(accountAddress): Promise<bigint>
✅ allowance(owner, spender): Promise<bigint>
✅ transfer(from, to, amount): Promise<TransactionResult>
✅ approve(owner, spender, amount): Promise<TransactionResult>
✅ transferFrom(spender, from, to, amount): Promise<TransactionResult>
✅ mint(admin, to, amount): Promise<TransactionResult>
```

**Frontend Usage:**
- BorrowSection: balance(), approve() (for repayment)
- ProfileSection: balance()

---

## 📝 Frontend Contract Call Mapping

### StakeSection.tsx - Complete Flow

```typescript
// Initial Load (useEffect)
useEffect(() => {
  if (!isConnected || !address) return;

  const loadBalances = async () => {
    const [rwa, stRwa, yield_amount] = await Promise.all([
      rwaService.balance(address),        // ✅ Exists
      stRwaService.balance(address),      // ✅ Exists
      vaultService.claimable_yield(address) // ✅ Exists
    ]);
    // ... setState
  };

  loadBalances();
  setInterval(loadBalances, 10000); // Every 10s
}, [isConnected, address]);

// Get RWA Tokens Button
const handleGetMockRWA = async () => {
  // ❌ MISSING - Backend function needed
  // const result = await rwaService.mint_rwa_tokens(address, BigInt(1000 * 1e18));

  toast.info("RWA Token minting function not yet implemented in backend");
};

// Stake Button
const handleStake = async () => {
  // Step 1: Approve
  await rwaService.approve(          // ✅ Exists
    address,
    CONTRACT_ADDRESSES.RWA_VAULT_A,
    amount
  );

  // Step 2: Stake
  // ❗ Backend should auto-whitelist in this function
  await vaultService.stake(address, amount); // ✅ Exists (needs modification)

  // Step 3: Refresh
  const [rwa, stRwa] = await Promise.all([
    rwaService.balance(address),     // ✅ Exists
    stRwaService.balance(address)    // ✅ Exists
  ]);
};

// Unstake Button
const handleUnstake = async () => {
  await vaultService.unstake(address, amount); // ✅ Exists

  // Refresh balances
  await rwaService.balance(address);    // ✅ Exists
  await stRwaService.balance(address);  // ✅ Exists
};

// Claim Yield Button
const handleClaimYield = async () => {
  await vaultService.claim_yield(address); // ✅ Exists

  // Refresh yield
  const yield_amount = await vaultService.claimable_yield(address); // ✅ Exists
};
```

---

### BorrowSection.tsx - Complete Flow

```typescript
// Initial Load (useEffect)
useEffect(() => {
  if (!isConnected || !address) return;

  const loadData = async () => {
    const [stRwa, usdc, loan, price] = await Promise.all([
      stRwaService.balance(address),                            // ✅ Exists
      usdcService.balance(address),                             // ✅ Exists
      lendingPoolService.get_loan(address),                     // ✅ Exists
      oracleService.get_price(CONTRACT_ADDRESSES.STAKED_RWA_A)  // ✅ Exists
    ]);
    // ... setState
  };

  loadData();
  setInterval(loadData, 10000); // Every 10s
}, [isConnected, address]);

// Borrow Button
const handleBorrow = async () => {
  // Validation
  if (getTotalPercentage() !== 100) {
    toast.error("Total collateral must be 100%");
    return;
  }

  // Calculate total collateral from percentages
  const totalCollateral = calculateTotalFromPercentages();

  // Step 1: Approve collateral
  await stRwaService.approve(                // ✅ Exists
    address,
    CONTRACT_ADDRESSES.LENDING_POOL,
    collateral
  );

  // Step 2: Originate loan
  await lendingPoolService.originate_loan(   // ✅ Exists
    address,
    collateral,  // stRWA, 18 decimals
    loanAmt,     // USDC, 7 decimals
    12           // 12 months
  );

  // Step 3: Refresh
  const [stRwa, usdc, loan] = await Promise.all([
    stRwaService.balance(address),           // ✅ Exists
    usdcService.balance(address),            // ✅ Exists
    lendingPoolService.get_loan(address)     // ✅ Exists
  ]);
};

// Repay Loan Button
const handleRepayLoan = async () => {
  const repayAmount = activeLoan.outstanding_debt;

  // Step 1: Approve USDC
  await usdcService.approve(                 // ✅ Exists
    address,
    CONTRACT_ADDRESSES.LENDING_POOL,
    repayAmount
  );

  // Step 2: Repay
  await lendingPoolService.repay_loan(       // ✅ Exists
    address,
    repayAmount
  );

  // Step 3: Refresh
  const [stRwa, usdc, loan] = await Promise.all([
    stRwaService.balance(address),           // ✅ Exists
    usdcService.balance(address),            // ✅ Exists
    lendingPoolService.get_loan(address)     // ✅ Exists
  ]);
};
```

---

### ProfileSection.tsx - Complete Flow

```typescript
// Initial Load (useEffect)
useEffect(() => {
  if (!isConnected || !address) return;

  const loadData = async () => {
    const [rwa, stRwa, usdc, yield_amount, loan, price] = await Promise.all([
      rwaService.balance(address),              // ✅ Exists
      stRwaService.balance(address),            // ✅ Exists
      usdcService.balance(address),             // ✅ Exists
      vaultService.claimable_yield(address),    // ✅ Exists
      lendingPoolService.get_loan(address),     // ✅ Exists
      oracleService.get_price()                 // ✅ Exists
    ]);
    // ... setState
  };

  loadData();
  setInterval(loadData, 15000); // Every 15s
}, [isConnected, address]);

// Claim Yield Button (in modal)
const handleClaimYield = async () => {
  await vaultService.claim_yield(address);      // ✅ Exists

  // Refresh
  const [yield_amount, usdc] = await Promise.all([
    vaultService.claimable_yield(address),      // ✅ Exists
    usdcService.balance(address)                // ✅ Exists
  ]);
};
```

---

## ❌ Missing Backend Functions

### 1. RWA Token Minting Function (CRITICAL)

**Function:** `mint_rwa_tokens()`

**Contract:** RWA Token Contract (`MOCK_RWA_A`)

**Required Signature:**
```rust
pub fn mint_rwa_tokens(env: Env, to: Address, amount: i128) -> Result<(), Error> {
    // 1. Mint RWA tokens to the specified address
    token::mint(&env, &to, amount);

    // 2. Automatically whitelist the user
    storage::allow_user(&env, &to);

    // 3. For hackathon: No admin check (anyone can mint)
    // In production: Add rate limiting or admin check

    Ok(())
}
```

**Why Needed:**
- Users need initial RWA tokens to start staking
- Should auto-whitelist so users can transfer immediately
- Suggested amount: 1000 RWA tokens (1000 × 10^18)

**Frontend Integration:**
```typescript
// Add to MockRWAService.ts
async mint_rwa_tokens(
  to: string,
  amount: bigint,
  wallet?: StellarWalletProvider
): Promise<TransactionResult> {
  return this.invokeContract(
    "mint_rwa_tokens",
    {
      to: this.createAddress(to),
      amount: amount
    },
    wallet
  );
}
```

**Usage in StakeSection:**
```typescript
const handleGetMockRWA = async () => {
  const mintAmount = BigInt(1000 * 1e18); // 1000 RWA tokens
  const result = await rwaService.mint_rwa_tokens(address, mintAmount);

  if (result.success) {
    toast.success("Successfully minted 1000 RWA tokens!");
    // Refresh balance
    const rwa = await rwaService.balance(address);
    setRwaBalance(rwa);
  }
};
```

---

### 2. Auto-Whitelist on Stake (IMPORTANT)

**Function:** Modify existing `stake()` function

**Contract:** Vault Contract (`RWA_VAULT_A`)

**Current Function:**
```rust
pub fn stake(env: Env, user: Address, amount: i128) -> Result<(), Error> {
    // Transfer RWA from user to vault
    // Mint stRWA to user
}
```

**Required Modification:**
```rust
pub fn stake(env: Env, user: Address, amount: i128) -> Result<(), Error> {
    // NEW: Check if user is whitelisted
    let rwa_token = token::Client::new(&env, &get_rwa_token_address(&env));
    let is_whitelisted = rwa_token.allowed(&user);

    // NEW: If not whitelisted, auto-whitelist them
    if !is_whitelisted {
        rwa_token.allow_user(&user);
    }

    // Existing logic:
    // 1. Transfer RWA from user to vault
    rwa_token.transfer_from(&user, &vault_address, &amount);

    // 2. Mint stRWA 1:1 to user
    let strwa_token = token::Client::new(&env, &get_strwa_token_address(&env));
    strwa_token.mint(&user, &amount);

    Ok(())
}
```

**Why Needed:**
- Users shouldn't need manual admin approval before staking
- Seamless UX - user gets RWA tokens and can stake immediately
- Reduces friction in user onboarding

**No Frontend Changes Required** - existing code will work automatically

---

## 🎯 Deployment Checklist

### Pre-Deployment

- [ ] **1. Add `mint_rwa_tokens()` to RWA Token Contract**
  - Function signature matches specification
  - Mints specified amount to user
  - Auto-whitelists user
  - No admin check for hackathon version

- [ ] **2. Modify `stake()` in Vault Contract**
  - Checks if user is whitelisted
  - Auto-whitelists if not
  - Maintains existing staking logic

- [ ] **3. Set Up Oracle Price Bot**
  - Bot authorized in Oracle contract
  - Submits stRWA price regularly (< 24 hours)
  - Price in basis points (e.g., 10500 = $105.00)

- [ ] **4. Initialize Contracts**
  - Set USDC address in Vault
  - Set Lending Pool address in Vault
  - Set liquidation bot in Lending Pool
  - Update token risk profile in Lending Pool

---

### Deployment Steps

1. **Deploy Contracts to Testnet**
   ```bash
   # Deploy all 6 contracts
   # Get new contract addresses
   ```

2. **Update Frontend Contract Addresses**
   ```typescript
   // File: src/services/contracts/index.ts
   export const CONTRACT_ADDRESSES = {
     USDC: "NEW_USDC_ADDRESS",
     MOCK_RWA_A: "NEW_RWA_ADDRESS",
     STAKED_RWA_A: "NEW_STRWA_ADDRESS",
     RWA_VAULT_A: "NEW_VAULT_ADDRESS",
     LENDING_POOL: "NEW_LENDING_POOL_ADDRESS",
     MOCK_ORACLE: "NEW_ORACLE_ADDRESS",
   };
   ```

3. **Initialize Vault Contract**
   ```typescript
   // Set USDC address (one-time only)
   await vaultService.set_usdc_address(CONTRACT_ADDRESSES.USDC);

   // Set Lending Pool address (one-time only)
   await vaultService.set_lending_pool(CONTRACT_ADDRESSES.LENDING_POOL);
   ```

4. **Initialize Lending Pool**
   ```typescript
   // Set liquidation bot
   await lendingPoolService.set_liquidation_bot(adminAddress, botAddress);

   // Update RWA token risk profile
   await lendingPoolService.update_token_risk_profile(
     adminAddress,
     CONTRACT_ADDRESSES.MOCK_RWA_A,
     BigInt(500),  // 5% yield APR
     BigInt(Date.now() + 365 * 24 * 60 * 60 * 1000)  // 1 year expiry
   );
   ```

5. **Fund Contracts for Testing**
   ```typescript
   // Mint test USDC to users
   await usdcService.mint(adminAddress, userAddress, BigInt(10000 * 1e7));

   // Fund vault yield pool (optional)
   await vaultService.admin_fund_yield(BigInt(1000 * 1e7)); // 1000 USDC

   // Deposit to lending pool as LP (optional)
   await lendingPoolService.lp_deposit(lpAddress, BigInt(50000 * 1e7)); // 50k USDC
   ```

6. **Start Oracle Price Bot**
   ```typescript
   // Submit initial price
   await oracleService.submit_price(
     botAddress,
     CONTRACT_ADDRESSES.STAKED_RWA_A,
     BigInt(10500)  // $105.00 in basis points
   );

   // Set up cron job to update price every 12 hours
   ```

---

### Post-Deployment Testing

- [ ] **Test Minting Flow**
  1. Connect wallet
  2. Click "Get RWA Tokens"
  3. Verify 1000 RWA minted
  4. Verify auto-whitelisted

- [ ] **Test Staking Flow**
  1. Enter stake amount
  2. Click "Stake RWA"
  3. Verify approval transaction
  4. Verify stake transaction
  5. Verify stRWA minted 1:1
  6. Verify auto-whitelist works

- [ ] **Test Borrowing Flow**
  1. Select collateral (100% total)
  2. Enter borrow amount
  3. Click "Borrow"
  4. Verify collateral locked
  5. Verify USDC received
  6. Verify health factor calculated

- [ ] **Test Repayment Flow**
  1. Click "Repay Loan"
  2. Verify USDC approval
  3. Verify repayment transaction
  4. Verify collateral returned
  5. Verify loan closed

- [ ] **Test Yield Claiming**
  1. Fund yield pool
  2. Wait for yield to accumulate
  3. Click "Claim Yield"
  4. Verify USDC received

---

## 🔄 Service Layer Structure

```
src/services/contracts/
├── index.ts                    # Contract addresses & exports
├── ContractService.ts          # Base abstract class
├── MockRWAService.ts           # RWA Token (needs mint_rwa_tokens)
├── StakedRWAService.ts         # stRWA Token
├── VaultService.ts             # Vault (needs stake modification)
├── LendingPoolService.ts       # Lending Pool
├── OracleService.ts            # Price Oracle
└── USDCService.ts              # USDC Mock Token
```

### Adding Missing Functions

**Step 1: Update Service File**
```typescript
// File: src/services/contracts/MockRWAService.ts

// Add to class:
async mint_rwa_tokens(
  to: string,
  amount: bigint,
  wallet?: StellarWalletProvider
): Promise<TransactionResult> {
  return this.invokeContract(
    "mint_rwa_tokens",
    {
      to: this.createAddress(to),
      amount: amount
    },
    wallet
  );
}
```

**Step 2: Use in Frontend**
```typescript
// File: src/components/dashboard/StakeSection.tsx

const handleGetMockRWA = async () => {
  setLoading(true);
  try {
    const mintAmount = BigInt(1000 * 1e18);
    const result = await rwaService.mint_rwa_tokens(address, mintAmount);

    if (result.success) {
      toast.success("Successfully minted 1000 RWA tokens!");
      const rwa = await rwaService.balance(address);
      setRwaBalance(rwa);
    } else {
      toast.error("Minting failed");
    }
  } catch (error: any) {
    toast.error(error.message || "Minting failed");
  } finally {
    setLoading(false);
  }
};
```

---

## 📊 Data Flow Summary

### Read Operations (No Wallet Signature)
```
Frontend Component
    ↓
Service Layer (queryContract)
    ↓
Stellar RPC (simulate)
    ↓
Smart Contract (read state)
    ↓
Return data
```

### Write Operations (Requires Wallet Signature)
```
Frontend Component (user action)
    ↓
Service Layer (invokeContract)
    ↓
Build Transaction
    ↓
Simulate Transaction
    ↓
Prepare Transaction
    ↓
Freighter Wallet (user signs)
    ↓
Submit to Stellar Network
    ↓
Poll for Confirmation
    ↓
Return result
```

---

## 🎯 Quick Reference

### Contract Call Patterns

**Balance Check:**
```typescript
const balance = await tokenService.balance(address);
// Returns: bigint (e.g., 1000000000000000000 = 1 token with 18 decimals)
```

**Approve + Action:**
```typescript
// 1. Approve spender
await tokenService.approve(owner, spender, amount);
// 2. Perform action
await contractService.action(params);
```

**Transaction with Refresh:**
```typescript
const result = await service.action(params);
if (result.success) {
  // Refresh affected balances
  const newBalance = await service.balance(address);
}
```

### Common Conversions

**RWA/stRWA (18 decimals):**
```typescript
const amount = BigInt(100 * 1e18);  // 100 tokens
const readable = Number(amount) / 1e18;  // 100
```

**USDC (7 decimals):**
```typescript
const amount = BigInt(100 * 1e7);  // 100 USDC
const readable = Number(amount) / 1e7;  // 100
```

**Oracle Price (basis points):**
```typescript
const price = BigInt(10500);  // 105.00 USDC
const usd = Number(price) / 100;  // 105.00
```

---

## 📞 Support

For questions about backend integration:
1. Check this documentation first
2. Review `BACKEND_REQUIREMENTS.md` for function specifications
3. Examine service layer files in `/src/services/contracts/`
4. Test contract functions using Stellar testnet explorer

---

**Last Updated:** 2025-01-09
**Frontend Version:** Latest with multi-asset collateral
**Backend Status:** Awaiting mint_rwa_tokens() and stake() modification
