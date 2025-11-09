// Contract Services
export { ContractService } from './ContractService';
export { VaultService } from './VaultService';
export { LendingPoolService } from './LendingPoolService';
export { MockRWAService } from './MockRWAService';
export { OracleService } from './OracleService';
export { USDCService } from './USDCService';
export { StakedRWAService } from './StakedRWAService';

// Alias for multi-asset compatibility
export { StakedRWAService as StRWAService } from './StakedRWAService';

// Types
export type {
  TransactionResult,
  StellarWalletProvider,
  SignOptions,
  SignedTransaction,
  ContractClientOptions
} from './ContractService';

export type { Vault } from './VaultService';
export type { LoanInfo } from './LendingPoolService';
export type { PriceData } from './OracleService';

// Contract addresses and configuration
// Loaded from deployed testnet contracts
// See: orion-backened/Scaffold-Stellar-Orion-Server/Integration_requirements.md
export const CONTRACT_ADDRESSES = {
  USDC: 'CAXHQJ6IHN2TPAJ4NEOXJJLRRAO74BEAWA3RXHD6NSOWRBQCTVZA3ZGS',
  MOCK_RWA_A: 'CCHUQ75NY5CFWIXG42RJRZQDMZ2HOAERS4RSX4EL6EEOUE6OMOFLBFVV',
  STAKED_RWA_A: 'CCCTL6UHRPOODYKYOXAW6Y3NKOFPFKB7QIYRRYGEANM2KHYYYAT4PJUS',
  RWA_VAULT_A: 'CB3I43AX6VBYTHLVGXK3TVM5RZXLTSHT5RIHOTK2BHORNQY3RF3QH2TT',
  LENDING_POOL: 'CBJM554JCHWRFG7QFBKMPAPOO4DBJPLKHSH2T7U4FRLCPDS36U44WT5Y',
  MOCK_ORACLE: 'CD5XYT6WXOB567JC3QZGJ7RWHWP4N3C4GJ5LX75WDWUGL7NPXFJJC6AZ',
};

// Network configuration
export const NETWORK_CONFIG = {
  TESTNET: {
    networkPassphrase: 'Test SDF Network ; September 2015',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    horizonUrl: 'https://horizon-testnet.stellar.org',
  },
  MAINNET: {
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    rpcUrl: 'https://soroban-mainnet.stellar.org',
    horizonUrl: 'https://horizon.stellar.org',
  },
  FUTURENET: {
    networkPassphrase: 'Test SDF Future Network ; October 2022',
    rpcUrl: 'https://rpc-futurenet.stellar.org',
    horizonUrl: 'https://horizon-futurenet.stellar.org',
  },
};

// Service factory functions
import { VaultService } from './VaultService';
import { LendingPoolService } from './LendingPoolService';
import { MockRWAService } from './MockRWAService';
import { OracleService } from './OracleService';
import { USDCService } from './USDCService';
import { StakedRWAService } from './StakedRWAService';
import type { StellarWalletProvider } from './ContractService';

export const createVaultService = (wallet?: StellarWalletProvider, network: keyof typeof NETWORK_CONFIG = 'TESTNET') => {
  return new VaultService({
    contractId: CONTRACT_ADDRESSES.RWA_VAULT_A,
    networkPassphrase: NETWORK_CONFIG[network].networkPassphrase,
    rpcUrl: NETWORK_CONFIG[network].rpcUrl,
    wallet,
  });
};

export const createLendingPoolService = (wallet?: StellarWalletProvider, network: keyof typeof NETWORK_CONFIG = 'TESTNET') => {
  return new LendingPoolService({
    contractId: CONTRACT_ADDRESSES.LENDING_POOL,
    networkPassphrase: NETWORK_CONFIG[network].networkPassphrase,
    rpcUrl: NETWORK_CONFIG[network].rpcUrl,
    wallet,
  });
};

export const createMockRWAService = (wallet?: StellarWalletProvider, network: keyof typeof NETWORK_CONFIG = 'TESTNET') => {
  return new MockRWAService({
    contractId: CONTRACT_ADDRESSES.MOCK_RWA_A,
    networkPassphrase: NETWORK_CONFIG[network].networkPassphrase,
    rpcUrl: NETWORK_CONFIG[network].rpcUrl,
    wallet,
  });
};

export const createOracleService = (wallet?: StellarWalletProvider, network: keyof typeof NETWORK_CONFIG = 'TESTNET') => {
  return new OracleService({
    contractId: CONTRACT_ADDRESSES.MOCK_ORACLE,
    networkPassphrase: NETWORK_CONFIG[network].networkPassphrase,
    rpcUrl: NETWORK_CONFIG[network].rpcUrl,
    wallet,
  });
};

export const createUSDCService = (wallet?: StellarWalletProvider, network: keyof typeof NETWORK_CONFIG = 'TESTNET') => {
  return new USDCService({
    contractId: CONTRACT_ADDRESSES.USDC,
    networkPassphrase: NETWORK_CONFIG[network].networkPassphrase,
    rpcUrl: NETWORK_CONFIG[network].rpcUrl,
    wallet,
  });
};

