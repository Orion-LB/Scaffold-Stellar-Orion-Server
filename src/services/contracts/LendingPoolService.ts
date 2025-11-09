import { ContractService, TransactionResult, StellarWalletProvider, ContractClientOptions } from './ContractService';

export interface LoanInfo {
  borrower: string;
  collateral_amount: bigint;
  principal: bigint;
  outstanding_debt: bigint;
  interest_rate: bigint;
  start_time: bigint;
  end_time: bigint;
  last_interest_update: bigint;
  warnings_issued: number;
  last_warning_time: bigint;
  penalties: bigint;
  yield_share_percent: bigint;
}

export interface LPDeposit {
  depositor: string;
  total_deposited: bigint;
  locked_amount: bigint;
  available_amount: bigint;
  total_interest_earned: bigint;
}

export interface TokenRiskProfile {
  rwa_token_address: string;
  token_yield_apr: bigint;
  token_expiry: bigint;
  last_updated: bigint;
}

/**
 * Lending Pool Service
 * Handles collateralized lending, LP deposits, and loan management
 */
export class LendingPoolService extends ContractService {
  constructor(options: ContractClientOptions) {
    super(options);
  }

  // ============ LP Functions ============

  /**
   * Deposit USDC to earn interest as LP
   * Prerequisites: Must approve lending pool to spend USDC first
   */
  async lp_deposit(depositor: string, amount: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('lp_deposit', { depositor, amount: amount.toString() }, wallet);
  }

  /**
   * Withdraw USDC (available amount only)
   * Cannot withdraw locked liquidity
   */
  async lp_withdraw(depositor: string, amount: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('lp_withdraw', { depositor, amount: amount.toString() }, wallet);
  }

  /**
   * Get LP deposit information
   */
  async get_lp_deposit(depositor: string): Promise<LPDeposit | null> {
    try {
      const result = await this.queryContract('get_lp_deposit', { depositor });
      return result;
    } catch (error) {
      return null;
    }
  }

  // ============ Loan Functions ============

  /**
   * Originate new collateralized loan
   * Parameters:
   * - collateral_amount: stRWA amount (18 decimals)
   * - loan_amount: USDC amount (7 decimals)
   * - duration_months: 3-24 months
   *
   * Prerequisites:
   * - User must approve lending pool to spend stRWA
   * - Collateral ratio ≥ 140%
   * - No existing active loan
   * - Oracle price < 24 hours old
   * - Sufficient pool liquidity
   */
  async originate_loan(
    borrower: string,
    collateral_amount: bigint,
    loan_amount: bigint,
    duration_months: number,
    wallet?: StellarWalletProvider
  ): Promise<TransactionResult> {
    return await this.invokeContract('originate_loan', {
      borrower,
      collateral_amount: collateral_amount.toString(),
      loan_amount: loan_amount.toString(),
      duration_months
    }, wallet);
  }

  /**
   * Make loan payment
   * Payment logic:
   * 1. Vault yield auto-pulled first
   * 2. User pays remainder if yield insufficient
   * 3. LP share distributed (10-20%)
   * 4. Principal reduction
   * 5. Auto-close if debt reaches 0
   */
  async repay_loan(borrower: string, amount: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('repay_loan', { borrower, amount: amount.toString() }, wallet);
  }

  /**
   * Close loan before maturity
   * Costs: Outstanding debt + 5% closure fee
   * Vault yield auto-pulled first
   */
  async close_loan_early(borrower: string, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('close_loan_early', { borrower }, wallet);
  }

  /**
   * Get loan details for a borrower
   */
  async get_loan(borrower: string): Promise<LoanInfo | null> {
    try {
      const result = await this.queryContract('get_loan', { borrower });
      return result;
    } catch (error) {
      return null;
    }
  }

  // ============ Risk Management ============

  /**
   * Check loan status and issue warnings if needed
   * Warning triggers:
   * - 2 weeks since last payment/warning
   * - Collateral ratio ≥ 110%
   *
   * Penalties: 2% of outstanding debt per warning
   */
  async check_and_issue_warning(borrower: string, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('check_and_issue_warning', { borrower }, wallet);
  }

