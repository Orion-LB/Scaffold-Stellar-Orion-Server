# ⚙️ Implementation Options: Detailed Breakdown

## Overview

This document provides **exact code changes** needed for each architectural option.

---

## 🟢 OPTION C: Single Asset MVP (Recommended First)

**Goal:** Get everything working with current single-asset architecture

### Backend Changes Needed:

#### 1. Add `mint_rwa_tokens()` to RWA Contract

**File:** `contracts/rwa_token/src/lib.rs`

```rust
pub fn mint_rwa_tokens(env: Env, to: Address, amount: i128) -> Result<(), Error> {
    to.require_auth();  // User must sign

    // 1. Mint tokens
    token::mint(&env, &to, amount);

    // 2. Auto-whitelist user
    storage::allow_user(&env, &to);

    // 3. Emit event
    env.events().publish((
        Symbol::new(&env, "rwa_minted"),
        to.clone(),
        amount,
    ));

    Ok(())
}
```

**Deployment:** Redeploy RWA contract with this function

---

#### 2. Modify `stake()` in Vault Contract

**File:** `contracts/vault/src/lib.rs`

```rust
pub fn stake(env: Env, user: Address, amount: i128) -> Result<(), Error> {
    user.require_auth();

    // NEW: Auto-whitelist check
    let rwa_token = get_rwa_token_contract(&env);
    if !rwa_token.allowed(&user) {
        rwa_token.allow_user(&user);
    }

    // EXISTING: Transfer + Mint logic
    rwa_token.transfer_from(&user, &vault_address, &amount);

    let strwa_token = get_strwa_token_contract(&env);
    strwa_token.mint(&user, &amount);

    Ok(())
}
```

**Deployment:** Redeploy Vault contract

---

### Frontend Changes Needed:

#### 1. Update MockRWAService to call mint function

**File:** `src/services/contracts/MockRWAService.ts`

```typescript
async mint_rwa_tokens(to: string, amount: bigint) {
  const args = [
    this.createAddress(to),
    nativeToScVal(amount, { type: 'i128' })
  ];

  return this.invokeContract('mint_rwa_tokens', args);
}
```

---

#### 2. Update StakeSection to call mint

**File:** `src/components/dashboard/StakeSection.tsx`

```typescript
const handleGetMockRWA = async () => {
  if (!address) return;

  try {
    setIsGettingTokens(true);

    // Call actual contract function
    await mockRWAService.mint_rwa_tokens(
      address,
      1000n * 10n ** 18n  // 1000 RWA tokens
    );

    toast.success("Successfully minted 1000 RWA tokens!");

    // Refresh balance
    await fetchBalances();
  } catch (error) {
    toast.error("Failed to mint RWA tokens");
  } finally {
    setIsGettingTokens(false);
  }
};
```

---

### Deployment Steps:

```bash
# 1. Deploy updated RWA contract
cd contracts/rwa_token
stellar contract build
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/rwa_token.wasm

# 2. Deploy updated Vault contract
cd ../vault
stellar contract build
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/vault.wasm

# 3. Update contract addresses in frontend
# src/services/contracts/index.ts
export const CONTRACT_ADDRESSES = {
  MOCK_RWA_A: 'NEW_RWA_ADDRESS',
  RWA_VAULT_A: 'NEW_VAULT_ADDRESS',
  // ... keep others same
};

# 4. Start oracle bot
cd bots/oracle-price-bot
npm install
npm start

# 5. Start liquidation bot
cd ../liquidation-bot
npm install
npm start

# 6. Start auto-repay bot
cd ../auto-repay-bot
npm install
npm start
```

**Timeline:** 4-6 hours
**Risk:** Low
**Result:** Fully working single-asset platform

---

## 🟡 OPTION B: Single Asset with Metadata

**Goal:** Add asset type metadata to existing contracts

### Backend Changes:

#### 1. Update RWA Token Contract

```rust
// Add asset type enum
#[derive(Clone, Copy)]
pub enum AssetType {
    Invoices = 1,
    TBills = 2,
    RealEstate = 3,
    Bonds = 4,
}

// Track balances per asset type
struct UserBalance {
    total: i128,
    by_type: Map<AssetType, i128>,
}

pub fn mint_rwa_tokens(
    env: Env,
    to: Address,
    asset_type: AssetType,
    amount: i128
) -> Result<(), Error> {
    to.require_auth();

    // Get user's balance record
    let mut balance = get_balance(&env, &to);

    // Update total
    balance.total += amount;

    // Update by type
    let current = balance.by_type.get(asset_type).unwrap_or(0);
    balance.by_type.set(asset_type, current + amount);

    save_balance(&env, &to, &balance);

    env.events().publish((
        Symbol::new(&env, "rwa_minted"),
        to,
        asset_type,
        amount,
    ));

    Ok(())
}

pub fn balance_by_type(env: Env, account: Address, asset_type: AssetType) -> i128 {
    let balance = get_balance(&env, &account);
    balance.by_type.get(asset_type).unwrap_or(0)
}
```

