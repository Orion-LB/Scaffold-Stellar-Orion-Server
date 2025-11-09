import { ContractService, TransactionResult, StellarWalletProvider, ContractClientOptions } from './ContractService';

/**
 * stRWA Token Service
 * Decimals: 18
 * Staked RWA token - minted/burned by vault contract
 */
export class StakedRWAService extends ContractService {
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

  async totalSupply(): Promise<bigint> {
    const result = await this.queryContract('total_supply');
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

  // Note: mint and burn are only callable by vault contract
  // These are here for completeness but will fail if called from frontend

  // Helper: Convert stRWA amount to contract units (18 decimals)
  toContractUnits(strwaAmount: number): bigint {
    return BigInt(Math.floor(strwaAmount * 1e18));
  }

  // Helper: Convert contract units to stRWA
  fromContractUnits(contractUnits: bigint): number {
    return Number(contractUnits) / 1e18;
  }
}
