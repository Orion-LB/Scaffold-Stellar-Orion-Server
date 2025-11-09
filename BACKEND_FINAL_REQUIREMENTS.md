# 🔧 Backend Final Requirements - Option A: Full Multi-Asset

## Overview

This document specifies **exactly what needs to be built** for the full multi-asset RWA platform.

**Architecture:** 3 distinct asset types, each with complete contract set
**Timeline:** 3-4 days
**Deliverables:** 9 new contracts + 2 updated contracts

---

## 📊 Contract Architecture

### Asset Types to Support:

```
1. Invoice Financing (short-term receivables)
2. US Treasury Bills (government securities)
3. Real Estate Tokens (property equity)
```

### Contract Structure:

```
SHARED INFRASTRUCTURE (2 contracts):
├── USDC Token          ✅ DEPLOYED (no changes)
├── Lending Pool        🔄 UPDATE for multi-collateral
└── Oracle              ✅ DEPLOYED (no changes needed)

ASSET SET 1: INVOICES (3 contracts):
├── RWA_Invoices        ❌ NEW
├── stRWA_Invoices      ❌ NEW
└── Vault_Invoices      ❌ NEW

ASSET SET 2: TBILLS (3 contracts):
├── RWA_TBills          ❌ NEW
├── stRWA_TBills        ❌ NEW
└── Vault_TBills        ❌ NEW

ASSET SET 3: REAL ESTATE (3 contracts):
├── RWA_RealEstate      ❌ NEW
├── stRWA_RealEstate    ❌ NEW
└── Vault_RealEstate    ❌ NEW
```

**Total:** 9 new deployments + 1 contract update

---

## 🆕 New Contracts to Deploy

### 1. RWA Token Contracts (3x)

**Contract:** `rwa_token.rs`
**Deploy:** 3 times (once per asset type)

**Required Functions:**

#### A. mint_rwa_tokens()
```rust
pub fn mint_rwa_tokens(env: Env, to: Address, amount: i128) -> Result<(), Error> {
    to.require_auth();

    // 1. Mint tokens
    token::Client::new(&env, &env.current_contract_address())
        .mint(&to, &amount);

    // 2. Auto-whitelist user
    let mut allowed_users: Vec<Address> = env
        .storage()
        .instance()
        .get(&Symbol::new(&env, "allowed"))
        .unwrap_or(Vec::new(&env));

    if !allowed_users.contains(&to) {
        allowed_users.push_back(to.clone());
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "allowed"), &allowed_users);
    }

    // 3. Emit event
    env.events().publish((
        Symbol::new(&env, "rwa_minted"),
        to.clone(),
        amount,
    ));

    Ok(())
}
```

**Why:** Allows users to mint RWA tokens for testing/hackathon, auto-whitelists them.

#### B. Standard Token Functions
```rust
pub fn balance(env: Env, id: Address) -> i128
pub fn transfer(env: Env, from: Address, to: Address, amount: i128)
pub fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32)
pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128)
pub fn allowed(env: Env, user: Address) -> bool
pub fn allow_user(env: Env, user: Address)
```

**Deployment Configuration:**

```bash
# Deploy 3 times with same code:

# 1. Invoice RWA Token
stellar contract build
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/rwa_token.wasm \
  --network testnet
# Result: RWA_INVOICES = C...

# 2. TBills RWA Token
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/rwa_token.wasm \
  --network testnet
# Result: RWA_TBILLS = C...

# 3. Real Estate RWA Token
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/rwa_token.wasm \
  --network testnet
# Result: RWA_REALESTATE = C...
```

---

### 2. stRWA Token Contracts (3x)

**Contract:** `strwa_token.rs` (Standard Stellar Token Template)
**Deploy:** 3 times (once per asset type)

**Required Functions:**
```rust
pub fn mint(env: Env, to: Address, amount: i128)
pub fn burn(env: Env, from: Address, amount: i128)
pub fn balance(env: Env, id: Address) -> i128
pub fn transfer(env: Env, from: Address, to: Address, amount: i128)
pub fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32)
pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128)
```