#### 2. Update Vault Contract

```rust
// Track stakes by asset type
struct StakeRecord {
    total_staked: i128,
    by_asset_type: Map<AssetType, i128>,
}

pub fn stake(
    env: Env,
    user: Address,
    asset_type: AssetType,
    amount: i128
) -> Result<(), Error> {
    user.require_auth();

    // Verify user has this asset type
    let rwa_token = get_rwa_token(&env);
    let user_balance = rwa_token.balance_by_type(&user, asset_type);

    if user_balance < amount {
        return Err(Error::InsufficientBalance);
    }

    // Transfer (still uses total balance internally)
    rwa_token.transfer_from(&user, &vault, &amount);

    // Mint stRWA (generic platform token)
    let strwa = get_strwa_token(&env);
    strwa.mint(&user, &amount);

    // Track which asset type was staked
    let mut stake_record = get_stake_record(&env, &user);
    stake_record.total_staked += amount;
    let current = stake_record.by_asset_type.get(asset_type).unwrap_or(0);
    stake_record.by_asset_type.set(asset_type, current + amount);

    save_stake_record(&env, &user, &stake_record);

    Ok(())
}
```

**Pros:**
- ✅ Only update existing contracts
- ✅ Track asset types internally
- ✅ Can show per-asset balances in UI

**Cons:**
- ❌ Still only 1 actual token contract
- ❌ Can't truly separate asset risks
- ❌ Harder to price different assets
- ❌ More complex contract logic

**Timeline:** 2-3 days
**Risk:** Medium
**Result:** Metadata-based multi-asset tracking

---

## 🔴 OPTION A: Full Multi-Asset Implementation

**Goal:** Deploy separate contracts for each asset type

### Contract Architecture:

```
For 3 asset types (Invoices, TBills, RealEstate):

SHARED:
├── USDC Token (existing)
├── Lending Pool (update for multi-collateral)
└── Oracle (update for multi-asset pricing)

SET 1: INVOICES
├── RWA_Invoices (new)
├── stRWA_Invoices (new)
└── Vault_Invoices (new)

SET 2: TBILLS
├── RWA_TBills (new)
├── stRWA_TBills (new)
└── Vault_TBills (new)

SET 3: REAL ESTATE
├── RWA_RealEstate (new)
├── stRWA_RealEstate (new)
└── Vault_RealEstate (new)
```

---

### Backend Changes:

#### 1. Deploy Multiple RWA Token Contracts

**Same code, different deployments:**

```bash
# Deploy for each asset type
stellar contract deploy --wasm rwa_token.wasm --network testnet
# Result: RWA_INVOICES address

stellar contract deploy --wasm rwa_token.wasm --network testnet
# Result: RWA_TBILLS address

stellar contract deploy --wasm rwa_token.wasm --network testnet
# Result: RWA_REALESTATE address
```

#### 2. Deploy Multiple stRWA Token Contracts

```bash
stellar contract deploy --wasm strwa_token.wasm --network testnet
# Result: STRWA_INVOICES (OrionInvoicesToken)

stellar contract deploy --wasm strwa_token.wasm --network testnet
# Result: STRWA_TBILLS (OrionTBillsToken)

stellar contract deploy --wasm strwa_token.wasm --network testnet
# Result: STRWA_REALESTATE (OrionRealEstateToken)
```

#### 3. Deploy Multiple Vault Contracts

**Each vault configured for specific asset pair:**

```bash
# Vault for Invoices
stellar contract deploy --wasm vault.wasm --network testnet
stellar contract invoke \
  --id VAULT_INVOICES \
  --fn initialize \
  --arg rwa_token:RWA_INVOICES \
  --arg strwa_token:STRWA_INVOICES

# Vault for TBills
stellar contract deploy --wasm vault.wasm --network testnet
stellar contract invoke \
  --id VAULT_TBILLS \
  --fn initialize \
  --arg rwa_token:RWA_TBILLS \
  --arg strwa_token:STRWA_TBILLS

# Vault for Real Estate
stellar contract deploy --wasm vault.wasm --network testnet
stellar contract invoke \
  --id VAULT_REALESTATE \
  --fn initialize \
  --arg rwa_token:RWA_REALESTATE \
  --arg strwa_token:STRWA_REALESTATE
```