  /**
   * Liquidate undercollateralized loan
   * Threshold: debt ≥ collateral_value × 110%
   * Bot only function
   */
  async liquidate_loan(caller: string, borrower: string, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('liquidate_loan', { caller, borrower }, wallet);
  }

  /**
   * Update compound interest on loan
   * Called automatically by other functions
   */
  async update_loan_interest(borrower: string, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('update_loan_interest', { borrower }, wallet);
  }

  // ============ Admin Functions ============

  /**
   * Set authorized liquidation bot
   * Admin only
   */
  async set_liquidation_bot(caller: string, bot_address: string, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('set_liquidation_bot', { caller, bot_address }, wallet);
  }

  /**
   * Set risk parameters for RWA token
   * Admin only
   *
   * Risk Impact:
   * - token_yield_apr < 500 (5%): High risk → Loan APR: 14%, LP share: 20%
   * - token_yield_apr ≥ 500 (5%): Low risk → Loan APR: 7%, LP share: 10%
   */
  async update_token_risk_profile(
    caller: string,
    rwa_token_address: string,
    token_yield_apr: bigint,
    token_expiry: bigint,
    wallet?: StellarWalletProvider
  ): Promise<TransactionResult> {
    return await this.invokeContract('update_token_risk_profile', {
      caller,
      rwa_token_address,
      token_yield_apr: token_yield_apr.toString(),
      token_expiry: token_expiry.toString()
    }, wallet);
  }

  // ============ View Functions ============

  /**
   * Get total USDC in pool
   */
  async get_total_liquidity(): Promise<bigint> {
    const result = await this.queryContract('get_total_liquidity');
    return BigInt(result || '0');
  }

  /**
   * Get available USDC for new loans
   * Formula: total_liquidity - total_locked_liquidity
   */
  async get_available_liquidity(): Promise<bigint> {
    const result = await this.queryContract('get_available_liquidity');
    return BigInt(result || '0');
  }

  /**
   * Get risk profile for RWA token
   */
  async get_token_risk_profile(rwa_token: string): Promise<TokenRiskProfile | null> {
    try {
      const result = await this.queryContract('get_token_risk_profile', { rwa_token });
      return result;
    } catch (error) {
      return null;
    }
  }

  // ============ Helper Methods ============

  /**
   * Calculate health factor
   * Formula: collateral_value / total_debt
   */
  calculateHealthFactor(collateralAmount: bigint, strwaPrice: bigint, debt: bigint, penalties: bigint): number {
    if (debt === 0n && penalties === 0n) return Infinity;

    const collateralValue = (collateralAmount * strwaPrice) / BigInt(1e18);
    const totalDebt = debt + penalties;

    if (totalDebt === 0n) return Infinity;

    return Number((collateralValue * 100n) / totalDebt) / 100;
  }

  /**
   * Calculate max borrow amount at 140% LTV
   */
  calculateMaxBorrow(collateralAmount: bigint, strwaPrice: bigint): bigint {
    const collateralValue = (collateralAmount * strwaPrice) / BigInt(1e18);
    return (collateralValue * 100n) / 140n;
  }

  /**
   * Check if loan is liquidatable (health ≤ 1.1)
   */
  isLiquidatable(healthFactor: number): boolean {
    return healthFactor <= 1.1;
  }

  /**
   * Check if loan needs warning (health < 1.5)
   */
  needsWarning(healthFactor: number): boolean {
    return healthFactor < 1.5;
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

  /**
   * Convert stRWA amount to contract units (18 decimals)
   */
  strwaToContractUnits(strwaAmount: number): bigint {
    return BigInt(Math.floor(strwaAmount * 1e18));
  }

  /**
   * Convert stRWA contract units to amount
   */
  strwaFromContractUnits(contractUnits: bigint): number {
    return Number(contractUnits) / 1e18;
  }

  /**
   * Convert basis points to percentage
   */
  basisPointsToPercent(bp: bigint): number {
    return Number(bp) / 100;
  }

  /**
   * Convert percentage to basis points
   */
  percentToBasisPoints(percent: number): bigint {
    return BigInt(Math.floor(percent * 100));
  }
}