**Platform Token Names:**
- `OrionInvoicesToken` (for Invoice RWA)
- `OrionTBillsToken` (for TBills RWA)
- `OrionRealEstateToken` (for Real Estate RWA)

**Deployment:**
```bash
# Deploy 3 times:

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/strwa_token.wasm \
  --network testnet
# Result: STRWA_INVOICES = C...

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/strwa_token.wasm \
  --network testnet
# Result: STRWA_TBILLS = C...

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/strwa_token.wasm \
  --network testnet
# Result: STRWA_REALESTATE = C...
```

---

### 3. Vault Contracts (3x)

**Contract:** `vault.rs`
**Deploy:** 3 times, each initialized with different token pairs

**Required Functions:**

#### A. initialize()
```rust
pub fn initialize(
    env: Env,
    admin: Address,
    rwa_token: Address,
    strwa_token: Address,
    usdc_token: Address,
    lending_pool: Address,
) -> Result<(), Error> {
    // Store configuration
    env.storage().instance().set(&Symbol::new(&env, "admin"), &admin);
    env.storage().instance().set(&Symbol::new(&env, "rwa_token"), &rwa_token);
    env.storage().instance().set(&Symbol::new(&env, "strwa_token"), &strwa_token);
    env.storage().instance().set(&Symbol::new(&env, "usdc_token"), &usdc_token);
    env.storage().instance().set(&Symbol::new(&env, "lending_pool"), &lending_pool);

    Ok(())
}
```

#### B. stake() with auto-whitelist
```rust
pub fn stake(env: Env, user: Address, amount: i128) -> Result<(), Error> {
    user.require_auth();

    let rwa_token_addr: Address = env
        .storage()
        .instance()
        .get(&Symbol::new(&env, "rwa_token"))
        .unwrap();

    let strwa_token_addr: Address = env
        .storage()
        .instance()
        .get(&Symbol::new(&env, "strwa_token"))
        .unwrap();

    let rwa_token = token::Client::new(&env, &rwa_token_addr);
    let strwa_token = token::Client::new(&env, &strwa_token_addr);

    // NEW: Auto-whitelist check
    let allowed = rwa_token.allowed(&user);
    if !allowed {
        rwa_token.allow_user(&user);
    }

    // Transfer RWA tokens from user to vault
    rwa_token.transfer_from(
        &user,
        &user,
        &env.current_contract_address(),
        &amount
    );

    // Mint stRWA tokens 1:1
    strwa_token.mint(&user, &amount);

    // Emit event
    env.events().publish((
        Symbol::new(&env, "staked"),
        user.clone(),
        amount,
    ));

    Ok(())
}
```

#### C. unstake()
```rust
pub fn unstake(env: Env, user: Address, amount: i128) -> Result<(), Error> {
    user.require_auth();

    let rwa_token_addr: Address = env
        .storage()
        .instance()
        .get(&Symbol::new(&env, "rwa_token"))
        .unwrap();

    let strwa_token_addr: Address = env
        .storage()
        .instance()
        .get(&Symbol::new(&env, "strwa_token"))
        .unwrap();

    let rwa_token = token::Client::new(&env, &rwa_token_addr);
    let strwa_token = token::Client::new(&env, &strwa_token_addr);

    // Burn stRWA tokens
    strwa_token.burn(&user, &amount);

    // Return RWA tokens
    rwa_token.transfer(
        &env.current_contract_address(),
        &user,
        &amount
    );

    env.events().publish((
        Symbol::new(&env, "unstaked"),
        user.clone(),
        amount,
    ));

    Ok(())
}
```

#### D. Yield Functions
```rust
pub fn claim_yield(env: Env, user: Address) -> Result<i128, Error>
pub fn claimable_yield(env: Env, user: Address) -> i128
pub fn fund_yield(env: Env, amount: i128) -> Result<(), Error>
pub fn pull_yield_for_repay(env: Env, user: Address, amount: i128) -> Result<i128, Error>
```

