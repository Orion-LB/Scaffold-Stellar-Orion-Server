# Backend Contract Requirements for Frontend Integration

This document outlines the backend contract functions that need to be added or modified to support the frontend functionality.

## Overview
The frontend has been integrated with contract calls, but some backend functions are missing or need modifications. The UI has been restored to match the original design while keeping contract integration in place.

---

## 1. RWA Token Contract - Minting Function

### Required Function: `mint_rwa_tokens`

**Location:** RWA Token Contract (MockRWA)

**Purpose:** Allow users to mint RWA tokens for testing/hackathon purposes

**Function Signature:**
```rust
pub fn mint_rwa_tokens(env: Env, to: Address, amount: i128) -> Result<(), Error>
```

**Requirements:**
1. Mint RWA tokens to the specified address
2. **Automatically whitelist the user** (call `allow_user(to)` internally)
3. For hackathon: Allow **anyone** to call this (no admin check)
4. Suggested amount: 1000 RWA tokens (1000 * 10^18)
5. Optional: Add rate limiting (e.g., once per address, or time-based cooldown)

**Frontend Integration Point:**
- File: `/src/components/dashboard/StakeSection.tsx`
- Function: `handleGetMockRWA()` (line ~82)
- Button: "Get RWA Tokens" in stake section

**Implementation Example:**
```rust
pub fn mint_rwa_tokens(env: Env, to: Address, amount: i128) -> Result<(), Error> {
    to.require_auth(); // User must sign the transaction

    // Mint tokens
    mint(&env, &to, &amount);

    // Auto-whitelist the user
    allow_user(&env, &to);

    // Emit event
    env.events().publish(("mint_rwa", "to"), &to);

    Ok(())
}
```

---

## 2. Vault Contract - Auto-Whitelist on Stake

### Required Modification: `stake` function

**Location:** RWA Vault Contract

**Purpose:** Automatically whitelist users when they stake, removing the need for manual admin approval

**Current Flow:**
1. User approves RWA tokens
2. User calls `stake()`
3. If not whitelisted → Transaction fails ❌

**Required Flow:**
1. User approves RWA tokens
2. User calls `stake()`
3. Vault checks if user is whitelisted in RWA token
4. If NOT whitelisted → Vault calls `rwa_token.allow_user(user)` ✅
5. Then proceed with stake

**Implementation Pseudocode:**
```rust
pub fn stake(env: Env, user: Address, amount: i128) -> Result<(), Error> {
    user.require_auth();

    // Get RWA token contract
    let rwa_token = get_rwa_token_contract(&env);

    // Check if user is whitelisted
    let is_whitelisted: bool = rwa_token.allowed(&user);

    // If not whitelisted, whitelist them automatically
    if !is_whitelisted {
        rwa_token.allow_user(&user);
    }

    // Now proceed with normal stake logic
    // ... existing stake implementation

    Ok(())
}
```

**Frontend Integration Point:**
- File: `/src/components/dashboard/StakeSection.tsx`
- Function: `handleStake()` (line ~107-173)
- Comment at line 139-147 explains this requirement

**Benefits:**
- Seamless user experience
- No manual admin intervention required
- Users can stake immediately after minting

---

## 3. Multiple Vault Support (Future Enhancement)

### Current State:
- Only ONE vault deployed (AlexRWA)
- Frontend UI shows 3 vaults (AlexRWA, EthRWA, BtcRWA) but all map to the same contract

### Required for Full Implementation:
Deploy separate contracts for each RWA type:
1. **AlexRWA Vault** - Already deployed ✅
2. **EthRWA Vault** - Not deployed ❌
3. **BtcRWA Vault** - Not deployed ❌

Each vault would have its own:
- RWA token contract
- stRWA token contract
- Vault contract
- Separate liquidity pools

**Frontend Note:**
- Currently all vaults use `CONTRACT_ADDRESSES.MOCK_RWA_A`
- When multiple vaults are deployed, update `/src/services/contracts/index.ts` with new addresses

---

## 4. Borrow Section - Percentage-Based Collateral (Optional Restoration)

### Current Implementation:
The borrow section was simplified to a single collateral input field during integration.

### Original UI Feature:
- User could select multiple collateral types
- Each collateral had percentage-based selection (0%, 25%, 50%, 75%, 100%)
- Total must equal 100% before borrowing

### To Restore Original UI:
The original collateral selection modal is available in git history. It had:
- Multiple collateral assets (OrionAlexRWA, OrionEthRWA, OrionBtcRWA)
- Percentage buttons for each
- Visual feedback when total reaches 100%

**Decision Needed:**
- Keep current simplified single-collateral UI? ✅ (Recommended for hackathon)
- Restore percentage-based multi-collateral UI? (More complex, needs backend support)

