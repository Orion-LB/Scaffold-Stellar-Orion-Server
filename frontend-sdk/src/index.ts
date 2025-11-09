/**
 * Stellar RWA Lending Protocol SDK
 *
 * Easy-to-use TypeScript SDK for interacting with the Stellar RWA Lending smart contracts
 */

import * as StellarSdk from '@stellar/stellar-sdk';

// ============================================================================
// Types
// ============================================================================

export interface NetworkConfig {
  networkPassphrase: string;
  rpcUrl: string;
  horizonUrl: string;
}

export interface ContractAddresses {
  usdc: string;
  rwaToken: string;
  stRwaToken: string;
  vault: string;
  oracle: string;
  lendingPool: string;
}

export interface LoanInfo {
  borrower: string;
  collateralAmount: bigint;
  principal: bigint;
  outstandingDebt: bigint;
  interestRate: number; // Basis points
  startTime: number;
  endTime: number;
  lastInterestUpdate: number;
  warningsIssued: number;
  lastWarningTime: number;
  penalties: bigint;
  yieldSharePercent: number; // Basis points
}

export interface LPDepositInfo {
  depositor: string;
  totalDeposited: bigint;
  lockedAmount: bigint;
  availableAmount: bigint;
  totalInterestEarned: bigint;
}

export interface SignFunction {
  (tx: StellarSdk.Transaction): Promise<StellarSdk.Transaction>;
}

// ============================================================================
// Network Configurations
// ============================================================================

export const NETWORKS: Record<string, NetworkConfig> = {
  testnet: {
    networkPassphrase: 'Test SDF Network ; September 2015',
    rpcUrl: 'https://soroban-testnet.stellar.org:443',
    horizonUrl: 'https://horizon-testnet.stellar.org',
  },
  futurenet: {
    networkPassphrase: 'Test SDF Future Network ; October 2022',
    rpcUrl: 'https://rpc-futurenet.stellar.org:443',
    horizonUrl: 'https://horizon-futurenet.stellar.org',
  },
  mainnet: {
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    rpcUrl: 'https://mainnet.sorobanrpc.com:443',
    horizonUrl: 'https://horizon.stellar.org',
  },
};

// ============================================================================
// SDK Class
// ============================================================================

export class StellarLendingSDK {
  private server: StellarSdk.SorobanRpc.Server;
  private networkConfig: NetworkConfig;
  private contracts: ContractAddresses;

  constructor(network: string, contractAddresses: ContractAddresses) {
    this.networkConfig = NETWORKS[network];
    if (!this.networkConfig) {
      throw new Error(`Unknown network: ${network}`);
    }
    this.server = new StellarSdk.SorobanRpc.Server(this.networkConfig.rpcUrl);
    this.contracts = contractAddresses;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private toScVal(value: any, type?: string): StellarSdk.xdr.ScVal {
    return StellarSdk.nativeToScVal(value, type);
  }

  private async buildTransaction(
    sourceAccount: string,
    contractId: string,
    method: string,
    args: StellarSdk.xdr.ScVal[]
  ): Promise<StellarSdk.Transaction> {
    const account = await this.server.getAccount(sourceAccount);
    const contract = new StellarSdk.Contract(contractId);

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkConfig.networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const simulated = await this.server.simulateTransaction(transaction);

    if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      return StellarSdk.SorobanRpc.assembleTransaction(transaction, simulated).build();
    } else {
      throw new Error(`Simulation failed: ${JSON.stringify(simulated)}`);
    }
  }

  private async submitTransaction(
    transaction: StellarSdk.Transaction,
    signFn: SignFunction
  ): Promise<StellarSdk.SorobanRpc.Api.GetTransactionResponse> {
    const signedTx = await signFn(transaction);
    const response = await this.server.sendTransaction(signedTx);

    // Poll for result
    let result = await this.server.getTransaction(response.hash);
    let attempts = 0;
    while (result.status === 'NOT_FOUND' && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      result = await this.server.getTransaction(response.hash);
      attempts++;
    }

    if (result.status === 'SUCCESS') {
      return result;
    } else {
      throw new Error(`Transaction failed: ${result.status}`);
    }
  }

  // ============================================================================
  // Lending Pool Methods
  // ============================================================================

  /**
   * LP deposits USDC to earn interest
   */
  async lpDeposit(
    depositor: string,
    amount: bigint,
    signFn: SignFunction
  ): Promise<StellarSdk.SorobanRpc.Api.GetTransactionResponse> {
    const args = [
      this.toScVal(depositor, 'address'),
      this.toScVal(amount, 'i128'),
    ];

    const tx = await this.buildTransaction(
      depositor,
      this.contracts.lendingPool,
      'lp_deposit',
      args
    );

    return this.submitTransaction(tx, signFn);
  }

  /**
   * LP withdraws USDC (only available, not locked)
   */
  async lpWithdraw(
    depositor: string,
    amount: bigint,
    signFn: SignFunction
  ): Promise<StellarSdk.SorobanRpc.Api.GetTransactionResponse> {
    const args = [
      this.toScVal(depositor, 'address'),
      this.toScVal(amount, 'i128'),
    ];

    const tx = await this.buildTransaction(
      depositor,
      this.contracts.lendingPool,
      'lp_withdraw',
      args
    );

    return this.submitTransaction(tx, signFn);
  }

  /**
   * Get LP deposit information
   */
  async getLPDeposit(depositor: string): Promise<LPDepositInfo | null> {
    const args = [this.toScVal(depositor, 'address')];

    const tx = await this.buildTransaction(
      depositor,
      this.contracts.lendingPool,
      'get_lp_deposit',
      args
    );

    const simulated = await this.server.simulateTransaction(tx);

    if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      // Parse the result - implement based on actual return type
      return simulated.result?.retval as any;
    }