**Deployment + Initialization:**
```bash
# Deploy 3 vaults
for i in {1..3}; do
  stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/vault.wasm \
    --network testnet
done

# Initialize Invoices Vault
stellar contract invoke \
  --id <VAULT_INVOICES> \
  --fn initialize \
  --arg admin:<YOUR_ADMIN_ADDRESS> \
  --arg rwa_token:<RWA_INVOICES> \
  --arg strwa_token:<STRWA_INVOICES> \
  --arg usdc_token:<USDC> \
  --arg lending_pool:<LENDING_POOL>

# Initialize TBills Vault
stellar contract invoke \
  --id <VAULT_TBILLS> \
  --fn initialize \
  --arg admin:<YOUR_ADMIN_ADDRESS> \
  --arg rwa_token:<RWA_TBILLS> \
  --arg strwa_token:<STRWA_TBILLS> \
  --arg usdc_token:<USDC> \
  --arg lending_pool:<LENDING_POOL>

# Initialize Real Estate Vault
stellar contract invoke \
  --id <VAULT_REALESTATE> \
  --fn initialize \
  --arg admin:<YOUR_ADMIN_ADDRESS> \
  --arg rwa_token:<RWA_REALESTATE> \
  --arg strwa_token:<STRWA_REALESTATE> \
  --arg usdc_token:<USDC> \
  --arg lending_pool:<LENDING_POOL>
```

---

## 🔄 Contracts to Update

### 4. Lending Pool (Multi-Collateral Support)

**Contract:** `lending_pool.rs`
**Action:** CRITICAL UPDATE

**Current Interface:**
```rust
pub fn originate_loan(
    env: Env,
    borrower: Address,
    collateral_amount: i128,      // ❌ Single amount
    loan_amount: i128,
    duration_months: u32,
)
```

**NEW Interface:**
```rust
// NEW: Collateral struct
#[derive(Clone)]
#[contracttype]
pub struct CollateralInput {
    pub token_address: Address,  // Which stRWA token
    pub amount: i128,             // Amount of that token
}

// UPDATED: Accept multiple collaterals
pub fn originate_loan(
    env: Env,
    borrower: Address,
    collaterals: Vec<CollateralInput>,  // ✅ Multiple collaterals!
    loan_amount: i128,
    duration_months: u32,
) -> Result<(), Error> {
    borrower.require_auth();

    let usdc_token_addr: Address = env
        .storage()
        .instance()
        .get(&Symbol::new(&env, "usdc_token"))
        .unwrap();

    let oracle_addr: Address = env
        .storage()
        .instance()
        .get(&Symbol::new(&env, "oracle"))
        .unwrap();

    let oracle = OracleClient::new(&env, &oracle_addr);
    let usdc = token::Client::new(&env, &usdc_token_addr);

    // Calculate total collateral value
    let mut total_collateral_value: i128 = 0;

    for collateral in collaterals.iter() {
        // Get price for this specific stRWA token
        let (price, timestamp) = oracle.get_price(&collateral.token_address);

        // Check price freshness (< 24 hours old)
        let current_time = env.ledger().timestamp();
        if current_time - timestamp > 86400 {
            return Err(Error::StalePrice);
        }

        // Calculate value (price is in basis points, 6 decimals)
        // collateral.amount is 18 decimals, price is 6 decimals
        let value = (collateral.amount * price) / 1_000_000_000_000_000_000i128;
        total_collateral_value += value;

        // Transfer collateral token from borrower to lending pool
        let collateral_token = token::Client::new(&env, &collateral.token_address);
        collateral_token.transfer_from(
            &borrower,
            &borrower,
            &env.current_contract_address(),
            &collateral.amount
        );
    }

    // Check minimum collateralization (140% = LTV 71%)
    let required_collateral = (loan_amount * 140) / 100;
    if total_collateral_value < required_collateral {
        return Err(Error::InsufficientCollateral);
    }

    // Calculate health factor (should be >= 1.4)
    let health_factor = (total_collateral_value * 100) / loan_amount;
    if health_factor < 140 {
        return Err(Error::LowHealthFactor);
    }

    // Create loan record
    let loan = Loan {
        borrower: borrower.clone(),
        collaterals: collaterals.clone(),  // Store all collateral types
        outstanding_debt: loan_amount,
        original_loan_amount: loan_amount,
        start_time: env.ledger().timestamp(),
        duration_months,
        last_payment_time: env.ledger().timestamp(),
        warnings_issued: 0,
        last_warning_time: 0,
        penalties: 0,
    };

    // Save loan
    env.storage()
        .persistent()
        .set(&borrower, &loan);

    // Transfer USDC to borrower
    usdc.transfer(
        &env.current_contract_address(),
        &borrower,
        &loan_amount
    );

    // Emit event
    env.events().publish((
        Symbol::new(&env, "loan_originated"),
        borrower.clone(),
        loan_amount,
        total_collateral_value,
    ));

    Ok(())
}
```

