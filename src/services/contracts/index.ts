// Contract Services
export { ContractService } from './ContractService';
export { VaultService } from './VaultService';
export { LendingPoolService } from './LendingPoolService';
export { MockRWAService } from './MockRWAService';
export { OracleService } from './OracleService';
export { USDCService } from './USDCService';
export { StakedRWAService } from './StakedRWAService';

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