---

#### 4. Update Lending Pool for Multi-Collateral

**File:** `contracts/lending_pool/src/lib.rs`

```rust
// NEW: Collateral can be multiple token types
#[derive(Clone)]
pub struct CollateralInput {
    pub token_address: Address,  // Which stRWA token
    pub amount: i128,
}

pub fn originate_loan(
    env: Env,
    borrower: Address,
    collaterals: Vec<CollateralInput>,  // Multiple types!
    loan_amount: i128,
    duration_months: u32,
) -> Result<(), Error> {
    borrower.require_auth();

    // Calculate total collateral value
    let mut total_collateral_value = 0i128;

    for collateral in collaterals.iter() {
        // Get price for this specific stRWA token
        let price = oracle.get_price(&collateral.token_address);
        let value = (collateral.amount * price) / PRICE_SCALE;
        total_collateral_value += value;

        // Transfer this collateral token
        let token_client = TokenClient::new(&env, &collateral.token_address);
        token_client.transfer_from(
            &borrower,
            &env.current_contract_address(),
            &collateral.amount
        );
    }

    // Check LTV
    if total_collateral_value < (loan_amount * 140) / 100 {
        return Err(Error::InsufficientCollateral);
    }

    // Create loan with multi-collateral
    let loan = Loan {
        borrower: borrower.clone(),
        collaterals,  // Store all collateral types
        outstanding_debt: loan_amount,
        // ... other fields
    };

    save_loan(&env, &borrower, &loan);

    // Transfer USDC to borrower
    let usdc = get_usdc_token(&env);
    usdc.transfer(&borrower, &loan_amount);

    Ok(())
}
```

**Redeploy:** Lending Pool contract

---

#### 5. Update Oracle for Multi-Asset Pricing

**File:** `contracts/oracle/src/lib.rs`

**No changes needed!** Existing interface already supports multiple assets:

```rust
pub fn set_price(env: Env, asset: Address, price: i128, timestamp: u64)
pub fn get_price(env: Env, asset: Address) -> (i128, u64)
```

Just call it for each stRWA token:

```typescript
// Oracle bot updates
await oracle.set_price(STRWA_INVOICES, invoicePrice);
await oracle.set_price(STRWA_TBILLS, tbillPrice);
await oracle.set_price(STRWA_REALESTATE, realEstatePrice);
```

---

### Frontend Changes:

#### 1. Update Contract Addresses

**File:** `src/services/contracts/index.ts`

```typescript
export const CONTRACT_ADDRESSES = {
  USDC: 'CAXHQJ6IHN2TPAJ4NEOXJJLRRAO74BEAWA3RXHD6NSOWRBQCTVZA3ZGS',

  // Invoices Set
  RWA_INVOICES: 'NEW_ADDRESS_1',
  STRWA_INVOICES: 'NEW_ADDRESS_2',
  VAULT_INVOICES: 'NEW_ADDRESS_3',

  // TBills Set
  RWA_TBILLS: 'NEW_ADDRESS_4',
  STRWA_TBILLS: 'NEW_ADDRESS_5',
  VAULT_TBILLS: 'NEW_ADDRESS_6',

  // Real Estate Set
  RWA_REALESTATE: 'NEW_ADDRESS_7',
  STRWA_REALESTATE: 'NEW_ADDRESS_8',
  VAULT_REALESTATE: 'NEW_ADDRESS_9',

  LENDING_POOL: 'NEW_LENDING_POOL_ADDRESS',
  MOCK_ORACLE: 'EXISTING_ORACLE_ADDRESS',
};

export enum AssetType {
  INVOICES = 'INVOICES',
  TBILLS = 'TBILLS',
  REALESTATE = 'REALESTATE',
}

export const ASSET_CONTRACTS = {
  [AssetType.INVOICES]: {
    rwa: CONTRACT_ADDRESSES.RWA_INVOICES,
    stRwa: CONTRACT_ADDRESSES.STRWA_INVOICES,
    vault: CONTRACT_ADDRESSES.VAULT_INVOICES,
    displayName: 'Invoice Financing',
    emoji: '🏢',
  },
  [AssetType.TBILLS]: {
    rwa: CONTRACT_ADDRESSES.RWA_TBILLS,
    stRwa: CONTRACT_ADDRESSES.STRWA_TBILLS,
    vault: CONTRACT_ADDRESSES.VAULT_TBILLS,
    displayName: 'US Treasury Bills',
    emoji: '📜',
  },
  [AssetType.REALESTATE]: {
    rwa: CONTRACT_ADDRESSES.RWA_REALESTATE,
    stRwa: CONTRACT_ADDRESSES.STRWA_REALESTATE,
    vault: CONTRACT_ADDRESSES.VAULT_REALESTATE,
    displayName: 'Real Estate Tokens',
    emoji: '🏠',
  },
};
```