**Updated Loan Struct:**
```rust
#[derive(Clone)]
#[contracttype]
pub struct Loan {
    pub borrower: Address,
    pub collaterals: Vec<CollateralInput>,  // ✅ Multiple collaterals
    pub outstanding_debt: i128,
    pub original_loan_amount: i128,
    pub start_time: u64,
    pub duration_months: u32,
    pub last_payment_time: u64,
    pub warnings_issued: u32,
    pub last_warning_time: u64,
    pub penalties: i128,
}
```

**Updated repay_loan():**
```rust
pub fn repay_loan(
    env: Env,
    borrower: Address,
    amount: i128,
) -> Result<(), Error> {
    // Anyone can trigger repayment (for auto-repay bot)

    let mut loan: Loan = env
        .storage()
        .persistent()
        .get(&borrower)
        .ok_or(Error::LoanNotFound)?;

    // Calculate actual repayment (capped at outstanding debt)
    let actual_repay = if amount > loan.outstanding_debt {
        loan.outstanding_debt
    } else {
        amount
    };

    // Pull yield from vaults (try each collateral's vault)
    let mut remaining = actual_repay;

    for collateral in loan.collaterals.iter() {
        if remaining == 0 {
            break;
        }

        // Get vault address for this collateral type
        let vault_addr = get_vault_for_token(&env, &collateral.token_address);
        let vault = VaultClient::new(&env, &vault_addr);

        // Try to pull yield
        let pulled = vault.pull_yield_for_repay(&borrower, &remaining);
        remaining -= pulled;
    }

    // Reduce debt
    loan.outstanding_debt -= actual_repay;
    loan.last_payment_time = env.ledger().timestamp();

    // If fully repaid, return collateral
    if loan.outstanding_debt == 0 {
        for collateral in loan.collaterals.iter() {
            let token = token::Client::new(&env, &collateral.token_address);
            token.transfer(
                &env.current_contract_address(),
                &borrower,
                &collateral.amount
            );
        }

        // Remove loan
        env.storage().persistent().remove(&borrower);
    } else {
        // Save updated loan
        env.storage().persistent().set(&borrower, &loan);
    }

    env.events().publish((
        Symbol::new(&env, "loan_repaid"),
        borrower,
        actual_repay,
    ));

    Ok(())
}
```

**Updated liquidate_loan():**
```rust
pub fn liquidate_loan(
    env: Env,
    liquidator: Address,
    borrower: Address,
) -> Result<(), Error> {
    let loan: Loan = env
        .storage()
        .persistent()
        .get(&borrower)
        .ok_or(Error::LoanNotFound)?;

    let oracle_addr: Address = env
        .storage()
        .instance()
        .get(&Symbol::new(&env, "oracle"))
        .unwrap();

    let oracle = OracleClient::new(&env, &oracle_addr);

    // Calculate total collateral value across all types
    let mut total_collateral_value: i128 = 0;

    for collateral in loan.collaterals.iter() {
        let (price, _) = oracle.get_price(&collateral.token_address);
        let value = (collateral.amount * price) / 1_000_000_000_000_000_000i128;
        total_collateral_value += value;
    }

    let total_debt = loan.outstanding_debt + loan.penalties;

    // Calculate health factor
    let health_factor = (total_collateral_value * 100) / total_debt;

    // Check if liquidatable (health < 1.1 = 110%)
    if health_factor >= 110 {
        return Err(Error::LoanStillHealthy);
    }

    // Calculate liquidator reward (10% of collateral value)
    let liquidator_reward = (total_collateral_value * 10) / 100;

    // Transfer all collaterals to pool (already there)
    // They stay locked in the pool

    // Pay liquidator reward in USDC
    let usdc_addr: Address = env
        .storage()
        .instance()
        .get(&Symbol::new(&env, "usdc_token"))
        .unwrap();

    let usdc = token::Client::new(&env, &usdc_addr);
    usdc.transfer(
        &env.current_contract_address(),
        &liquidator,
        &liquidator_reward
    );

    // Remove loan
    env.storage().persistent().remove(&borrower);

    env.events().publish((
        Symbol::new(&env, "loan_liquidated"),
        borrower,
        liquidator,
        total_collateral_value,
        liquidator_reward,
    ));

    Ok(())
}
```

