# Mock Multi-Asset Implementation

## Overview
This document describes the temporary mock multi-asset configuration that allows the ProfileSection and other components to work with a multi-asset UI structure while using the current single-asset backend contracts.

## Problem Solved
ProfileSection was importing multi-asset types that didn't exist yet:
- `AssetType` enum
- `ASSET_CONTRACTS` configuration
- `getAllAssetTypes()` helper
- `getAssetConfig()` helper
- Service factory functions

This caused the error: `"The requested module '/src/services/contracts/index.ts' does not provide an export named 'AssetType'"`

## Solution Implemented

### 1. Added Multi-Asset Types & Configuration
**File:** `/src/services/contracts/index.ts`

Added temporary mock configuration that maps all asset types to the current single deployed contracts:

```typescript
export enum AssetType {
  INVOICES = 'invoices',
  TBILLS = 'tbills',
  REALESTATE = 'realestate'
}

export const ASSET_CONTRACTS = {
  [AssetType.INVOICES]: {
    name: 'Invoice RWA',
    displayName: 'Invoice Financing',
    shortName: 'Invoices',
    symbol: 'iRWA',
    emoji: '📄',
    rwa: CONTRACT_ADDRESSES.MOCK_RWA_A,
    stRwa: CONTRACT_ADDRESSES.STAKED_RWA_A,
    vault: CONTRACT_ADDRESSES.RWA_VAULT_A,
    mockPrice: 1.05,
    baseAPY: 8.5,
  },
  [AssetType.TBILLS]: {
    name: 'T-Bills Vault',
    displayName: 'Treasury Bills',
    shortName: 'T-Bills',
    symbol: 'tRWA',
    emoji: '🏦',
    rwa: CONTRACT_ADDRESSES.MOCK_RWA_A, // Same contract
    stRwa: CONTRACT_ADDRESSES.STAKED_RWA_A, // Same contract
    vault: CONTRACT_ADDRESSES.RWA_VAULT_A, // Same contract
    mockPrice: 1.02,
    baseAPY: 5.2,
  },
  [AssetType.REALESTATE]: {
    name: 'Real Estate',
    displayName: 'Real Estate',
    shortName: 'Real Estate',
    symbol: 'rRWA',
    emoji: '🏢',
    rwa: CONTRACT_ADDRESSES.MOCK_RWA_A, // Same contract
    stRwa: CONTRACT_ADDRESSES.STAKED_RWA_A, // Same contract
    vault: CONTRACT_ADDRESSES.RWA_VAULT_A, // Same contract
    mockPrice: 1.08,
    baseAPY: 12.3,
  },
};
```

### 2. Added Helper Functions
```typescript
export const getAllAssetTypes = (): AssetType[] => {
  return [AssetType.INVOICES, AssetType.TBILLS, AssetType.REALESTATE];
};

export const getAssetConfig = (assetType: AssetType) => {
  return ASSET_CONTRACTS[assetType];
};

export const getAssetTypeFromAddress = (contractAddress: string): AssetType | undefined => {
  // Returns the asset type for a given contract address
};
```

### 3. Added Service Factory Functions
To allow ProfileSection to create service instances from contract addresses:

```typescript
export const createMockRWAServiceFromAddress = (contractId: string, wallet?, network?) => {
  return new MockRWAService({ contractId, networkPassphrase, rpcUrl, wallet });
};

export const createStRWAServiceFromAddress = (contractId: string, wallet?, network?) => {
  return new StakedRWAService({ contractId, networkPassphrase, rpcUrl, wallet });
};

export const createVaultServiceFromAddress = (contractId: string, wallet?, network?) => {
  return new VaultService({ contractId, networkPassphrase, rpcUrl, wallet });
};
```

### 4. Added Service Alias
```typescript
export { StakedRWAService as StRWAService } from './StakedRWAService';
```

### 5. Updated ProfileSection Imports
**File:** `/src/components/dashboard/ProfileSection.tsx`

