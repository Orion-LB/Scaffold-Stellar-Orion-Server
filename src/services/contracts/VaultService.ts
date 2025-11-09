import { ContractService, TransactionResult, StellarWalletProvider, ContractClientOptions } from './ContractService';

export interface Vault {
  id: string;
  name: string;
  apy: string;
  tvl: string;
  totalStaked: bigint;
  exchangeRate: number;
}

/**
 * RWA Vault Service
 * Contract for staking RWA tokens to receive stRWA tokens
 * Handles yield distribution and borrower management
 */
export class VaultService extends ContractService {
  constructor(options: ContractClientOptions) {
    super(options);
  }

  // ============ Read Operations ============

  /**
   * Get claimable yield for a user in USDC (7 decimals)
   * Formula: (total_yield_pool × user_strwa_balance) / total_strwa_supply
   */
  async claimable_yield(userAddress: string): Promise<bigint> {
    const result = await this.queryContract('claimable_yield', { user: userAddress });
    return BigInt(result || '0');
  }

  // ============ Write Operations ============

  /**
   * Stake RWA tokens to receive stRWA (1:1 ratio)
   * Prerequisites:
   * - User must approve vault to spend RWA tokens first
   * - User must be whitelisted for RWA transfers
   */
  async stake(userAddress: string, amount: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('stake', { user: userAddress, amount: amount.toString() }, wallet);
  }

  /**
   * Unstake stRWA tokens to receive RWA (1:1 ratio)
   * Restrictions:
   * - Borrowers: Cannot unstake during first 20% of loan period
   * - Borrowers with outstanding loans: 5% foreclosure fee applied
   */
  async unstake(userAddress: string, amount: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('unstake', { user: userAddress, amount: amount.toString() }, wallet);
  }

  /**
   * Claim accumulated yield in USDC
   * Returns the amount claimed
   */
  async claim_yield(userAddress: string, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('claim_yield', { user: userAddress }, wallet);
  }

  // ============ Admin Operations ============

  /**
   * Admin deposits USDC to yield pool
   * Prerequisites: Admin must approve vault to spend USDC first
   */
  async admin_fund_yield(amount: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('admin_fund_yield', { amount: amount.toString() }, wallet);
  }

  /**
   * Set USDC token address (one-time only)
   * Only callable once by admin
   */
  async set_usdc_address(usdcAddress: string, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('set_usdc_address', { usdc: usdcAddress }, wallet);
  }

  /**
   * Set lending pool address (one-time only)
   * Only callable once by admin
   */
  async set_lending_pool(lendingPoolAddress: string, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('set_lending_pool', { lending_pool: lendingPoolAddress }, wallet);
  }

  // ============ Helper Methods ============

  /**
   * Convert RWA amount to contract units (18 decimals)
   */
  toContractUnits(rwaAmount: number): bigint {
    return BigInt(Math.floor(rwaAmount * 1e18));
  }

  /**
   * Convert contract units to RWA amount
   */
  fromContractUnits(contractUnits: bigint): number {
    return Number(contractUnits) / 1e18;
  }

  /**
   * Convert USDC amount to contract units (7 decimals)
   */
  usdcToContractUnits(usdcAmount: number): bigint {
    return BigInt(Math.floor(usdcAmount * 10_000_000));
  }

  /**
   * Convert USDC contract units to amount
   */
  usdcFromContractUnits(contractUnits: bigint): number {
    return Number(contractUnits) / 10_000_000;
  }
}