**Deployment:**
```bash
stellar contract build
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/lending_pool.wasm \
  --network testnet

# Initialize with oracle and USDC addresses
stellar contract invoke \
  --id <NEW_LENDING_POOL> \
  --fn initialize \
  --arg oracle:<ORACLE_ADDRESS> \
  --arg usdc:<USDC_ADDRESS>
```

---

### 5. Oracle Contract

**Contract:** `oracle.rs`
**Action:** ✅ NO CHANGES NEEDED

The existing oracle contract already supports multiple assets:

```rust
pub fn set_price(env: Env, asset: Address, price: i128, timestamp: u64)
pub fn get_price(env: Env, asset: Address) -> (i128, u64)
```

Just call it for each stRWA token:
```rust
oracle.set_price(STRWA_INVOICES, invoice_price, timestamp);
oracle.set_price(STRWA_TBILLS, tbill_price, timestamp);
oracle.set_price(STRWA_REALESTATE, realestate_price, timestamp);
```

---

## 🤖 Bot Configuration

### Oracle Bot Configuration

**File:** `bots/oracle-price-bot/.env`

```bash
# Asset contracts to monitor
STRWA_INVOICES=<DEPLOYED_ADDRESS>
STRWA_TBILLS=<DEPLOYED_ADDRESS>
STRWA_REALESTATE=<DEPLOYED_ADDRESS>

ORACLE_CONTRACT_ID=<ORACLE_ADDRESS>
BOT_SECRET_KEY=<YOUR_BOT_SECRET>
```

**File:** `bots/oracle-price-bot/src/config/assets.ts`

```typescript
export const ASSETS = [
  {
    name: 'OrionInvoicesToken',
    contractId: process.env.STRWA_INVOICES!,
    dataSources: [
      {
        name: 'Invoice Oracle API',
        type: 'api',
        url: 'https://api.invoice-oracle.com/nav',
        weight: 50,
        priority: 1,
      },
      {
        name: 'Fallback Price',
        type: 'custom',
        basePrice: 1.05,  // $1.05 per token
        weight: 50,
        priority: 2,
      },
    ],
  },
  {
    name: 'OrionTBillsToken',
    contractId: process.env.STRWA_TBILLS!,
    dataSources: [
      {
        name: 'US Treasury API',
        type: 'api',
        url: 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/avg_interest_rates',
        weight: 100,
        priority: 1,
      },
      {
        name: 'Fallback Price',
        type: 'custom',
        basePrice: 1.02,  // $1.02 per token
        weight: 50,
        priority: 2,
      },
    ],
  },
  {
    name: 'OrionRealEstateToken',
    contractId: process.env.STRWA_REALESTATE!,
    dataSources: [
      {
        name: 'Real Estate Oracle',
        type: 'api',
        url: 'https://api.realestate-oracle.com/price',
        weight: 50,
        priority: 1,
      },
      {
        name: 'Fallback Price',
        type: 'custom',
        basePrice: 1.08,  // $1.08 per token
        weight: 50,
        priority: 2,
      },
    ],
  },
];
```

**Bot will:**
1. Fetch prices for all 3 asset types every 60 seconds
2. Submit to oracle contract
3. Handle failures gracefully

---

### Liquidation Bot Configuration

**File:** `bots/liquidation-bot/.env`

