# Staking Issue Analysis

## Problem Summary

The staking functionality is currently blocked due to a conflict between the OpenZeppelin AllowList token wrapper and the standard Stellar token `approve` mechanism.

## Root Cause

### Current Architecture:

1. **RWA Token Contract** ([mock-rwa-token/src/contract.rs:58](mock-rwa-token/src/contract.rs#L58))

   ```rust
   type ContractType = AllowList;  // This enforces whitelist on transfers
   ```

2. **Vault Staking Flow** ([rwa-vault/src/contract.rs:169-174](rwa-vault/src/contract.rs#L169-L174))
   ```rust
   let rwa_token = token::Client::new(e, &rwa_addr);
   rwa_token.transfer_from(
       &e.current_contract_address(),
       &user,
       &e.current_contract_address(),
       &amount
   );
   ```

### The Conflict:

The AllowList wrapper is causing the `approve` function to fail with **Contract Error #102** (user not authorized), even though:

- ✅ User is whitelisted
- ✅ Vault is whitelisted
- ✅ Vault has manager role

When `transfer_from` is called without a prior approval, it fails with **Contract Error #101** (insufficient allowance).

## Errors Encountered

### Error #102 During Approve:

```
❌ error: transaction simulation failed: HostError: Error(Contract, #102)
Event log:
  - contract:CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP
  - topics:[error, Error(Contract, #102)]
  - data:["failing with contract error", 102]
  - fn_call: approve(owner, spender, amount, live_until_ledger)
```

### Error #101 During Stake (without approval):

```
❌ error: transaction simulation failed: HostError: Error(Contract, #101)
Event log:
  - contract:CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP
  - topics:[error, Error(Contract, #101)]
  - data:["failing with contract error", 101]
  - fn_call: transfer_from(spender, from, to, amount)
```

## Solutions

### Option 1: Modify Vault Contract (RECOMMENDED)

Change the vault to use `transfer` instead of `transfer_from`, eliminating the need for approval.

**File**: `contracts/rwa-vault/src/contract.rs`

**Current Code** (lines 168-174):

```rust
let rwa_token = token::Client::new(e, &rwa_addr);
rwa_token.transfer_from(
    &e.current_contract_address(),
    &user,
    &e.current_contract_address(),
    &amount
);
```

**Proposed Fix**:

```rust
let rwa_token = token::Client::new(e, &rwa_addr);
rwa_token.transfer(
    &user,              // from (requires user's auth)
    &e.current_contract_address(),  // to (vault)
    &amount
);
```

**Advantages**:

- No approval needed
- Simpler user flow (one transaction instead of two)
- Works with AllowList tokens
- User still requires authentication (via `user.require_auth()` at line 151)

**Changes Required**:

1. Update `rwa_vault/src/contract.rs` line 169-174
2. Rebuild contract: `cargo build --target wasm32v1-none --release -p rwa-vault`
3. Redeploy all 3 vaults
4. Re-register vaults with lending pool

### Option 2: Modify RWA Token Contract

Remove or modify the AllowList wrapper to allow approvals.

**File**: `contracts/mock-rwa-token/src/contract.rs`

**Current Code** (line 58):

```rust
type ContractType = AllowList;
```

**Issues with this approach**:

- Would require redeploying all 3 RWA token contracts
- All minted tokens would be lost
- Users would need to be re-whitelisted
- More disruptive than Option 1

### Option 3: Add Custom Approval to RWA Token

Implement a custom approval mechanism that works with AllowList.

**Not Recommended**: This adds complexity and deviates from standard token behavior.

## Recommended Action Plan

1. **Implement Option 1** (Modify vault to use `transfer`)
2. **Test locally** with all three asset types
3. **Redeploy vaults** to testnet
4. **Update frontend** to remove approve step
5. **Test end-to-end** staking flow

## Testing Commands

### After Fix is Applied:

```bash
# Test staking directly (no approval needed)
stellar contract invoke \
  --id <VAULT_ADDRESS> \
  --source-account <user-identity> \
  --network testnet \
  -- stake \
  --user <USER_ADDRESS> \
  --amount 1000000000000000000
```

### Expected Result:

```
✅ Success - User's RWA tokens transferred to vault
✅ Success - User received stRWA tokens 1:1
```

## Current Status

- ❌ Staking is **BLOCKED** for all asset types
- ✅ All vaults are whitelisted
- ✅ Users can be whitelisted
- ✅ Users can mint/receive RWA tokens
- ❌ Users cannot approve vaults (AllowList issue)
- ❌ Users cannot stake (no approval possible)

## Impact

**Frontend**:

- Staking feature is non-functional
- Users will see approval errors
- Need to wait for contract fix before enabling staking

**Workaround**:

- None available without contract modification
- Users cannot stake until vault contract is fixed

## Files to Modify

1. `contracts/rwa-vault/src/contract.rs` - Line 169-174
2. `FRONTEND_STAKING_GUIDE.md` - Update to remove approve step
3. `contracts/deployed-addresses.json` - Update after redeploy

## Timeline Estimate

- Contract modification: 5 minutes
- Rebuild contracts: 2 minutes
- Redeploy 3 vaults: 5 minutes
- Test all assets: 10 minutes
- **Total**: ~25 minutes

---

**Next Step**: Modify the vault contract to use `transfer` instead of `transfer_from`.
