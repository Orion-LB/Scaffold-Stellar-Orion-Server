import { ContractService, TransactionResult, StellarWalletProvider, ContractClientOptions } from './ContractService';

/**
 * USDC Mock Token Service
 * Decimals: 7
 * Standard ERC-20 token operations
 */
export class USDCService extends ContractService {
  constructor(options: ContractClientOptions) {
    super(options);
  }

  // Read Operations
  async balance(accountAddress: string): Promise<bigint> {
    const result = await this.queryContract('balance', { account: accountAddress });
    return BigInt(result || '0');
  }

  async allowance(owner: string, spender: string): Promise<bigint> {
    const result = await this.queryContract('allowance', { owner, spender });
    return BigInt(result || '0');
  }

  // Write Operations
  async transfer(
    from: string,
    to: string,
    amount: bigint,
    wallet?: StellarWalletProvider
  ): Promise<TransactionResult> {
    return await this.invokeContract('transfer', { from, to, amount: amount.toString() }, wallet);
  }

  async approve(
    owner: string,
    spender: string,
    amount: bigint,
    wallet?: StellarWalletProvider
  ): Promise<TransactionResult> {
    return await this.invokeContract('approve', { owner, spender, amount: amount.toString() }, wallet);
  }

  async transferFrom(
    spender: string,
    from: string,
    to: string,
    amount: bigint,
    wallet?: StellarWalletProvider
  ): Promise<TransactionResult> {
    return await this.invokeContract('transfer_from', { spender, from, to, amount: amount.toString() }, wallet);
  }

  // Admin function (for testing)
  async mint(
    admin: string,
    to: string,
    amount: bigint,
    wallet?: StellarWalletProvider
  ): Promise<TransactionResult> {
    return await this.invokeContract('mint', { admin, to, amount: amount.toString() }, wallet);
  }

  // Helper: Convert USDC amount to contract units (7 decimals)
  toContractUnits(usdcAmount: number): bigint {
    return BigInt(Math.floor(usdcAmount * 10_000_000));
  }

  // Helper: Convert contract units to USDC
  fromContractUnits(contractUnits: bigint): number {
    return Number(contractUnits) / 10_000_000;
  }
}