```bash
LENDING_POOL_CONTRACT_ID=<NEW_LENDING_POOL>
ORACLE_CONTRACT_ID=<ORACLE_ADDRESS>

# All stRWA tokens (for health calculations)
STRWA_INVOICES=<ADDRESS>
STRWA_TBILLS=<ADDRESS>
STRWA_REALESTATE=<ADDRESS>

BOT_SECRET_KEY=<YOUR_BOT_SECRET>
```

**No code changes needed** - the bot spec already handles multi-collateral (see LIQUIDATION_BOT_SPEC.md lines 1317-1347)

---

### Auto-Repay Bot Configuration

**File:** `bots/auto-repay-bot/.env`

```bash
VAULT_INVOICES=<ADDRESS>
VAULT_TBILLS=<ADDRESS>
VAULT_REALESTATE=<ADDRESS>

LENDING_POOL_CONTRACT_ID=<NEW_LENDING_POOL>
BOT_SECRET_KEY=<YOUR_BOT_SECRET>
```

**File:** `bots/auto-repay-bot/src/config/vaults.ts`

```typescript
export const VAULTS = [
  {
    name: 'Invoices Vault',
    contractId: process.env.VAULT_INVOICES!,
    assetType: 'INVOICES',
  },
  {
    name: 'TBills Vault',
    contractId: process.env.VAULT_TBILLS!,
    assetType: 'TBILLS',
  },
  {
    name: 'Real Estate Vault',
    contractId: process.env.VAULT_REALESTATE!,
    assetType: 'REALESTATE',
  },
];
```

**Bot will:**
1. Monitor yield funded events from all 3 vaults
2. Aggregate total claimable yield per borrower
3. Route to loan repayments

---

## 📋 Deployment Checklist

### Phase 1: Deploy Tokens (9 contracts)

```bash
# 1. Deploy all RWA tokens
stellar contract deploy --wasm rwa_token.wasm --network testnet
# Save as RWA_INVOICES

stellar contract deploy --wasm rwa_token.wasm --network testnet
# Save as RWA_TBILLS

stellar contract deploy --wasm rwa_token.wasm --network testnet
# Save as RWA_REALESTATE

# 2. Deploy all stRWA tokens
stellar contract deploy --wasm strwa_token.wasm --network testnet
# Save as STRWA_INVOICES

stellar contract deploy --wasm strwa_token.wasm --network testnet
# Save as STRWA_TBILLS

stellar contract deploy --wasm strwa_token.wasm --network testnet
# Save as STRWA_REALESTATE

# 3. Deploy all vaults
stellar contract deploy --wasm vault.wasm --network testnet
# Save as VAULT_INVOICES

stellar contract deploy --wasm vault.wasm --network testnet
# Save as VAULT_TBILLS

stellar contract deploy --wasm vault.wasm --network testnet
# Save as VAULT_REALESTATE
```

### Phase 2: Initialize Vaults

```bash
# Initialize each vault with its token pair
stellar contract invoke --id <VAULT_INVOICES> --fn initialize \
  --arg admin:<ADMIN> \
  --arg rwa_token:<RWA_INVOICES> \
  --arg strwa_token:<STRWA_INVOICES> \
  --arg usdc_token:<USDC> \
  --arg lending_pool:<LENDING_POOL>

stellar contract invoke --id <VAULT_TBILLS> --fn initialize \
  --arg admin:<ADMIN> \
  --arg rwa_token:<RWA_TBILLS> \
  --arg strwa_token:<STRWA_TBILLS> \
  --arg usdc_token:<USDC> \
  --arg lending_pool:<LENDING_POOL>

stellar contract invoke --id <VAULT_REALESTATE> --fn initialize \
  --arg admin:<ADMIN> \
  --arg rwa_token:<RWA_REALESTATE> \
  --arg strwa_token:<STRWA_REALESTATE> \
  --arg usdc_token:<USDC> \
  --arg lending_pool:<LENDING_POOL>
```

### Phase 3: Deploy & Initialize Lending Pool

```bash
stellar contract deploy --wasm lending_pool.wasm --network testnet
# Save as LENDING_POOL

stellar contract invoke --id <LENDING_POOL> --fn initialize \
  --arg oracle:<ORACLE> \
  --arg usdc:<USDC>
```