---

#### 2. Create Asset Selection Modal

**New File:** `src/components/dashboard/AssetSelectionModal.tsx`

```typescript
import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AssetType, ASSET_CONTRACTS } from '@/services/contracts';

interface AssetSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelectAsset: (assetType: AssetType) => Promise<void>;
}

export function AssetSelectionModal({
  open,
  onClose,
  onSelectAsset
}: AssetSelectionModalProps) {
  const [selectedAsset, setSelectedAsset] = useState<AssetType | null>(null);
  const [isMinting, setIsMinting] = useState(false);

  const handleMint = async () => {
    if (!selectedAsset) return;

    setIsMinting(true);
    try {
      await onSelectAsset(selectedAsset);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">Select RWA Asset Type</h2>
        <p className="text-gray-600 mb-6">
          Choose which type of Real-World Asset you'd like to mint:
        </p>

        <div className="grid grid-cols-1 gap-4">
          {Object.entries(ASSET_CONTRACTS).map(([type, config]) => (
            <button
              key={type}
              onClick={() => setSelectedAsset(type as AssetType)}
              className={`p-6 border-2 rounded-lg text-left transition-all ${
                selectedAsset === type
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl">{config.emoji}</span>
                <div>
                  <h3 className="font-bold text-lg">{config.displayName}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {getAssetDescription(type as AssetType)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleMint}
          disabled={!selectedAsset || isMinting}
          className="w-full mt-6 bg-primary text-white py-3 rounded-lg disabled:opacity-50"
        >
          {isMinting ? 'Minting...' : 'Mint 100 Tokens'}
        </button>
      </DialogContent>
    </Dialog>
  );
}

function getAssetDescription(type: AssetType): string {
  const descriptions = {
    [AssetType.INVOICES]: 'Short-term receivables from verified invoices. Yield: 8-12% APY',
    [AssetType.TBILLS]: 'US Treasury Bills backed by government securities. Yield: 4-5% APY',
    [AssetType.REALESTATE]: 'Tokenized real estate equity positions. Yield: 6-9% APY',
  };
  return descriptions[type];
}
```

---

#### 3. Update StakeSection for Multi-Asset

**File:** `src/components/dashboard/StakeSection.tsx`

```typescript
const [showAssetModal, setShowAssetModal] = useState(false);
const [assetBalances, setAssetBalances] = useState<Record<AssetType, bigint>>({
  [AssetType.INVOICES]: 0n,
  [AssetType.TBILLS]: 0n,
  [AssetType.REALESTATE]: 0n,
});

const handleGetMockRWA = async () => {
  setShowAssetModal(true);  // Show asset selection modal
};

const handleSelectAsset = async (assetType: AssetType) => {
  if (!address) return;

  const assetConfig = ASSET_CONTRACTS[assetType];
  const rwaService = new MockRWAService(assetConfig.rwa);

  await rwaService.mint_rwa_tokens(address, 100n * 10n ** 18n);

  toast.success(`Minted 100 ${assetConfig.displayName} tokens!`);
  await fetchBalances();
};

// Fetch balances for all asset types
const fetchBalances = async () => {
  if (!address) return;

  for (const [type, config] of Object.entries(ASSET_CONTRACTS)) {
    const rwaService = new MockRWAService(config.rwa);
    const balance = await rwaService.balance(address);
    setAssetBalances(prev => ({ ...prev, [type]: balance }));
  }
};

