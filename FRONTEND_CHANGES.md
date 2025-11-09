# 🎨 Frontend Changes - Option A: Full Multi-Asset

## Overview

This document specifies **all frontend changes** needed to support the multi-asset RWA platform.

**Key Changes:**
1. Update contract address configuration
2. Add asset selection modal
3. Update StakeSection for multi-asset
4. Update BorrowSection for true multi-collateral
5. Update ProfileSection for asset breakdown
6. Enhance service layer for multiple contracts

---

## 📦 1. Contract Address Configuration

### File: `src/services/contracts/index.ts`

**REPLACE ENTIRE FILE:**

```typescript
// Contract addresses on Stellar Testnet
export const CONTRACT_ADDRESSES = {
  // Shared Infrastructure
  USDC: 'CAXHQJ6IHN2TPAJ4NEOXJJLRRAO74BEAWA3RXHD6NSOWRBQCTVZA3ZGS',
  LENDING_POOL: '<NEW_LENDING_POOL_ADDRESS>',  // ⚠️ UPDATE after deployment
  MOCK_ORACLE: 'CD5XYT6WXOB567JC3QZGJ7RWHWP4N3C4GJ5LX75WDWUGL7NPXFJJC6AZ',

  // Invoice Financing Set
  RWA_INVOICES: '<RWA_INVOICES_ADDRESS>',      // ⚠️ UPDATE after deployment
  STRWA_INVOICES: '<STRWA_INVOICES_ADDRESS>',  // ⚠️ UPDATE after deployment
  VAULT_INVOICES: '<VAULT_INVOICES_ADDRESS>',  // ⚠️ UPDATE after deployment

  // Treasury Bills Set
  RWA_TBILLS: '<RWA_TBILLS_ADDRESS>',          // ⚠️ UPDATE after deployment
  STRWA_TBILLS: '<STRWA_TBILLS_ADDRESS>',      // ⚠️ UPDATE after deployment
  VAULT_TBILLS: '<VAULT_TBILLS_ADDRESS>',      // ⚠️ UPDATE after deployment

  // Real Estate Set
  RWA_REALESTATE: '<RWA_REALESTATE_ADDRESS>',  // ⚠️ UPDATE after deployment
  STRWA_REALESTATE: '<STRWA_REALESTATE_ADDRESS>', // ⚠️ UPDATE after deployment
  VAULT_REALESTATE: '<VAULT_REALESTATE_ADDRESS>', // ⚠️ UPDATE after deployment
};

// Asset type enum
export enum AssetType {
  INVOICES = 'INVOICES',
  TBILLS = 'TBILLS',
  REALESTATE = 'REALESTATE',
}

// Asset configuration
export interface AssetConfig {
  rwa: string;
  stRwa: string;
  vault: string;
  displayName: string;
  shortName: string;
  emoji: string;
  description: string;
  expectedYield: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  color: string;
}

export const ASSET_CONTRACTS: Record<AssetType, AssetConfig> = {
  [AssetType.INVOICES]: {
    rwa: CONTRACT_ADDRESSES.RWA_INVOICES,
    stRwa: CONTRACT_ADDRESSES.STRWA_INVOICES,
    vault: CONTRACT_ADDRESSES.VAULT_INVOICES,
    displayName: 'Invoice Financing RWA',
    shortName: 'OrionInvoices',
    emoji: '🏢',
    description: 'Short-term receivables from verified invoices. Quick liquidity, lower risk.',
    expectedYield: '8-12% APY',
    riskLevel: 'Low',
    color: '#3b82f6', // blue
  },
  [AssetType.TBILLS]: {
    rwa: CONTRACT_ADDRESSES.RWA_TBILLS,
    stRwa: CONTRACT_ADDRESSES.STRWA_TBILLS,
    vault: CONTRACT_ADDRESSES.VAULT_TBILLS,
    displayName: 'US Treasury Bills RWA',
    shortName: 'OrionTBills',
    emoji: '📜',
    description: 'US government-backed treasury bills. Safest option, stable returns.',
    expectedYield: '4-5% APY',
    riskLevel: 'Low',
    color: '#10b981', // green
  },
  [AssetType.REALESTATE]: {
    rwa: CONTRACT_ADDRESSES.RWA_REALESTATE,
    stRwa: CONTRACT_ADDRESSES.STRWA_REALESTATE,
    vault: CONTRACT_ADDRESSES.VAULT_REALESTATE,
    displayName: 'Real Estate Tokens RWA',
    shortName: 'OrionRealEstate',
    emoji: '🏠',
    description: 'Tokenized real estate equity positions. Higher yields, longer lock-up.',
    expectedYield: '6-9% APY',
    riskLevel: 'Medium',
    color: '#f59e0b', // amber
  },
};

// Helper function to get asset config by type
export function getAssetConfig(assetType: AssetType): AssetConfig {
  return ASSET_CONTRACTS[assetType];
}

// Helper to get all asset types
export function getAllAssetTypes(): AssetType[] {
  return Object.values(AssetType);
}
```