### Phase 4: Fund with Test USDC

```bash
# Transfer USDC to lending pool for loans
stellar contract invoke --id <USDC> --fn transfer \
  --arg from:<YOUR_ADDRESS> \
  --arg to:<LENDING_POOL> \
  --arg amount:1000000000  # 1000 USDC (7 decimals)
```

### Phase 5: Configure & Start Bots

```bash
# 1. Configure Oracle Bot
cd bots/oracle-price-bot
cp .env.example .env
# Edit .env with all contract addresses
npm install
npm start

# 2. Configure Liquidation Bot
cd ../liquidation-bot
cp .env.example .env
# Edit .env with contract addresses
npm install
npm start

# 3. Configure Auto-Repay Bot
cd ../auto-repay-bot
cp .env.example .env
# Edit .env with vault addresses
npm install
npm start
```

---

## ✅ Success Criteria

After deployment, verify:

### Contract Verification:

```bash
# Test each asset type
stellar contract invoke --id <RWA_INVOICES> --fn mint_rwa_tokens \
  --arg to:<TEST_USER> \
  --arg amount:100000000000000000000  # 100 tokens

stellar contract invoke --id <VAULT_INVOICES> --fn stake \
  --arg user:<TEST_USER> \
  --arg amount:50000000000000000000  # 50 tokens

# Verify stRWA minted
stellar contract invoke --id <STRWA_INVOICES> --fn balance \
  --arg id:<TEST_USER>
# Expected: 50000000000000000000 (50 stRWA)
```

### Multi-Collateral Loan Test:

```typescript
// Test originating loan with multiple collaterals
await lendingPool.originate_loan(
  borrowerAddress,
  [
    { token_address: STRWA_INVOICES, amount: 30n * 10n ** 18n },
    { token_address: STRWA_REALESTATE, amount: 20n * 10n ** 18n },
  ],
  loan_amount: 40_000000n,  // 40 USDC
  duration_months: 12
);
```

### Bot Verification:

```bash
# Check oracle bot is updating prices
curl http://localhost:3000/metrics
# Should show 3 assets being updated

# Check liquidation bot is monitoring
curl http://localhost:3002/metrics
# Should show loans being checked

# Check auto-repay bot is running
curl http://localhost:3001/metrics
# Should show repayments processed
```

---

## 🚨 Critical Notes

### Decimal Handling:

```
RWA Tokens:    18 decimals (1 token = 10^18)
stRWA Tokens:  18 decimals (1 token = 10^18)
USDC:          7 decimals (1 USDC = 10^7)
Oracle Prices: 6 decimals (basis points, $1.00 = 1_000000)
```

**Price Calculation:**
```rust
// Collateral value in USDC (6 decimals)
let collateral_value = (collateral_amount * price) / 1_000_000_000_000_000_000i128;
//                       (18 decimals)      (6 decimals)
//                       = 6 decimals (USDC)
```

### Health Factor Calculation:

```rust
// Health factor as percentage
let health_factor = (total_collateral_value * 100) / total_debt;

// Examples:
// - Collateral: $200, Debt: $100 → Health: 200
// - Collateral: $140, Debt: $100 → Health: 140 (minimum)
// - Collateral: $110, Debt: $100 → Health: 110 (liquidation threshold)
```

### Liquidation Threshold:

- **Minimum Health:** 140% (LTV 71%)
- **Warning 1:** Health < 150%
- **Warning 2:** Health < 120%
- **Warning 3:** Health < 110%
- **Liquidation:** Health ≤ 110%

---

## 📞 Support & Questions

If you encounter issues:

1. **Contract Build Errors:** Check Rust version (`rustc --version` should be 1.74+)
2. **Deployment Failures:** Verify network connectivity and account balance
3. **Transaction Failures:** Check contract simulation output for specific errors
4. **Bot Issues:** Check logs in `bots/<bot-name>/logs/`

---

**Status:** Ready for implementation
**Estimated Time:** 3-4 days
**Next:** See FRONTEND_CHANGES.md for UI updates

