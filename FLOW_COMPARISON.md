# 🔄 User Flow Comparison: Current vs Desired

## Side-by-Side Comparison

### 🎯 Landing Page → Dashboard

| Step | Current Flow | Your Desired Flow | Match? |
|------|-------------|-------------------|--------|
| 1 | User visits landing page | User visits landing page | ✅ |
| 2 | User clicks "Launch App" | User clicks "Launch App" | ✅ |
| 3 | Dashboard opens | Dashboard opens | ✅ |
| 4 | Sidebar shows: Stake, Borrow, Profile | Sidebar shows: Stake, Borrow, Profile | ✅ |

**Status:** ✅ Landing → Dashboard flow is IDENTICAL

---

### 💰 Get RWA Tokens Flow

#### Current Implementation:
```
User clicks "Get RWA Tokens" button
    ↓
Toast message: "Not implemented in backend"
    ↓
(If implemented) mint_rwa_tokens(user, 1000 * 10^18)
    ↓
User receives generic RWA tokens
    ↓
NO ASSET TYPE SELECTION
```

#### Your Desired Flow:
```
User clicks "Get RWA Tokens" button
    ↓
Modal appears with asset choices:
  - 🏢 Invoice Financing RWA
  - 📜 US Treasury Bills RWA
  - 🏠 Real Estate Tokens RWA
  - 📊 Corporate Bonds RWA
    ↓
User selects "Invoice Financing RWA"
    ↓
mint_rwa_tokens(user, asset_type: INVOICES, 100 * 10^18)
    ↓
User receives 100 Invoice RWA tokens
```

**Status:** 🔴 **CRITICAL DIFFERENCE**

**Current Contracts:**
- 1 RWA token contract
- Generic minting (no asset type)

**Needed for Your Flow:**
- 4 RWA token contracts (Invoices, TBills, RealEstate, Bonds) OR
- 1 RWA token with asset_type parameter

**Contract Addresses Currently:**
```typescript
MOCK_RWA_A: 'CCHUQ75NY5CFWIXG42RJRZQDMZ2HOAERS4RSX4EL6EEOUE6OMOFLBFVV'
// This is the ONLY RWA token deployed
```

**Needed:**
```typescript
RWA_INVOICES: 'C...' // NEW
RWA_TBILLS: 'C...'   // NEW
RWA_REALESTATE: 'C...' // NEW
RWA_BONDS: 'C...'     // NEW
```

---

### 🔒 Stake RWA Flow

#### Current Implementation:
```
User on Stake tab
    ↓
Vault selector shows: AlexRWA, EthRWA, BtcRWA (COSMETIC ONLY)
    ↓
All vaults map to: CONTRACT_ADDRESSES.MOCK_RWA_A
    ↓
User enters amount
    ↓
approve(vault, amount)
    ↓
stake(user, amount)
    ↓
User receives generic stRWA tokens
    ↓
Contract: STAKED_RWA_A (single contract)
```

#### Your Desired Flow:
```
User on Stake tab
    ↓
User's RWA token balances shown:
  - Invoices RWA: 100
  - TBills RWA: 0
  - Real Estate RWA: 0
    ↓
User selects "Invoices RWA" to stake
    ↓
User enters amount: 50
    ↓
approve(invoices_vault, 50)
    ↓
stake(user, 50)
    ↓
User receives 50 OrionInvoicesToken (platform token)
    ↓
Contract: STAKED_RWA_INVOICES (specific to invoices)
```

**Status:** 🔴 **CRITICAL DIFFERENCE**

**Current State:**
- UI shows 3 vault options (AlexRWA, EthRWA, BtcRWA)
- Comment in code: "All vaults map to the same RWA token contract"
- Only 1 stRWA token exists

**Your Vision:**
- User's wallet shows balances per asset type
- User selects which asset type to stake
- Different platform tokens minted per asset
- Each asset has its own vault

**Code Evidence (StakeSection.tsx:67-68):**
```typescript
// NOTE: Currently only one vault is deployed. Multiple vaults will be added in backend later.
// For now, all vaults map to the same RWA token contract
```

---

### 💳 Borrow USDC Flow

#### Current Implementation:
```
User on Borrow tab
    ↓
User's stRWA balance shown: 50 stRWA
    ↓
User selects collateral percentages:
  - OrionAlexRWA: 100% (but this is just UI, same token)
  - OrionEthRWA: 0%
  - OrionBtcRWA: 0%
    ↓
Calculate collateral: 50 stRWA (single token type)
    ↓
approve(lending_pool, 50)
    ↓
originate_loan(user, 50, loan_amount, duration)
    ↓
Lock 50 stRWA tokens, receive USDC
```