export const createStakedRWAService = (wallet?: StellarWalletProvider, network: keyof typeof NETWORK_CONFIG = 'TESTNET') => {
  return new StakedRWAService({
    contractId: CONTRACT_ADDRESSES.STAKED_RWA_A,
    networkPassphrase: NETWORK_CONFIG[network].networkPassphrase,
    rpcUrl: NETWORK_CONFIG[network].rpcUrl,
    wallet,
  });
};

// ============================================================================
// TEMPORARY MOCK MULTI-ASSET CONFIGURATION
// TODO: Replace with actual multi-asset contracts when backend is deployed
// See: BACKEND_FINAL_REQUIREMENTS.md for full multi-asset architecture
// ============================================================================

/**
 * Asset types supported by the platform
 * TEMPORARY: All types currently map to the same single deployed contracts
 */
export enum AssetType {
  INVOICES = 'invoices',
  TBILLS = 'tbills',
  REALESTATE = 'realestate'
}

/**
 * Multi-asset contract configuration
 * TEMPORARY: All asset types use the same single deployed contract addresses
 * This allows the UI to work with multi-asset structure before backend deployment
 */
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
    mockPrice: 1.05, // Mock oracle price
    baseAPY: 8.5, // Mock APY
  },
  [AssetType.TBILLS]: {
    name: 'T-Bills Vault',
    displayName: 'Treasury Bills',
    shortName: 'T-Bills',
    symbol: 'tRWA',
    emoji: '🏦',
    rwa: CONTRACT_ADDRESSES.MOCK_RWA_A, // TEMP: Same contract
    stRwa: CONTRACT_ADDRESSES.STAKED_RWA_A, // TEMP: Same contract
    vault: CONTRACT_ADDRESSES.RWA_VAULT_A, // TEMP: Same contract
    mockPrice: 1.02,
    baseAPY: 5.2,
  },
  [AssetType.REALESTATE]: {
    name: 'Real Estate',
    displayName: 'Real Estate',
    shortName: 'Real Estate',
    symbol: 'rRWA',
    emoji: '🏢',
    rwa: CONTRACT_ADDRESSES.MOCK_RWA_A, // TEMP: Same contract
    stRwa: CONTRACT_ADDRESSES.STAKED_RWA_A, // TEMP: Same contract
    vault: CONTRACT_ADDRESSES.RWA_VAULT_A, // TEMP: Same contract
    mockPrice: 1.08,
    baseAPY: 12.3,
  },
};

/**
 * Get all supported asset types
 * @returns Array of all AssetType values
 */
export const getAllAssetTypes = (): AssetType[] => {
  return [AssetType.INVOICES, AssetType.TBILLS, AssetType.REALESTATE];
};

/**
 * Get configuration for a specific asset type
 * @param assetType - The asset type to get config for
 * @returns Asset configuration object
 */
export const getAssetConfig = (assetType: AssetType) => {
  return ASSET_CONTRACTS[assetType];
};

/**
 * Get asset type from contract address
 * TEMPORARY: Since all assets use same contracts, returns first match
 * @param contractAddress - The contract address to look up
 * @returns AssetType or undefined
 */
export const getAssetTypeFromAddress = (contractAddress: string): AssetType | undefined => {
  for (const [assetType, config] of Object.entries(ASSET_CONTRACTS)) {
    if (
      config.rwa === contractAddress ||
      config.stRwa === contractAddress ||
      config.vault === contractAddress
    ) {
      return assetType as AssetType;
    }
  }
  return undefined;
};

/**
 * Create service instances from contract addresses
 * These helpers allow ProfileSection to instantiate services with just a contract ID
 */
export const createMockRWAServiceFromAddress = (contractId: string, wallet?: StellarWalletProvider, network: keyof typeof NETWORK_CONFIG = 'TESTNET') => {
  return new MockRWAService({
    contractId,
    networkPassphrase: NETWORK_CONFIG[network].networkPassphrase,
    rpcUrl: NETWORK_CONFIG[network].rpcUrl,
    wallet,
  });
};

export const createStRWAServiceFromAddress = (contractId: string, wallet?: StellarWalletProvider, network: keyof typeof NETWORK_CONFIG = 'TESTNET') => {
  return new StakedRWAService({
    contractId,
    networkPassphrase: NETWORK_CONFIG[network].networkPassphrase,
    rpcUrl: NETWORK_CONFIG[network].rpcUrl,
    wallet,
  });
};

export const createVaultServiceFromAddress = (contractId: string, wallet?: StellarWalletProvider, network: keyof typeof NETWORK_CONFIG = 'TESTNET') => {
  return new VaultService({
    contractId,
    networkPassphrase: NETWORK_CONFIG[network].networkPassphrase,
    rpcUrl: NETWORK_CONFIG[network].rpcUrl,
    wallet,
  });
};