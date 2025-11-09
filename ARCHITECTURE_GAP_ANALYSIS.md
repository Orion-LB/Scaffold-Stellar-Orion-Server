# 🔍 Orion Architecture Gap Analysis

## Executive Summary

**Status:** CRITICAL ARCHITECTURAL MISMATCH IDENTIFIED

Your vision describes a **multi-asset RWA platform** where users select from different asset types (invoices, T-bills, real estate), but the current implementation is a **single-asset system** with one RWA token.

**Impact:** Frontend needs significant changes + Backend needs 3-4x contract multiplication

---

## 🎯 Your Desired Flow (From Your Description)

### User Journey:

1. **Landing Page** → User clicks "Launch App"
2. **Dashboard** opens with sidebar (Stake, Borrow, Profile)
3. **Wallet Connection** - Required before any action
4. **Get RWA Tokens:**
   - User clicks "Get RWA Tokens" button
   - **Modal appears with 3-4 asset choices:** Invoices, T-Bills, Real Estate, etc.
   - User selects desired asset type
   - User receives 100 tokens of that specific RWA type
5. **Stake RWA:**
   - User selects which RWA asset type to stake
   - Platform token minted: `OrionInvoicesToken`, `OrionTBillToken`, etc.
   - User auto-whitelisted
6. **Borrow USDC:**
   - User selects multiple platform tokens as collateral (percentage-based)
   - Must total 100%
   - Each collateral type is distinct (not all same token)
   - Borrows USDC/XLM
7. **Profile:**
   - Shows all staked assets by type
   - Shows all platform token balances
   - LTV per asset
   - Transaction history
   - Auto-repay toggle

---

## 🏗️ Current Architecture (What's Built)

### Contracts Deployed (Testnet):

```
1. USDC Token         : CAXHQJ6IHN2TPAJ4NEOXJJLRRAO74BEAWA3RXHD6NSOWRBQCTVZA3ZGS
2. RWA Token (Single) : CCHUQ75NY5CFWIXG42RJRZQDMZ2HOAERS4RSX4EL6EEOUE6OMOFLBFVV
3. stRWA Token        : CCCTL6UHRPOODYKYOXAW6Y3NKOFPFKB7QIYRRYGEANM2KHYYYAT4PJUS
4. Vault (Single)     : CB3I43AX6VBYTHLVGXK3TVM5RZXLTSHT5RIHOTK2BHORNQY3RF3QH2TT
5. Lending Pool       : CBJM554JCHWRFG7QFBKMPAPOO4DBJPLKHSH2T7U4FRLCPDS36U44WT5Y
6. Oracle             : CD5XYT6WXOB567JC3QZGJ7RWHWP4N3C4GJ5LX75WDWUGL7NPXFJJC6AZ
```

### Current User Flow:

```
1. User connects wallet
2. User clicks "Get RWA Tokens" → Generic RWA tokens minted (NO asset selection)
3. User stakes RWA → Receives generic stRWA tokens
4. User borrows → Uses stRWA as collateral (only one token type)
5. UI shows 3 vaults (AlexRWA, EthRWA, BtcRWA) but all map to same contract
```

**Key Point:** There's only ONE RWA token type. The UI mock shows multiple types, but backend doesn't support it.

---

## 📊 Gap Analysis Table

| Feature | Your Vision | Current State | Gap |
|---------|------------|---------------|-----|
| **RWA Token Types** | Multiple (Invoices, T-Bills, Real Estate, etc.) | Single generic RWA token | 🔴 CRITICAL |
| **Asset Selection on Mint** | User chooses asset type from modal | No selection, generic mint | 🔴 CRITICAL |
| **Platform Tokens** | OrionInvoicesToken, OrionTBillToken, etc. | Single stRWA token | 🔴 CRITICAL |
| **Vault Contracts** | One per asset type | Single vault for all | 🔴 CRITICAL |
| **Collateral Types** | Multiple distinct tokens | Single stRWA token | 🔴 CRITICAL |
| **Oracle Pricing** | Price per asset type | Single stRWA price | 🟡 NEEDS UPDATE |
| **Bots** | Handle multiple asset types | Configured for single asset | 🟡 NEEDS UPDATE |

