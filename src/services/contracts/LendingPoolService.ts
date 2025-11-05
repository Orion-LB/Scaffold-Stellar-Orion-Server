import { ContractService, TransactionResult, StellarWalletProvider, ContractClientOptions } from './ContractService';

export interface LoanInfo {
  id: string;
  asset: string;
  borrowed: bigint;
  collateral: bigint;
  interestOwed: bigint;
  healthFactor: number;
  autoRepayEnabled: boolean;
  loanDate: Date;
}

export class LendingPoolService extends ContractService {
  constructor(options: ContractClientOptions) {
    super(options);
  }
  
  // Queries
  async getUserCollateral(userAddress: string): Promise<bigint> {
    const result = await this.queryContract('get_user_collateral', { user: userAddress });
    return BigInt(result || '0');
  }
  
  async getUserBorrowBalance(userAddress: string, asset: string): Promise<bigint> {
    const result = await this.queryContract('get_user_borrow_balance', { user: userAddress, asset });
    return BigInt(result || '0');
  }
  
  async getUserInterestOwed(userAddress: string, asset: string): Promise<bigint> {
    const result = await this.queryContract('get_user_interest_owed', { user: userAddress, asset });
    return BigInt(result || '0');
  }
  
  async getHealthFactor(userAddress: string): Promise<number> {
    const result = await this.queryContract('get_health_factor', { user: userAddress });
    return parseFloat(result || '0');
  }
  
  async getInterestRate(asset: string): Promise<number> {
    const result = await this.queryContract('get_interest_rate', { asset });
    return parseFloat(result || '0');
  }
  
  async getAvailableLiquidity(asset: string): Promise<bigint> {
    const result = await this.queryContract('get_available_liquidity', { asset });
    return BigInt(result || '0');
  }
  
  async getUserLoans(userAddress: string): Promise<LoanInfo[]> {
    const result = await this.queryContract('get_user_loans', { user: userAddress });
    return result || [];
  }
  
  async getMaxBorrowAmount(userAddress: string, asset: string): Promise<bigint> {
    const result = await this.queryContract('get_max_borrow_amount', { user: userAddress, asset });
    return BigInt(result || '0');
  }
  
  // Transactions
  async supplyCollateral(userAddress: string, amount: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('supply_collateral', { user: userAddress, amount: amount.toString() }, wallet);
  }
  
  async withdrawCollateral(userAddress: string, amount: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('withdraw_collateral', { user: userAddress, amount: amount.toString() }, wallet);
  }
  
  async borrow(userAddress: string, asset: string, amount: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('borrow', { user: userAddress, asset, amount: amount.toString() }, wallet);
  }
  
  async repay(userAddress: string, asset: string, amount: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('repay', { user: userAddress, asset, amount: amount.toString() }, wallet);
  }
  
  // Auto-repay management
  async enableAutoRepay(userAddress: string, loanId: string, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('enable_auto_repay', { user: userAddress, loan_id: loanId }, wallet);
  }
  
  async disableAutoRepay(userAddress: string, loanId: string, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('disable_auto_repay', { user: userAddress, loan_id: loanId }, wallet);
  }
  
  // Public keeper functions (for demonstration/manual trigger)
  async triggerAutoRepay(userAddress: string, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('trigger_auto_repay', { user: userAddress }, wallet);
  }
  
  async triggerLiquidation(userAddress: string, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('trigger_liquidation', { user: userAddress }, wallet);
  }
  
  protected getMockQueryResult(method: string, params: Record<string, any>): any {
    switch (method) {
      case 'get_user_collateral':
        return BigInt('850500000000000000000'); // 850.5 tokens
      case 'get_user_borrow_balance':
        const { asset } = params;
        return asset === 'USDC' ? BigInt('10000000000') : BigInt('5000000000'); // Different decimals for different assets
      case 'get_user_interest_owed':
        const { asset: borrowAsset } = params;
        return borrowAsset === 'USDC' ? BigInt('125500000') : BigInt('45250000'); // Interest owed
      case 'get_health_factor':
        return 2.45;
      case 'get_interest_rate':
        const { asset: rateAsset } = params;
        return rateAsset === 'USDC' ? 0.052 : 0.048; // 5.2% or 4.8%
      case 'get_available_liquidity':
        const { asset: liquidityAsset } = params;
        return liquidityAsset === 'USDC' ? BigInt('50000000000') : BigInt('100000000000'); // Available liquidity
      case 'get_user_loans':
        return [
          {
            id: 'loan1',
            asset: 'USDC',
            borrowed: BigInt('10000000000'),
            collateral: BigInt('450250000000000000000'),
            interestOwed: BigInt('125500000'),
            healthFactor: 2.45,
            autoRepayEnabled: true,
            loanDate: new Date('2024-01-15')
          },
          {
            id: 'loan2',
            asset: 'XLM',
            borrowed: BigInt('5000000000'),
            collateral: BigInt('200750000000000000000'),
            interestOwed: BigInt('45250000'),
            healthFactor: 1.85,
            autoRepayEnabled: false,
            loanDate: new Date('2024-02-01')
          }
        ];
      case 'get_max_borrow_amount':
        return BigInt('15000000000'); // Max borrowable amount
      default:
        return null;
    }
  }
}