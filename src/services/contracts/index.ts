// Contract Services
export { ContractService } from './ContractService';
export { VaultService } from './VaultService';
export { LendingPoolService } from './LendingPoolService';
export { MockRWAService } from './MockRWAService';
export { OracleService } from './OracleService';

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
export const CONTRACT_ADDRESSES = {
  // These will be replaced with actual deployed contract addresses
  MOCK_RWA_A: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  STAKED_RWA_A: 'CBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
  RWA_VAULT_A: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
  LENDING_POOL: 'CDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
  MOCK_ORACLE: 'CEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE',
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