---

## 🎯 2. Asset Selection Modal

### NEW FILE: `src/components/dashboard/AssetSelectionModal.tsx`

```typescript
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AssetType, ASSET_CONTRACTS, type AssetConfig } from '@/services/contracts';
import { toast } from 'sonner';

interface AssetSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelectAsset: (assetType: AssetType) => Promise<void>;
  title?: string;
  subtitle?: string;
}

export function AssetSelectionModal({
  open,
  onClose,
  onSelectAsset,
  title = 'Select RWA Asset Type',
  subtitle = 'Choose which type of Real-World Asset you\'d like to mint:',
}: AssetSelectionModalProps) {
  const [selectedAsset, setSelectedAsset] = useState<AssetType | null>(null);
  const [isMinting, setIsMinting] = useState(false);

  const handleMint = async () => {
    if (!selectedAsset) {
      toast.error('Please select an asset type');
      return;
    }

    setIsMinting(true);
    try {
      await onSelectAsset(selectedAsset);
      toast.success(`Successfully minted ${ASSET_CONTRACTS[selectedAsset].displayName}!`);
      onClose();
      setSelectedAsset(null);
    } catch (error: any) {
      console.error('Minting error:', error);
      toast.error(error.message || 'Failed to mint tokens');
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          <p className="text-gray-600 mt-2">{subtitle}</p>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 mt-6">
          {Object.entries(ASSET_CONTRACTS).map(([type, config]) => (
            <AssetCard
              key={type}
              assetType={type as AssetType}
              config={config}
              isSelected={selectedAsset === type}
              onSelect={() => setSelectedAsset(type as AssetType)}
            />
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isMinting}
            className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleMint}
            disabled={!selectedAsset || isMinting}
            className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isMinting ? 'Minting...' : 'Mint 100 Tokens'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AssetCardProps {
  assetType: AssetType;
  config: AssetConfig;
  isSelected: boolean;
  onSelect: () => void;
}

function AssetCard({ assetType, config, isSelected, onSelect }: AssetCardProps) {
  const riskColors = {
    Low: 'text-green-600 bg-green-100',
    Medium: 'text-amber-600 bg-amber-100',
    High: 'text-red-600 bg-red-100',
  };

  return (
    <button
      onClick={onSelect}
      className={`p-6 border-2 rounded-xl text-left transition-all hover:shadow-md ${
        isSelected
          ? 'border-primary bg-primary/5 shadow-lg'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      style={{ borderColor: isSelected ? config.color : undefined }}
    >
      <div className="flex items-start gap-4">
        <div
          className="text-5xl p-3 rounded-lg"
          style={{ backgroundColor: `${config.color}20` }}
        >
          {config.emoji}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-xl" style={{ color: config.color }}>
              {config.displayName}
            </h3>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${
                riskColors[config.riskLevel]
              }`}
            >
              {config.riskLevel} Risk
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-3">{config.description}</p>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Expected Yield:</span>
              <span className="font-semibold text-green-600">
                {config.expectedYield}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Platform Token:</span>
              <span className="font-semibold">{config.shortName}</span>
            </div>
          </div>
        </div>

        {isSelected && (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}
```

---

## 🔒 3. Update StakeSection

### File: `src/components/dashboard/StakeSection.tsx`

**ADD these imports:**
```typescript
import { AssetSelectionModal } from './AssetSelectionModal';
import {
  AssetType,
  ASSET_CONTRACTS,
  getAllAssetTypes,
  getAssetConfig,
} from '@/services/contracts';
import { MockRWAService } from '@/services/contracts/MockRWAService';
import { StRWAService } from '@/services/contracts/StRWAService';
import { VaultService } from '@/services/contracts/VaultService';
```

**REPLACE state management:**
```typescript
// Remove old single vault state
// const [selectedVault, setSelectedVault] = useState("alexVault");

// NEW: Multi-asset state
const [selectedAssetType, setSelectedAssetType] = useState<AssetType>(
  AssetType.INVOICES
);
const [showAssetModal, setShowAssetModal] = useState(false);
const [assetBalances, setAssetBalances] = useState<Record<AssetType, bigint>>({
  [AssetType.INVOICES]: 0n,
  [AssetType.TBILLS]: 0n,
  [AssetType.REALESTATE]: 0n,
});
const [stRwaBalances, setStRwaBalances] = useState<Record<AssetType, bigint>>({
  [AssetType.INVOICES]: 0n,
  [AssetType.TBILLS]: 0n,
  [AssetType.REALESTATE]: 0n,
});
const [claimableYields, setClaimableYields] = useState<Record<AssetType, bigint>>({
  [AssetType.INVOICES]: 0n,
  [AssetType.TBILLS]: 0n,
  [AssetType.REALESTATE]: 0n,
});
```

**UPDATE fetchBalances function:**
```typescript
const fetchBalances = async () => {
  if (!address) return;

  try {
    // Fetch balances for all asset types
    for (const assetType of getAllAssetTypes()) {
      const config = getAssetConfig(assetType);

      // RWA balance
      const rwaService = new MockRWAService(config.rwa);
      const rwaBalance = await rwaService.balance(address);
      setAssetBalances((prev) => ({ ...prev, [assetType]: rwaBalance }));

      // stRWA balance
      const stRwaService = new StRWAService(config.stRwa);
      const stRwaBalance = await stRwaService.balance(address);
      setStRwaBalances((prev) => ({ ...prev, [assetType]: stRwaBalance }));

      // Claimable yield
      const vaultService = new VaultService(config.vault);
      const yield = await vaultService.claimable_yield(address);
      setClaimableYields((prev) => ({ ...prev, [assetType]: yield }));
    }
  } catch (error) {
    console.error('Error fetching balances:', error);
  }
};
```

**UPDATE handleGetMockRWA:**
```typescript
const handleGetMockRWA = async () => {
  if (!address) {
    toast.error('Please connect your wallet first');
    return;
  }

  // Open asset selection modal
  setShowAssetModal(true);
};

const handleSelectAssetForMinting = async (assetType: AssetType) => {
  if (!address) return;

  const config = getAssetConfig(assetType);
  const rwaService = new MockRWAService(config.rwa);

  try {
    await rwaService.mint_rwa_tokens(address, 100n * 10n ** 18n);
    await fetchBalances();
  } catch (error: any) {
    throw new Error(error.message || 'Failed to mint tokens');
  }
};
```

**UPDATE handleStake:**
```typescript
const handleStake = async () => {
  if (!address || !stakeAmount) return;

  try {
    setIsStaking(true);

    const config = getAssetConfig(selectedAssetType);
    const amount = BigInt(parseFloat(stakeAmount) * 1e18);

    // Step 1: Approve
    const rwaService = new MockRWAService(config.rwa);
    await rwaService.approve(
      address,
      config.vault,
      amount,
      999999999 // expiration
    );

    // Step 2: Stake
    const vaultService = new VaultService(config.vault);
    await vaultService.stake(address, amount);

    toast.success(
      `Successfully staked ${stakeAmount} ${config.displayName}!`
    );

    setStakeAmount('');
    await fetchBalances();
  } catch (error: any) {
    toast.error(error.message || 'Staking failed');
  } finally {
    setIsStaking(false);
  }
};
```

**UPDATE UI to show asset selector:**
```typescript
return (
  <div className="w-full flex-1 px-6 pb-4 overflow-y-auto">
    {/* Asset Selection Modal */}
    <AssetSelectionModal
      open={showAssetModal}
      onClose={() => setShowAssetModal(false)}
      onSelectAsset={handleSelectAssetForMinting}
    />

    {/* Asset Type Tabs */}
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Asset Type:</h3>
      <div className="flex gap-2">
        {getAllAssetTypes().map((assetType) => {
          const config = getAssetConfig(assetType);
          return (
            <button
              key={assetType}
              onClick={() => setSelectedAssetType(assetType)}
              className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                selectedAssetType === assetType
                  ? 'border-primary bg-primary/10 font-semibold'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              style={{
                borderColor: selectedAssetType === assetType ? config.color : undefined,
              }}
            >
              <div className="text-2xl mb-1">{config.emoji}</div>
              <div className="text-xs">{config.shortName}</div>
            </button>
          );
        })}
      </div>
    </div>

    {/* Display balances for selected asset */}
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="text-sm text-gray-600">RWA Balance</div>
        <div className="text-2xl font-bold">
          {(Number(assetBalances[selectedAssetType]) / 1e18).toFixed(2)}
        </div>
      </div>
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="text-sm text-gray-600">Staked Balance</div>
        <div className="text-2xl font-bold">
          {(Number(stRwaBalances[selectedAssetType]) / 1e18).toFixed(2)}
        </div>
      </div>
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="text-sm text-gray-600">Claimable Yield</div>
        <div className="text-2xl font-bold text-green-600">
          ${(Number(claimableYields[selectedAssetType]) / 1e7).toFixed(2)}
        </div>
      </div>
    </div>

    {/* Rest of stake UI... */}
  </div>
);
```

---

## 💳 4. Update BorrowSection

### File: `src/components/dashboard/BorrowSection.tsx`

**ADD imports:**
```typescript
import {
  AssetType,
  ASSET_CONTRACTS,
  getAllAssetTypes,
  getAssetConfig,
} from '@/services/contracts';
```

**UPDATE collateral state:**
```typescript
// Remove old collateralAssets array
// Replace with actual asset types

const [collateralPercentages, setCollateralPercentages] = useState<
  Record<AssetType, number>
>({
  [AssetType.INVOICES]: 0,
  [AssetType.TBILLS]: 0,
  [AssetType.REALESTATE]: 0,
});

const [collateralBalances, setCollateralBalances] = useState<
  Record<AssetType, bigint>
>({
  [AssetType.INVOICES]: 0n,
  [AssetType.TBILLS]: 0n,
  [AssetType.REALESTATE]: 0n,
});
```

**UPDATE fetchBalances:**
```typescript
const fetchBalances = async () => {
  if (!address) return;

  // Fetch stRWA balances for all asset types
  for (const assetType of getAllAssetTypes()) {
    const config = getAssetConfig(assetType);
    const stRwaService = new StRWAService(config.stRwa);
    const balance = await stRwaService.balance(address);
    setCollateralBalances((prev) => ({ ...prev, [assetType]: balance }));
  }
};
```

**UPDATE handleBorrow to support multi-collateral:**
```typescript
const handleBorrow = async () => {
  if (!address || !borrowAmount) return;

  try {
    setIsBorrowing(true);

    // Calculate collaterals
    const collaterals: Array<{ token_address: string; amount: bigint }> = [];

    for (const assetType of getAllAssetTypes()) {
      const percentage = collateralPercentages[assetType];
      if (percentage > 0) {
        const config = getAssetConfig(assetType);
        const balance = collateralBalances[assetType];
        const amount = (balance * BigInt(percentage)) / 100n;

        if (amount > 0n) {
          collaterals.push({
            token_address: config.stRwa,
            amount,
          });

          // Approve this collateral
          const stRwaService = new StRWAService(config.stRwa);
          await stRwaService.approve(
            address,
            CONTRACT_ADDRESSES.LENDING_POOL,
            amount,
            999999999
          );
        }
      }
    }

    if (collaterals.length === 0) {
      toast.error('No collateral selected');
      return;
    }

    // Originate loan with multi-collateral
    const loanAmount = BigInt(parseFloat(borrowAmount) * 1e7); // USDC has 7 decimals

    await lendingPoolService.originate_loan(
      address,
      collaterals,
      loanAmount,
      12 // 12 months
    );

    toast.success('Loan originated successfully!');
    setBorrowAmount('');
    setCollateralPercentages({
      [AssetType.INVOICES]: 0,
      [AssetType.TBILLS]: 0,
      [AssetType.REALESTATE]: 0,
    });

    await fetchBalances();
  } catch (error: any) {
    toast.error(error.message || 'Borrowing failed');
  } finally {
    setIsBorrowing(false);
  }
};
```

**UPDATE UI for collateral selection:**
```typescript
{/* Collateral Selection */}
<div className="space-y-3">
  {getAllAssetTypes().map((assetType) => {
    const config = getAssetConfig(assetType);
    const balance = collateralBalances[assetType];
    const percentage = collateralPercentages[assetType];
    const tokenAmount = (Number(balance) / 1e18) * (percentage / 100);

    return (
      <div
        key={assetType}
        className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{config.emoji}</span>
            <div>
              <div className="font-semibold">{config.shortName}</div>
              <div className="text-xs text-gray-500">
                Balance: {(Number(balance) / 1e18).toFixed(2)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold">{percentage}%</div>
            <div className="text-xs text-gray-500">
              {tokenAmount.toFixed(2)} tokens
            </div>
          </div>
        </div>

        {/* Percentage Buttons */}
        <div className="flex gap-2">
          {[0, 25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              onClick={() => handlePercentageChange(assetType, pct)}
              className={`flex-1 py-2 rounded text-sm font-semibold transition-all ${
                percentage === pct
                  ? 'bg-primary text-white'
                  : 'bg-white border border-gray-300 hover:border-primary'
              }`}
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>
    );
  })}
</div>

{/* Total Percentage Indicator */}
<div className="mt-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
  <div className="flex items-center justify-between">
    <span className="font-semibold">Total Collateral:</span>
    <span
      className={`text-xl font-bold ${
        totalPercentage === 100
          ? 'text-green-600'
          : totalPercentage > 100
          ? 'text-red-600'
          : 'text-gray-600'
      }`}
    >
      {totalPercentage}%
    </span>
  </div>
  {totalPercentage !== 100 && (
    <div className="text-sm text-gray-600 mt-1">
      {totalPercentage > 100
        ? 'Total exceeds 100% - please adjust'
        : 'Must equal 100% to borrow'}
    </div>
  )}
</div>
```

---

## 👤 5. Update ProfileSection

### File: `src/components/dashboard/ProfileSection.tsx`

**ADD new state for multi-asset tracking:**
```typescript
const [assetBreakdown, setAssetBreakdown] = useState<
  Record<
    AssetType,
    {
      rwaBalance: bigint;
      stRwaBalance: bigint;
      stakedValue: number;
      yield: bigint;
    }
  >
>({
  [AssetType.INVOICES]: {
    rwaBalance: 0n,
    stRwaBalance: 0n,
    stakedValue: 0,
    yield: 0n,
  },
  [AssetType.TBILLS]: {
    rwaBalance: 0n,
    stRwaBalance: 0n,
    stakedValue: 0,
    yield: 0n,
  },
  [AssetType.REALESTATE]: {
    rwaBalance: 0n,
    stRwaBalance: 0n,
    stakedValue: 0,
    yield: 0n,
  },
});
```

**UPDATE fetchData:**
```typescript
const fetchData = async () => {
  if (!address) return;

  // Fetch for each asset type
  for (const assetType of getAllAssetTypes()) {
    const config = getAssetConfig(assetType);

    const rwaService = new MockRWAService(config.rwa);
    const stRwaService = new StRWAService(config.stRwa);
    const vaultService = new VaultService(config.vault);

    const rwaBalance = await rwaService.balance(address);
    const stRwaBalance = await stRwaService.balance(address);
    const yield = await vaultService.claimable_yield(address);

    // Get price from oracle (simplified - use default for now)
    const stakedValue = (Number(stRwaBalance) / 1e18) * 1.05; // $1.05 per token

    setAssetBreakdown((prev) => ({
      ...prev,
      [assetType]: {
        rwaBalance,
        stRwaBalance,
        stakedValue,
        yield,
      },
    }));
  }

  // Fetch loan data
  const loan = await lendingPoolService.get_loan(address);
  setLoanData(loan);
};
```

**ADD asset breakdown display:**
```typescript
{/* Staked Assets Breakdown */}
<div className="bg-white p-6 rounded-lg shadow-sm border-2 border-gray-200">
  <h3 className="text-lg font-bold mb-4">Staked Assets by Type</h3>

  <div className="space-y-4">
    {getAllAssetTypes().map((assetType) => {
      const config = getAssetConfig(assetType);
      const data = assetBreakdown[assetType];
      const stRwaAmount = Number(data.stRwaBalance) / 1e18;

      if (stRwaAmount === 0) return null;

      return (
        <div
          key={assetType}
          className="p-4 bg-gray-50 rounded-lg border-2"
          style={{ borderColor: config.color }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{config.emoji}</span>
              <div>
                <div className="font-bold">{config.displayName}</div>
                <div className="text-sm text-gray-600">
                  {config.expectedYield}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{stRwaAmount.toFixed(2)}</div>
              <div className="text-sm text-gray-600">
                ${data.stakedValue.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex justify-between text-sm mt-3 pt-3 border-t border-gray-300">
            <span className="text-gray-600">Claimable Yield:</span>
            <span className="font-semibold text-green-600">
              ${(Number(data.yield) / 1e7).toFixed(2)}
            </span>
          </div>
        </div>
      );
    })}
  </div>
</div>
```

---

## 🛠️ 6. Update Service Layer

### File: `src/services/contracts/LendingPoolService.ts`

**UPDATE originate_loan method:**
```typescript
async originate_loan(
  borrower: string,
  collaterals: Array<{ token_address: string; amount: bigint }>,
  loan_amount: bigint,
  duration_months: number
) {
  // Convert collaterals to ScVal
  const collateralsScVal = nativeToScVal(
    collaterals.map((c) => ({
      token_address: this.createAddress(c.token_address),
      amount: c.amount,
    })),
    {
      type: {
        vec: [
          {
            struct: [
              { name: 'token_address', type: 'address' },
              { name: 'amount', type: 'i128' },
            ],
          },
        ],
      },
    }
  );

  const args = [
    this.createAddress(borrower),
    collateralsScVal,
    nativeToScVal(loan_amount, { type: 'i128' }),
    nativeToScVal(duration_months, { type: 'u32' }),
  ];

  return this.invokeContract('originate_loan', args);
}
```

---

## 📋 Testing Checklist

After making all changes, test:

### 1. Asset Selection
- [ ] "Get RWA Tokens" opens modal
- [ ] Can select different asset types
- [ ] Minting works for each type
- [ ] Balances update correctly

### 2. Multi-Asset Staking
- [ ] Can switch between asset types
- [ ] Each asset shows correct balance
- [ ] Staking works per asset type
- [ ] stRWA tokens minted correctly

### 3. Multi-Collateral Borrowing
- [ ] Percentage sliders work
- [ ] Total percentage validation works
- [ ] Can mix different collateral types
- [ ] Health factor calculation correct
- [ ] Loan origination succeeds

### 4. Profile Breakdown
- [ ] Shows assets by type
- [ ] Displays correct balances
- [ ] Yield shown per asset
- [ ] Total calculations accurate

---

## 🚀 Deployment Steps

```bash
# 1. Update contract addresses in index.ts after backend deployment

# 2. Install dependencies (if new packages needed)
npm install

# 3. Test locally
npm run dev

# 4. Build for production
npm run build

# 5. Deploy
npm run deploy
```

---

## ⚠️ Important Notes

### Decimal Handling
Always remember:
- RWA/stRWA: 18 decimals (`* 10n ** 18n`)
- USDC: 7 decimals (`* 10n ** 7n`)
- Display: Divide by decimals for UI

### Contract Calls
Multi-collateral requires proper ScVal formatting:
```typescript
const collateralsScVal = nativeToScVal(collaterals, {
  type: {
    vec: [
      {
        struct: [
          { name: 'token_address', type: 'address' },
          { name: 'amount', type: 'i128' },
        ],
      },
    ],
  },
});
```

### Error Handling
Always wrap contract calls in try-catch:
```typescript
try {
  await contractCall();
  toast.success('Success!');
} catch (error: any) {
  toast.error(error.message || 'Operation failed');
}
```

---

**Status:** Ready for implementation
**Estimated Time:** 2-3 days (after backend deployment)
**Dependencies:** Backend contracts must be deployed first