---

## 🎨 Frontend Analysis

### Current Frontend State:

#### StakeSection.tsx (Lines 61-65):
```typescript
const vaults = [
  { id: "alexVault", name: "AlexRWA", emoji: "🏦"},
  { id: "ethVault", name: "EthRWA", emoji: "⚡"},
  { id: "btcVault", name: "BtcRWA", emoji: "₿"}
];

// Comment at line 67-68:
// NOTE: Currently only one vault is deployed. Multiple vaults will be added in backend later.
// For now, all vaults map to the same RWA token contract
```

**Issue:** Frontend shows 3 vault options, but they're cosmetic - all use same contract.

#### StakeSection.tsx (Lines 82-105) - Get RWA Tokens:
```typescript
const handleGetMockRWA = async () => {
  // TODO: Replace with actual mint_rwa_tokens contract call when available
  toast.info("RWA Token minting function not yet implemented in backend.");

  // No asset selection modal
  // No asset type parameter
  // Just mints generic RWA tokens
}
```

**Missing:** Asset selection modal, asset type parameter.

#### BorrowSection.tsx - Collateral Selection:
```typescript
const collateralAssets = [
  { id: "OrionAlexRWA", name: "OrionAlexRWA", icon: "🏦" },
  { id: "OrionEthRWA", name: "OrionEthRWA", icon: "⚡" },
  { id: "OrionBtcRWA", name: "OrionBtcRWA", icon: "₿" },
];
```

**Issue:** UI shows 3 collateral types, but all resolve to same stRWA token in backend.

### What Frontend Needs:

1. **Asset Selection Modal** (NEW)
   - Appears when user clicks "Get RWA Tokens"
   - Shows available asset types with descriptions
   - User selects one asset type
   - Calls `mint_rwa_tokens(user, asset_type, amount)`

2. **Multi-Contract Integration** (MAJOR UPDATE)
   - Map asset types to contract addresses
   - Track balances for each RWA type separately
   - Track balances for each platform token separately
   - Update service layer to handle multiple contracts

3. **Vault Selection** (UPDATE)
   - Make vault selection functional (not cosmetic)
   - Each vault stakes different RWA type
   - Each vault mints different platform token

4. **True Multi-Collateral** (UPDATE)
   - Percentage selection maps to actual different tokens
   - Calculate health factors per token type
   - Display accurate token balances per type

---

## 🔧 Backend Analysis

### What Backend Currently Has:

**6 Contracts:**
1. USDC (shared)
2. 1x RWA Token
3. 1x stRWA Token
4. 1x Vault
5. 1x Lending Pool (handles all collateral)
6. 1x Oracle (prices stRWA)

**Missing Functions:**
- `mint_rwa_tokens()` in RWA contract (documented in BACKEND_REQUIREMENTS.md)
- Auto-whitelist in `stake()` function

### What Backend Needs for Multi-Asset:

**Contract Multiplication:**

For **3 asset types** (Invoices, T-Bills, Real Estate):

```
USDC Token (shared)              - 1 contract ✅ Exists

// SET 1: Invoices
RWA_Invoices                     - 1 contract ❌ NEW
stRWA_Invoices (OrionInvoices)   - 1 contract ❌ NEW
Vault_Invoices                   - 1 contract ❌ NEW

// SET 2: T-Bills
RWA_TBills                       - 1 contract ❌ NEW
stRWA_TBills (OrionTBills)       - 1 contract ❌ NEW
Vault_TBills                     - 1 contract ❌ NEW

// SET 3: Real Estate
RWA_RealEstate                   - 1 contract ❌ NEW
stRWA_RealEstate (OrionRE)       - 1 contract ❌ NEW
Vault_RealEstate                 - 1 contract ❌ NEW

Lending Pool (shared)            - 1 contract ✅ Exists (needs update)
Oracle (shared)                  - 1 contract ✅ Exists (needs update)
```

**Total:** 9 new contracts needed (3 sets × 3 contracts per set)