```typescript
import {
  AssetType,
  getAllAssetTypes,
  getAssetConfig,
  createMockRWAServiceFromAddress,
  createStRWAServiceFromAddress,
  createVaultServiceFromAddress
} from "@/services/contracts";
```

Updated service instantiation:
```typescript
const rwaService = createMockRWAServiceFromAddress(config.rwa);
const stRwaService = createStRWAServiceFromAddress(config.stRwa);
const vaultService = createVaultServiceFromAddress(config.vault);
```

### 6. Fixed useContracts.ts
**File:** `/src/hooks/useContracts.ts`

Commented out hooks with placeholder method names and fixed the ones that are actively used:
- Fixed `useClaimableYield` to use `claimable_yield()`
- Fixed `useAssetPrice` to use `get_price()`
- Fixed `usePriceData` to use `get_price_data()`

## Current Behavior

### Multi-Asset UI
The UI now displays 3 separate asset types:
- 📄 Invoice Financing (8.5% APY, $1.05 price)
- 🏦 Treasury Bills (5.2% APY, $1.02 price)
- 🏢 Real Estate (12.3% APY, $1.08 price)

### Backend Reality
All 3 asset types currently interact with the **same** deployed contracts:
- RWA Token: `MOCK_RWA_A`
- stRWA Token: `STAKED_RWA_A`
- Vault: `RWA_VAULT_A`

This means:
- User will see the same balance across all 3 assets
- Actions on one asset affect all assets (same underlying contract)
- Prices and APYs are mock values defined in the config

## Migration Path

When the full multi-asset backend is ready (per BACKEND_FINAL_REQUIREMENTS.md):

1. Deploy 9 new contracts:
   - 3 RWA tokens (one per asset)
   - 3 stRWA tokens (one per asset)
   - 3 Vaults (one per asset)

2. Update ASSET_CONTRACTS with real contract addresses:
```typescript
export const ASSET_CONTRACTS = {
  [AssetType.INVOICES]: {
    // ... existing properties
    rwa: 'NEW_INVOICE_RWA_CONTRACT',
    stRwa: 'NEW_INVOICE_STRWA_CONTRACT',
    vault: 'NEW_INVOICE_VAULT_CONTRACT',
  },
  // ... update TBILLS and REALESTATE similarly
};
```

3. Remove mock prices and use Oracle service:
```typescript
const price = await oracleService.get_price(config.rwa);
```

4. Uncomment and fix hooks in useContracts.ts

## Benefits of This Approach

✅ **UI works immediately** - ProfileSection and Transactions tab work now
✅ **Structure is correct** - Multi-asset architecture is in place
✅ **Easy migration** - Just swap contract addresses when backend is ready
✅ **Testing ready** - Can test UI/UX flows without waiting for backend
✅ **Clear TODO markers** - All temporary code is marked with comments

## Files Modified

1. ✅ `/src/services/contracts/index.ts` - Added mock multi-asset configuration
2. ✅ `/src/components/dashboard/ProfileSection.tsx` - Updated imports
3. ✅ `/src/hooks/useContracts.ts` - Fixed method names, commented out unused hooks
4. ✅ `/src/components/dashboard/TransactionsSection.tsx` - Already created (no changes)
5. ✅ `/src/components/dashboard/DashboardSidebar.tsx` - Already updated (no changes)
6. ✅ `/src/pages/Dashboard.tsx` - Already updated (no changes)

## Build Status

✅ **Build passes successfully**
```bash
npm run build
# ✓ built in 5.39s
```

## Next Steps

1. ✅ **Test the application** - Run `npm run dev` and verify ProfileSection and Transactions work
2. **Backend deployment** - Follow BACKEND_FINAL_REQUIREMENTS.md to deploy multi-asset contracts
3. **Update configuration** - Replace mock contract addresses with real ones
4. **Enable Oracle** - Replace mock prices with real oracle data
5. **Uncomment hooks** - Re-enable useContracts.ts hooks once methods are available