#### Your Desired Flow:
```
User on Borrow tab
    ↓
User's platform token balances:
  - OrionInvoicesToken: 50
  - OrionTBillsToken: 0
  - OrionRealEstateToken: 0
    ↓
User selects collateral percentages:
  - OrionInvoicesToken: 60% → 30 tokens
  - OrionTBillsToken: 0% → 0 tokens
  - OrionRealEstateToken: 40% → 20 tokens
  - Total: 100% ✅
    ↓
approve(lending_pool, OrionInvoicesToken, 30)
approve(lending_pool, OrionRealEstateToken, 20)
    ↓
originate_loan(
  user,
  collaterals: [
    {token: OrionInvoicesToken, amount: 30},
    {token: OrionRealEstateToken, amount: 20}
  ],
  loan_amount,
  duration
)
    ↓
Lock multi-asset collateral, receive USDC
```

**Status:** 🔴 **CRITICAL DIFFERENCE**

**Current Contract Interface:**
```rust
pub fn originate_loan(
    env: Env,
    borrower: Address,
    collateral_amount: i128,      // Single amount
    loan_amount: i128,
    duration_months: u32,
)
```

**Needed for Your Flow:**
```rust
pub struct CollateralInput {
    token_address: Address,
    amount: i128,
}

pub fn originate_loan(
    env: Env,
    borrower: Address,
    collaterals: Vec<CollateralInput>,  // Multiple types!
    loan_amount: i128,
    duration_months: u32,
)
```

---

### 👤 Profile Section

#### Current Implementation:
```
User on Profile tab
    ↓
Shows:
  - Total stRWA balance: 50
  - Active loan amount: 30 USDC
  - Collateral locked: 50 stRWA
  - Health factor: 1.67
  - LTV: 60%
    ↓
Single collateral type displayed
```

#### Your Desired Flow:
```
User on Profile tab
    ↓
Staked Assets section:
  - Invoices: 50 stInvoices
  - TBills: 0 stTBills
  - Real Estate: 0 stRE
    ↓
Platform Token Balances:
  - OrionInvoicesToken: 50
  - OrionTBillsToken: 0
  - OrionRealEstateToken: 0
    ↓
Active Loan:
  - Collateral breakdown:
    - 30 OrionInvoicesToken @ $105 = $3,150
    - 20 OrionRealEstateToken @ $100 = $2,000
    - Total collateral value: $5,150
  - Loan amount: 30 USDC
  - Health factor: 1.72 (per token type)
  - LTV per asset type
    ↓
Transaction History:
  - Minted 100 Invoices RWA
  - Staked 50 Invoices RWA
  - Borrowed 30 USDC
    ↓
Auto-repay toggle: ON/OFF
```

**Status:** 🔴 **CRITICAL DIFFERENCE**

**Current:**
- Shows aggregate data
- Single token balances
- Simple health/LTV

**Your Vision:**
- Asset-by-asset breakdown
- Multiple token balances
- Per-asset LTV tracking
- Asset-specific transaction history

---

## 🤖 Bot Alignment

### Oracle Bot

#### Current:
```typescript
// Fetches single price
const stRwaPrice = await fetchPrice('stRWA');
await oracle.set_price(STAKED_RWA_A, stRwaPrice);
```

#### Needed:
```typescript
// Fetches multiple prices
const prices = {
  invoices: await fetchInvoicesPrice(),
  tbills: await fetchTBillsPrice(),
  realEstate: await fetchRealEstatePrice(),
};

await oracle.set_price(STAKED_RWA_INVOICES, prices.invoices);
await oracle.set_price(STAKED_RWA_TBILLS, prices.tbills);
await oracle.set_price(STAKED_RWA_REALESTATE, prices.realEstate);
```

---

### Liquidation Bot

#### Current:
```typescript
// Single collateral health
const health = (collateral * price) / debt;
if (health < 1.1) liquidate();
```

#### Needed:
```typescript
// Multi-collateral health
const collateralValues = loan.collaterals.map(c => {
  const price = await oracle.get_price(c.token);
  return c.amount * price;
});
const totalValue = collateralValues.reduce((a, b) => a + b);
const health = totalValue / debt;
if (health < 1.1) liquidate();
```

---

### Auto-Repay Bot

#### Current:
```typescript
// Single vault yield
const yield = await vault.claimable_yield(user);
await repay_loan(user, yield);
```

#### Needed:
```typescript
// Multi-vault yield aggregation
const yields = await Promise.all([
  vaultInvoices.claimable_yield(user),
  vaultTBills.claimable_yield(user),
  vaultRealEstate.claimable_yield(user),
]);
const totalYield = yields.reduce((a, b) => a + b);
await repay_loan(user, totalYield);
```

---

## 📊 Contract Deployment Comparison

### Current Deployment (6 Contracts):

