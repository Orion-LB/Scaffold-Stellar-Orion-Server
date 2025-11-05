import { ContractService, TransactionResult, StellarWalletProvider, ContractClientOptions } from './ContractService';

export interface Vault {
  id: string;
  name: string;
  apy: string;
  tvl: string;
  totalStaked: bigint;
  exchangeRate: number;
}

export class VaultService extends ContractService {
  constructor(options: ContractClientOptions) {
    super(options);
  }
  
  // Queries (Read-Only)
  async getAvailableVaults(): Promise<Vault[]> {
    const result = await this.queryContract('getAvailableVaults');
    return result;
  }
  
  async getUserStakedBalance(userAddress: string): Promise<bigint> {
    const result = await this.queryContract('get_user_staked_balance', { user: userAddress });
    return BigInt(result || '0');
  }
  
  async getClaimableYield(userAddress: string): Promise<bigint> {
    const result = await this.queryContract('get_claimable_yield', { user: userAddress });
    return BigInt(result || '0');
  }
  
  async getExchangeRate(): Promise<number> {
    const result = await this.queryContract('get_exchange_rate');
    return parseFloat(result || '0');
  }
  
  async getTotalStaked(): Promise<bigint> {
    const result = await this.queryContract('get_total_staked');
    return BigInt(result || '0');
  }
  
  // Transactions (Write)
  async stake(userAddress: string, amount: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('stake', { user: userAddress, amount: amount.toString() }, wallet);
  }
  
  async unstake(userAddress: string, amount: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('unstake', { user: userAddress, amount: amount.toString() }, wallet);
  }
  
  async claimYield(userAddress: string, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('claim_yield', { user: userAddress }, wallet);
  }
  
  // Admin (for demo/testing)
  async fundYield(amount: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('fund_yield', { amount: amount.toString() }, wallet);
  }
  
  protected getMockQueryResult(method: string, params: Record<string, any>): any {
    switch (method) {
      case 'get_available_vaults':
        return [
          { id: 'alexVault', name: 'AlexRWA Vault', apy: '8.5%', tvl: '$2.4M', totalStaked: BigInt('2400000000000000000000000'), exchangeRate: 0.95 },
          { id: 'ethVault', name: 'EthRWA Vault', apy: '7.2%', tvl: '$1.8M', totalStaked: BigInt('1800000000000000000000000'), exchangeRate: 0.92 },
          { id: 'btcVault', name: 'BtcRWA Vault', apy: '6.8%', tvl: '$3.1M', totalStaked: BigInt('3100000000000000000000000'), exchangeRate: 0.88 }
        ];
      case 'get_user_staked_balance':
        return BigInt('850500000000000000000'); // 850.5 tokens with 18 decimals
      case 'get_claimable_yield':
        return BigInt('425500000000000000000'); // 425.5 tokens with 18 decimals
      case 'get_exchange_rate':
        return 0.95;
      case 'get_total_staked':
        return BigInt('7300000000000000000000000'); // 7.3M tokens
      default:
        return null;
    }
  }
}