**If Multi-Collateral is Needed:**
Backend would need to support arrays of collateral types in `originate_loan`:
```rust
pub fn originate_loan(
    env: Env,
    borrower: Address,
    collaterals: Vec<CollateralInput>, // Multiple collaterals
    loan_amount: i128,
    duration_months: u32
) -> Result<(), Error>

struct CollateralInput {
    token_address: Address,
    amount: i128,
}
```

---

## 5. Oracle Price Submission

### Current State:
- Oracle contract deployed ✅
- No prices submitted yet ❌
- Frontend uses default price: 105 USDC (10500 basis points)

### Required:
Run the oracle price bot to submit stRWA prices regularly.

**Bot Location:**
```
orion-backened/Scaffold-Stellar-Orion-Server/bots/oracle-price-bot/
```

**Command to Run:**
```bash
cd bots/oracle-price-bot
npm install
npm start
```

**What it does:**
- Fetches real-world RWA prices
- Submits to oracle contract every X minutes
- Updates `get_price()` return value

---

## 6. Frontend Integration Status

### ✅ Completed & Working:
1. **Wallet Connection**
   - Freighter wallet integration
   - Connect/disconnect buttons
   - Address display

2. **Stake Section**
   - View RWA & stRWA balances
   - Stake RWA → Receive stRWA
   - Unstake stRWA → Receive RWA
   - Claim USDC yield
   - Original UI preserved

3. **Borrow Section**
   - View stRWA collateral balance
   - View active loan details
   - Calculate health factor
   - Originate loan (collateral → borrow USDC)
   - Repay loan
   - Real-time balance updates

4. **Contract Services**
   - All 6 contracts integrated
   - Proper BigInt handling
   - Decimal conversions (USDC: 7, RWA/stRWA: 18)
   - Transaction signing with Freighter

### ⚠️ Pending Backend Functions:
1. `mint_rwa_tokens()` - RWA Token Contract
2. Auto-whitelist in `stake()` - Vault Contract
3. Oracle price bot running - Infrastructure

### 🔄 Optional Enhancements:
1. Multiple vault deployment (EthRWA, BtcRWA)
2. Percentage-based multi-collateral borrowing
3. Profile page (transaction history, analytics)

---

## Testing Checklist

Once backend functions are added, test in this order:

### 1. Test Minting
```
✅ User clicks "Get RWA Tokens"
✅ mint_rwa_tokens() is called
✅ User receives 1000 RWA tokens
✅ User is automatically whitelisted
✅ RWA balance updates in UI
```

### 2. Test Staking
```
✅ User enters amount and clicks "Stake"
✅ Approval transaction succeeds
✅ Stake transaction succeeds (auto-whitelist happens internally)
✅ User receives stRWA tokens (1:1 ratio)
✅ Balances update in UI
```

### 3. Test Borrowing
```
✅ User enters collateral (stRWA) and borrow amount (USDC)
✅ Health factor shows >= 1.40
✅ Approval transaction succeeds
✅ Originate loan transaction succeeds
✅ User receives USDC
✅ Active loan appears in UI
```

### 4. Test Repayment
```
✅ User clicks "Repay Loan" on active loan
✅ USDC approval succeeds
✅ Repay transaction succeeds
✅ Collateral (stRWA) returned to user
✅ Active loan removed from UI
```

---

## Contract Addresses (Testnet)

All contracts are deployed on Stellar Testnet:

```typescript
USDC: 'CAXHQJ6IHN2TPAJ4NEOXJJLRRAO74BEAWA3RXHD6NSOWRBQCTVZA3ZGS'
RWA Token: 'CCHUQ75NY5CFWIXG42RJRZQDMZ2HOAERS4RSX4EL6EEOUE6OMOFLBFVV'
stRWA Token: 'CCCTL6UHRPOODYKYOXAW6Y3NKOFPFKB7QIYRRYGEANM2KHYYYAT4PJUS'
Vault: 'CB3I43AX6VBYTHLVGXK3TVM5RZXLTSHT5RIHOTK2BHORNQY3RF3QH2TT'
Lending Pool: 'CBJM554JCHWRFG7QFBKMPAPOO4DBJPLKHSH2T7U4FRLCPDS36U44WT5Y'
Oracle: 'CD5XYT6WXOB567JC3QZGJ7RWHWP4N3C4GJ5LX75WDWUGL7NPXFJJC6AZ'
```

View on Stellar Expert:
https://stellar.expert/explorer/testnet

---

## Summary

**Priority 1 (Required for basic functionality):**
1. Add `mint_rwa_tokens()` to RWA Token contract
2. Modify `stake()` in Vault to auto-whitelist users
3. Run oracle price bot

**Priority 2 (Nice to have):**
1. Deploy multiple vaults (EthRWA, BtcRWA)
2. Restore percentage-based collateral UI

**Frontend Status:**
- All contract integrations complete ✅
- Original UI design preserved ✅
- Ready to test once backend functions are added ✅
