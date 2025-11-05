import { ContractService, TransactionResult, StellarWalletProvider, ContractClientOptions } from './ContractService';

export class MockRWAService extends ContractService {
  constructor(options: ContractClientOptions) {
    super(options);
  }
  
  // Queries
  async getUserBalance(userAddress: string): Promise<bigint> {
    const result = await this.queryContract('get_balance', { user: userAddress });
    return BigInt(result || '0');
  }
  
  async isWhitelisted(userAddress: string): Promise<boolean> {
    const result = await this.queryContract('is_whitelisted', { user: userAddress });
    return Boolean(result);
  }
  
  async getTotalSupply(): Promise<bigint> {
    const result = await this.queryContract('get_total_supply');
    return BigInt(result || '0');
  }
  
  async getAllowance(owner: string, spender: string): Promise<bigint> {
    const result = await this.queryContract('get_allowance', { owner, spender });
    return BigInt(result || '0');
  }
  
  // Transactions
  async transfer(to: string, amount: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('transfer', { to, amount: amount.toString() }, wallet);
  }
  
  async approve(spender: string, amount: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('approve', { spender, amount: amount.toString() }, wallet);
  }
  
  // Testing/Demo
  async mintMockRWA(userAddress: string, amount: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('mint_mock_rwa', { user: userAddress, amount: amount.toString() }, wallet);
  }
  
  // Admin
  async addToWhitelist(address: string, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('add_to_whitelist', { user: address }, wallet);
  }
  
  async removeFromWhitelist(address: string, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('remove_from_whitelist', { user: address }, wallet);
  }
  
  protected getMockQueryResult(method: string, params: Record<string, any>): any {
    switch (method) {
      case 'get_balance':
        return BigInt('1250000000000000000000'); // 1,250 tokens with 18 decimals
      case 'is_whitelisted':
        return true; // User is whitelisted
      case 'get_total_supply':
        return BigInt('10000000000000000000000000'); // 10M tokens
      case 'get_allowance':
        return BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935'); // Max uint256 (unlimited)
      default:
        return null;
    }
  }
}