return (
  <>
    <AssetSelectionModal
      open={showAssetModal}
      onClose={() => setShowAssetModal(false)}
      onSelectAsset={handleSelectAsset}
    />

    {/* Rest of StakeSection UI */}
  </>
);
```

---

### Bot Updates:

#### Oracle Bot Configuration

**File:** `bots/oracle-price-bot/src/config/assets.ts`

```typescript
export const ASSETS = [
  {
    name: 'OrionInvoicesToken',
    contractId: process.env.STRWA_INVOICES!,
    dataSources: [
      { type: 'api', url: 'https://api.invoices-oracle.com/price' },
      { type: 'custom', calculation: 'weighted_nav' },
    ],
  },
  {
    name: 'OrionTBillsToken',
    contractId: process.env.STRWA_TBILLS!,
    dataSources: [
      { type: 'chainlink', feed: 'tbill-yield' },
      { type: 'api', url: 'https://treasury.gov/api/tbills' },
    ],
  },
  {
    name: 'OrionRealEstateToken',
    contractId: process.env.STRWA_REALESTATE!,
    dataSources: [
      { type: 'api', url: 'https://api.realestate-oracle.com/price' },
    ],
  },
];
```

#### Liquidation Bot Update

**File:** `bots/liquidation-bot/src/calculator/health.ts`

```typescript
async calculateHealth(loan: Loan): Promise<HealthFactor> {
  let totalCollateralValue = 0n;

  // Sum value across all collateral types
  for (const collateral of loan.collaterals) {
    const [price] = await this.oracle.get_price(collateral.token_address);
    const value = (collateral.amount * price) / PRICE_SCALE;
    totalCollateralValue += value;
  }

  const totalDebt = loan.outstanding_debt + loan.penalties;
  const healthFactor = Number(totalCollateralValue * 100n / totalDebt) / 100;

  return {
    collateralValue: totalCollateralValue,
    totalDebt,
    healthFactor,
    isHealthy: healthFactor >= 1.5,
    needsLiquidation: healthFactor <= 1.1,
  };
}
```

---

### Deployment Steps:

```bash
# 1. Deploy all RWA tokens (3x)
for asset in invoices tbills realestate; do
  stellar contract deploy --wasm rwa_token.wasm --network testnet
  # Record address
done

# 2. Deploy all stRWA tokens (3x)
for asset in invoices tbills realestate; do
  stellar contract deploy --wasm strwa_token.wasm --network testnet
  # Record address
done

# 3. Deploy all vaults (3x) and initialize each
for asset in invoices tbills realestate; do
  stellar contract deploy --wasm vault.wasm --network testnet
  stellar contract invoke --id <vault> --fn initialize ...
done

# 4. Deploy updated Lending Pool
stellar contract deploy --wasm lending_pool.wasm --network testnet

# 5. Update frontend contract addresses
# Edit src/services/contracts/index.ts with all new addresses

# 6. Start oracle bot (monitors all 3 assets)
cd bots/oracle-price-bot
npm start

# 7. Start liquidation bot (handles multi-collateral)
cd ../liquidation-bot
npm start

# 8. Start auto-repay bot (aggregates yield from all vaults)
cd ../auto-repay-bot
npm start
```

**Timeline:** 3-4 days
**Risk:** High
**Result:** Full multi-asset platform matching your vision

---

## 📊 Comparison Summary

| Aspect | Option C (MVP) | Option B (Metadata) | Option A (Full) |
|--------|---------------|---------------------|-----------------|
| **Contracts to Deploy** | 2 (redeploy existing) | 2 (redeploy existing) | 11 (9 new + 2 updates) |
| **Timeline** | 4-6 hours | 2-3 days | 3-4 days |
| **Frontend Changes** | Minimal (1 function) | Moderate (asset tracking) | Major (full refactor) |
| **Backend Complexity** | Low | Medium | High |
| **Matches Your Vision** | 30% | 60% | 100% |
| **Hackathon Ready** | ✅ Today | ✅ In 2 days | 🟡 In 4 days |
| **Production Ready** | 🟡 Limited | 🟡 Workaround | ✅ Full |
| **Risk Level** | 🟢 Low | 🟡 Medium | 🔴 High |

---

## 🎯 My Recommendation

### For Hackathon:

**Step 1:** Implement Option C (Single Asset MVP)
- Get working product in 1 day
- Demo with confidence
- Show judges a fully functional platform

**Step 2:** After demo, implement Option A
- Add multi-asset support
- Deploy all contract sets
- Update frontend for asset selection

**Why this approach?**
- ✅ Reduces risk for demo day
- ✅ Shows working product first
- ✅ Allows time for thorough testing
- ✅ Can still mention "multi-asset coming" in pitch
- ✅ If something breaks, you have MVP fallback

---

## 🤔 Decision Time

**Tell me:**

1. **Which option do you want?** A, B, or C?
2. **When do you need multi-asset?** Before hackathon or after?
3. **Risk tolerance?** High (go for full vision) or Low (ship MVP first)?

Once you decide, I'll create:
- ✅ Final implementation guide
- ✅ Deployment scripts
- ✅ Testing checklist
- ✅ Code templates

**Ready when you are!** 🚀