```
1. USDC Token                 ✅ DEPLOYED
2. RWA Token (generic)        ✅ DEPLOYED
3. stRWA Token (generic)      ✅ DEPLOYED
4. Vault (single)             ✅ DEPLOYED
5. Lending Pool               ✅ DEPLOYED
6. Oracle                     ✅ DEPLOYED
```

### Needed for Your Vision (15 Contracts):

```
1. USDC Token                 ✅ DEPLOYED (shared)

// SET 1: Invoice Financing
2. RWA_Invoices               ❌ NEEDS DEPLOYMENT
3. stRWA_Invoices             ❌ NEEDS DEPLOYMENT
4. Vault_Invoices             ❌ NEEDS DEPLOYMENT

// SET 2: Treasury Bills
5. RWA_TBills                 ❌ NEEDS DEPLOYMENT
6. stRWA_TBills               ❌ NEEDS DEPLOYMENT
7. Vault_TBills               ❌ NEEDS DEPLOYMENT

// SET 3: Real Estate
8. RWA_RealEstate             ❌ NEEDS DEPLOYMENT
9. stRWA_RealEstate           ❌ NEEDS DEPLOYMENT
10. Vault_RealEstate          ❌ NEEDS DEPLOYMENT

// SET 4: Corporate Bonds
11. RWA_Bonds                 ❌ NEEDS DEPLOYMENT
12. stRWA_Bonds               ❌ NEEDS DEPLOYMENT
13. Vault_Bonds               ❌ NEEDS DEPLOYMENT

14. Lending Pool              ✅ DEPLOYED (needs update for multi-collateral)
15. Oracle                    ✅ DEPLOYED (needs update for multi-asset pricing)
```

**Deployment Gap:** 11 new contracts needed

---

## 💭 Key Insights

### What's Already Done Right:

1. ✅ **Landing page flow** - Perfect
2. ✅ **Wallet connection** - Works as expected
3. ✅ **Dashboard structure** - Sidebar, sections all there
4. ✅ **UI Components** - Beautiful, functional
5. ✅ **Service layer architecture** - Well structured
6. ✅ **Single-asset mechanics** - Approve, stake, borrow all work
7. ✅ **Bot specifications** - Comprehensive, just need multi-asset updates

### What Needs Major Work:

1. 🔴 **Asset type selection** - No modal, no user choice
2. 🔴 **Multiple RWA tokens** - Only 1 exists, need 3-4
3. 🔴 **Multiple platform tokens** - Only 1 stRWA, need OrionXXX tokens
4. 🔴 **Multiple vaults** - Only 1 vault, need 3-4
5. 🔴 **Multi-collateral loans** - Contract doesn't support Vec<Collateral>
6. 🔴 **Per-asset pricing** - Oracle handles 1 price, need multiple
7. 🔴 **Per-asset balances** - Frontend shows aggregates, need breakdowns

---

## 🎯 Decision Matrix

### Option A: Full Multi-Asset (Your Vision)
**Effort:** 🔴🔴🔴🔴🔴 (Very High)
**Time:** 3-4 days
**Contracts:** 11 new deployments
**Frontend:** Major updates
**Matches Vision:** 100%

### Option B: Single Asset with Types (Hybrid)
**Effort:** 🟡🟡🟡 (Medium)
**Time:** 1-2 days
**Contracts:** Update existing
**Frontend:** Moderate updates
**Matches Vision:** 60%

### Option C: Single Asset MVP (Pragmatic)
**Effort:** 🟢🟢 (Low)
**Time:** 1 day
**Contracts:** Add 2 functions
**Frontend:** Minimal changes
**Matches Vision:** 30%

---

## 🚦 Recommendation

**For Hackathon Success → Option C, then Option A**

### Phase 1: Single Asset MVP (Now)
Get a **fully working product** with:
- ✅ Mint RWA tokens (generic)
- ✅ Stake → receive stRWA
- ✅ Borrow against stRWA
- ✅ Repay loans
- ✅ Claim yield
- ✅ Auto-repay working
- ✅ Liquidations working

**Why:** Judges value working products over partially-built complexity.

### Phase 2: Multi-Asset Expansion (Post-Demo)
After demo succeeds, add:
- Multiple asset types
- Asset selection
- True multi-collateral
- Per-asset analytics

**Why:** Easier to scale a working product than debug a complex broken one.

---

## 📞 Next Steps

**I need your decision on:**

1. **Which option?** A, B, or C?
2. **How many assets?** 3, 4, or 1?
3. **Timeline?** Multi-asset before hackathon, or after?
4. **Priority?** Working product vs Full vision?

Once you decide, I'll create:
- ✅ Final backend requirements
- ✅ Deployment guide
- ✅ Frontend update specs
- ✅ Contract code examples

---

**Your call!** 🎯