    return null;
  }

  /**
   * Originate a new loan
   */
  async originateLoan(
    borrower: string,
    collateralAmount: bigint,
    loanAmount: bigint,
    durationMonths: number,
    signFn: SignFunction
  ): Promise<StellarSdk.SorobanRpc.Api.GetTransactionResponse> {
    const args = [
      this.toScVal(borrower, 'address'),
      this.toScVal(collateralAmount, 'i128'),
      this.toScVal(loanAmount, 'i128'),
      this.toScVal(durationMonths, 'u32'),
    ];

    const tx = await this.buildTransaction(
      borrower,
      this.contracts.lendingPool,
      'originate_loan',
      args
    );

    return this.submitTransaction(tx, signFn);
  }

  /**
   * Repay loan
   */
  async repayLoan(
    borrower: string,
    amount: bigint,
    signFn: SignFunction
  ): Promise<StellarSdk.SorobanRpc.Api.GetTransactionResponse> {
    const args = [
      this.toScVal(borrower, 'address'),
      this.toScVal(amount, 'i128'),
    ];

    const tx = await this.buildTransaction(
      borrower,
      this.contracts.lendingPool,
      'repay_loan',
      args
    );

    return this.submitTransaction(tx, signFn);
  }

  /**
   * Close loan early (with 5% fee)
   */
  async closeLoanEarly(
    borrower: string,
    signFn: SignFunction
  ): Promise<StellarSdk.SorobanRpc.Api.GetTransactionResponse> {
    const args = [this.toScVal(borrower, 'address')];

    const tx = await this.buildTransaction(
      borrower,
      this.contracts.lendingPool,
      'close_loan_early',
      args
    );

    return this.submitTransaction(tx, signFn);
  }

  /**
   * Get loan information
   */
  async getLoan(borrower: string): Promise<LoanInfo | null> {
    const args = [this.toScVal(borrower, 'address')];

    const tx = await this.buildTransaction(
      borrower,
      this.contracts.lendingPool,
      'get_loan',
      args
    );

    const simulated = await this.server.simulateTransaction(tx);

    if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      // Parse the result
      return simulated.result?.retval as any;
    }

    return null;
  }

  /**
   * Get total pool liquidity
   */
  async getTotalLiquidity(): Promise<bigint> {
    const tx = await this.buildTransaction(
      this.contracts.lendingPool, // Any address for read-only
      this.contracts.lendingPool,
      'get_total_liquidity',
      []
    );

    const simulated = await this.server.simulateTransaction(tx);

    if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      return simulated.result?.retval as any;
    }

    return BigInt(0);
  }

  /**
   * Get available liquidity (not locked in loans)
   */
  async getAvailableLiquidity(): Promise<bigint> {
    const tx = await this.buildTransaction(
      this.contracts.lendingPool,
      this.contracts.lendingPool,
      'get_available_liquidity',
      []
    );

    const simulated = await this.server.simulateTransaction(tx);

    if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      return simulated.result?.retval as any;
    }

    return BigInt(0);
  }

  // ============================================================================
  // Vault Methods
  // ============================================================================

  /**
   * Stake RWA tokens to receive stRWA
   */
  async stake(
    user: string,
    amount: bigint,
    signFn: SignFunction
  ): Promise<StellarSdk.SorobanRpc.Api.GetTransactionResponse> {
    const args = [
      this.toScVal(user, 'address'),
      this.toScVal(amount, 'i128'),
    ];

    const tx = await this.buildTransaction(
      user,
      this.contracts.vault,
      'stake',
      args
    );

    return this.submitTransaction(tx, signFn);
  }

  /**
   * Unstake stRWA to receive RWA tokens back
   */
  async unstake(
    user: string,
    amount: bigint,
    signFn: SignFunction
  ): Promise<StellarSdk.SorobanRpc.Api.GetTransactionResponse> {
    const args = [
      this.toScVal(user, 'address'),
      this.toScVal(amount, 'i128'),
    ];

    const tx = await this.buildTransaction(
      user,
      this.contracts.vault,
      'unstake',
      args
    );

    return this.submitTransaction(tx, signFn);
  }

  /**
   * Claim accumulated yield
   */
  async claimYield(
    user: string,
    signFn: SignFunction
  ): Promise<StellarSdk.SorobanRpc.Api.GetTransactionResponse> {
    const args = [this.toScVal(user, 'address')];

    const tx = await this.buildTransaction(
      user,
      this.contracts.vault,
      'claim_yield',
      args
    );

    return this.submitTransaction(tx, signFn);
  }

  // ============================================================================
  // Token Methods
  // ============================================================================

  /**
   * Approve token spending
   */
  async approveToken(
    tokenAddress: string,
    from: string,
    spender: string,
    amount: bigint,
    expirationLedger: number,
    signFn: SignFunction
  ): Promise<StellarSdk.SorobanRpc.Api.GetTransactionResponse> {
    const args = [
      this.toScVal(from, 'address'),
      this.toScVal(spender, 'address'),
      this.toScVal(amount, 'i128'),
      this.toScVal(expirationLedger, 'u32'),
    ];

    const tx = await this.buildTransaction(
      from,
      tokenAddress,
      'approve',
      args
    );

    return this.submitTransaction(tx, signFn);
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress: string, address: string): Promise<bigint> {
    const args = [this.toScVal(address, 'address')];

    const tx = await this.buildTransaction(
      address,
      tokenAddress,
      'balance',
      args
    );

    const simulated = await this.server.simulateTransaction(tx);

    if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      return simulated.result?.retval as any;
    }

    return BigInt(0);
  }
}

// ============================================================================
// Exports
// ============================================================================

export default StellarLendingSDK;