**Lending Pool Updates:**
```rust
// Current: Accepts single collateral type (stRWA)
pub fn originate_loan(
    borrower: Address,
    collateral_amount: i128,
    loan_amount: i128,
    duration_months: u32,
)

// Needed: Accept multiple collateral types
pub struct CollateralInput {
    token_address: Address,  // Which stRWA token
    amount: i128,
}

pub fn originate_loan(
    borrower: Address,
    collaterals: Vec<CollateralInput>,  // Multiple types
    loan_amount: i128,
    duration_months: u32,
)
```

**Oracle Updates:**
```rust
// Current: Stores single price for stRWA
set_price(asset: Address, price: i128)
get_price(asset: Address) -> (i128, u64)

// Needed: Handle prices for multiple stRWA types
set_price(asset_type: AssetType, price: i128)
get_price(asset_type: AssetType) -> (i128, u64)

// Or keep same interface, call per token address
```

---

## 🤖 Bot Infrastructure Analysis

### Current Bots (3):

1. **Oracle Bot** - Updates stRWA price
2. **Liquidation Bot** - Monitors loan health
3. **Auto-Repay Bot** - Routes yield to repayments

### Required Updates:

**Oracle Bot:**
```typescript
// Current: Fetches price for single stRWA token
const price = await fetchPrice('stRWA');
await oracle.set_price(STAKED_RWA_A, price);

// Needed: Fetch prices for multiple asset types
const prices = {
  invoices: await fetchPrice('Invoices'),
  tbills: await fetchPrice('TBills'),
  realEstate: await fetchPrice('RealEstate'),
};

await oracle.set_price(STAKED_RWA_INVOICES, prices.invoices);
await oracle.set_price(STAKED_RWA_TBILLS, prices.tbills);
await oracle.set_price(STAKED_RWA_REALESTATE, prices.realEstate);
```

**Liquidation Bot:**
```typescript
// Current: Calculates health with single collateral
const health = (collateral * price) / debt;

// Needed: Calculate health with multiple collaterals
const totalCollateralValue = collaterals.reduce((sum, col) => {
  const price = await oracle.get_price(col.token_address);
  return sum + (col.amount * price);
}, 0);
const health = totalCollateralValue / debt;
```

**Auto-Repay Bot:**
```typescript
// Current: Claims yield from single vault
const yield = await vault.claimable_yield(user);

// Needed: Aggregate yield across multiple vaults
const yields = await Promise.all([
  vaultInvoices.claimable_yield(user),
  vaultTBills.claimable_yield(user),
  vaultRealEstate.claimable_yield(user),
]);
const totalYield = yields.reduce((sum, y) => sum + y, 0n);
```

---

## 💡 Solution Options

### Option A: Full Multi-Asset Implementation (Your Vision)

**Deploy 3 asset sets:**

```
Set 1: Invoices  (RWA + stRWA + Vault)
Set 2: T-Bills   (RWA + stRWA + Vault)
Set 3: Real Est. (RWA + stRWA + Vault)
```

**Pros:**
- ✅ Matches your vision exactly
- ✅ True asset diversification
- ✅ Scalable for future asset types

**Cons:**
- ❌ 9 new contracts to deploy
- ❌ 3x gas costs for operations
- ❌ Frontend needs major refactor
- ❌ Bots need multi-asset logic
- ❌ Higher complexity

**Timeline:** 3-4 days of development

---

### Option B: Single Asset with Metadata (Simplified)

**Keep single RWA/stRWA contract, add asset type metadata:**

```rust
pub struct RWABalance {
    amount: i128,
    asset_type: AssetType,  // Invoices, TBills, RealEstate
}

// Each user can have balances of multiple types
Map<Address, Vec<RWABalance>>
```

**Pros:**
- ✅ Only update existing contracts
- ✅ No new deployments needed
- ✅ Lower gas costs
- ✅ Simpler to implement

**Cons:**
- ❌ Not true asset separation
- ❌ Harder to price different assets
- ❌ Less flexible than Option A

**Timeline:** 1-2 days of development

---

