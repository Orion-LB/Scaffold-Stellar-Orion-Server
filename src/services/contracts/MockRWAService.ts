import { ContractService, TransactionResult, StellarWalletProvider, ContractClientOptions } from './ContractService';

/**
 * RWA Token Service
 * Real World Asset Token with Whitelist
 * Decimals: 18
 * Transfers only work between whitelisted addresses
 */
export class MockRWAService extends ContractService {
  constructor(options: ContractClientOptions) {
    super(options);
  }

  // ============ Read Operations ============

  /**
   * Get token balance for an account
   */
  async balance(account: string): Promise<bigint> {
    const result = await this.queryContract('balance', { account });
    return BigInt(result || '0');
  }

  /**
   * Check if address is whitelisted
   */
  async allowed(account: string): Promise<boolean> {
    const result = await this.queryContract('allowed', { account });
    return Boolean(result);
  }

  /**
   * Get allowance
   */
  async allowance(owner: string, spender: string): Promise<bigint> {
    const result = await this.queryContract('allowance', { owner, spender });
    return BigInt(result || '0');
  }

  /**
   * Get total supply
   */
  async total_supply(): Promise<bigint> {
    const result = await this.queryContract('total_supply');
    return BigInt(result || '0');
  }

  // ============ Write Operations ============

  /**
   * Transfer RWA tokens
   * Only works between whitelisted addresses
   */
  async transfer(from: string, to: string, amount: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('transfer', { from, to, amount: amount.toString() }, wallet);
  }

  /**
   * Approve spender to use tokens
   */
  async approve(owner: string, spender: string, amount: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('approve', { owner, spender, amount: amount.toString() }, wallet);
  }

  /**
   * Transfer using allowance
   */
  async transfer_from(spender: string, from: string, to: string, amount: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('transfer_from', { spender, from, to, amount: amount.toString() }, wallet);
  }

  /**
   * Burn RWA tokens
   */
  async burn(from: string, amount: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('burn', { from, amount: amount.toString() }, wallet);
  }

  // ============ Admin/Manager Operations ============

  /**
   * Add address to whitelist (enables transfers)
   * Manager role required
   */
  async allow_user(user: string, operator: string, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('allow_user', { user, operator }, wallet);
  }

  /**
   * Remove address from whitelist
   * Manager role required
   */
  async disallow_user(user: string, operator: string, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('disallow_user', { user, operator }, wallet);
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
}