### Option C: Hybrid Approach (Recommended for Hackathon)

**Phase 1 (Now): Single Asset System**
- Deploy with current single RWA setup
- Document as "V1 - Single Asset"
- Get working end-to-end

**Phase 2 (Future): Add Multi-Asset**
- Deploy additional asset sets
- Frontend handles multiple contracts
- Migration path for users

**Pros:**
- ✅ Ship working product fast
- ✅ Validate core mechanics first
- ✅ Add complexity later when needed
- ✅ Clear upgrade path

**Cons:**
- ❌ Not your full vision initially
- ❌ Requires migration later

**Timeline:** Phase 1: 1 day, Phase 2: 3-4 days

---

## 🎯 Recommended Path Forward

### For Hackathon Success:

**I recommend Option C - Hybrid Approach**

### Phase 1: Ship Single-Asset MVP (1-2 days)

**Backend:**
1. Add `mint_rwa_tokens()` to existing RWA contract
2. Add auto-whitelist to existing `stake()` function
3. Deploy/update contracts
4. Run oracle bot with single price

**Frontend:**
1. Keep current UI (it works with single asset)
2. Remove asset selection complexity
3. Focus on making end-to-end flow work
4. Document as "Single Asset Version"

**Success Criteria:**
✅ User can get RWA tokens
✅ User can stake → receive stRWA
✅ User can borrow against stRWA
✅ User can repay loan
✅ User can claim yield
✅ Auto-repay works
✅ Liquidations work

### Phase 2: Expand to Multi-Asset (Post-Hackathon)

Once Phase 1 is stable, add:
1. Deploy 2 more asset sets (Invoices, T-Bills)
2. Add asset selection modal
3. Update bots for multi-asset
4. Add migration for existing users

---

## 📋 Critical Questions for You

Before I finalize backend requirements docs, please clarify:

### Q1: Asset System Priority?
**A)** Multi-asset is CRITICAL for hackathon (go with Option A)
**B)** Single asset is OK for hackathon, multi-asset later (go with Option C)
**C)** Want to discuss alternative approach (Option B)

### Q2: How many asset types initially?
**A)** 3 asset types (Invoices, T-Bills, Real Estate)
**B)** 4+ asset types
**C)** Start with 1, add more later

### Q3: Asset Selection Method?
**A)** User selects from modal when minting
**B)** Each asset type has separate "Get Tokens" button
**C)** Simplified: All users get same generic RWA tokens

### Q4: Collateral Mixing?
**A)** Users can mix multiple asset types as collateral (complex)
**B)** Users can only use one asset type per loan (simpler)
**C)** All collateral is same type (current state)

### Q5: Timeline Priority?
**A)** Must have multi-asset for hackathon submission
**B)** Want working single-asset ASAP, enhance later
**C)** Flexible, want to discuss

---

## 📁 Next Steps

Once you answer the critical questions above, I will:

1. ✅ Create **BACKEND_FINAL_REQUIREMENTS.md** with precise specifications
2. ✅ Update **DEPLOYMENT_CHECKLIST.md** with deployment steps
3. ✅ Create **FRONTEND_UPDATES_NEEDED.md** if multi-asset chosen
4. ✅ Provide contract modification examples
5. ✅ Update bot configurations

---

## 📊 Summary

**Current State:**
- ✅ 6 contracts deployed (single-asset system)
- ✅ Frontend UI complete (shows multi-asset mockup)
- ✅ Service layer complete (single-asset)
- ✅ 3 bot specs documented
- ❌ Multi-asset backend NOT implemented
- ❌ Asset selection NOT implemented

**Your Vision:**
- Multiple distinct RWA asset types
- User selects asset type when minting
- Different platform tokens per asset
- True multi-collateral borrowing

**Gap:**
- Need 9 new contracts OR
- Need contract redesign OR
- Need to adjust expectations

**Decision Needed:**
- Which option (A, B, or C)?
- Answer 5 critical questions above
- Then I'll create final backend docs

---

**Status:** ⏸️ PAUSED - Awaiting your direction before finalizing backend requirements

