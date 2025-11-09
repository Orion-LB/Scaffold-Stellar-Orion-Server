// bots/shared/clients/lending-pool-client.ts
import * as StellarSdk from '@stellar/stellar-sdk';
import { SharedConfig } from '../config';

export interface Loan {
  collateralAmount: bigint;
  outstandingDebt: bigint;
  penalties: bigint;
  lastPaymentTime: number;
  warningsIssued: number;
  lastWarningTime: number;
  strwaTokenAddress: string;
}

/**
 * Client for interacting with the Lending Pool contract
 */
export class LendingPoolClient {
  private server: StellarSdk.SorobanRpc.Server;
  private config: SharedConfig;
  private lendingPoolContractId: string;
  private keypair?: StellarSdk.Keypair;

  constructor(keypair?: StellarSdk.Keypair, config?: SharedConfig) {
    this.config = config || SharedConfig.getInstance();
    this.server = new StellarSdk.SorobanRpc.Server(this.config.getRpcUrl());
    this.lendingPoolContractId = this.config.getContractId('lending_pool');
    this.keypair = keypair;
  }

  /**
   * Get loan details for a borrower
   */
  async getLoan(borrowerAddress: string): Promise<Loan | null> {
    try {
      const contract = new StellarSdk.Contract(this.lendingPoolContractId);

      // Use borrower's account for read-only operation
      const sourceAccount = await this.server.getAccount(borrowerAddress);

      const args = [
        StellarSdk.nativeToScVal(borrowerAddress, { type: 'address' }),
      ];

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.config.getNetworkPassphrase(),
      })
        .addOperation(contract.call('get_loan', ...args))
        .setTimeout(30)
        .build();

      const simulated = await this.server.simulateTransaction(transaction);

      if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
        // No loan found
        return null;
      }

      // Parse the result
      const result = StellarSdk.scValToNative(simulated.result!.retval);

      if (!result) {
        return null;
      }

      return {
        collateralAmount: BigInt(result.collateral_amount),
        outstandingDebt: BigInt(result.outstanding_debt),
        penalties: BigInt(result.penalties),
        lastPaymentTime: Number(result.last_payment_time),
        warningsIssued: Number(result.warnings_issued),
        lastWarningTime: Number(result.last_warning_time),
        strwaTokenAddress: result.strwa_token_address,
      };
    } catch (error: any) {
      console.error('Failed to get loan:', error.message);
      return null;
    }
  }

  /**
   * Repay a loan on behalf of a borrower
   * Requires keypair to sign transaction
   */
  async repayLoan(
    borrowerAddress: string,
    repaymentAmount: bigint
  ): Promise<string> {
    if (!this.keypair) {
      throw new Error('Keypair required to execute transactions');
    }

    try {
      const contract = new StellarSdk.Contract(this.lendingPoolContractId);
      const botAddress = this.keypair.publicKey();
      const account = await this.server.getAccount(botAddress);

      const args = [
        StellarSdk.nativeToScVal(borrowerAddress, { type: 'address' }),
        StellarSdk.nativeToScVal(repaymentAmount, { type: 'i128' }),
      ];

      let transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.config.getNetworkPassphrase(),
      })
        .addOperation(contract.call('repay_loan', ...args))
        .setTimeout(30)
        .build();

      // Simulate
      const simulated = await this.server.simulateTransaction(transaction);

      if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
        throw new Error('Repayment simulation failed');
      }

      // Assemble with simulation results
      transaction = StellarSdk.SorobanRpc.assembleTransaction(
        transaction,
        simulated
      ).build();

      // Sign
      transaction.sign(this.keypair);

      // Submit
      const response = await this.server.sendTransaction(transaction);

      // Wait for confirmation
      const txHash = response.hash;
      await this.waitForTransaction(txHash);

      return txHash;
    } catch (error: any) {
      console.error('Failed to repay loan:', error.message);
      throw error;
    }
  }

  /**
   * Issue a warning to a borrower
   */
  async issueWarning(borrowerAddress: string): Promise<string> {
    if (!this.keypair) {
      throw new Error('Keypair required to execute transactions');
    }

    try {
      const contract = new StellarSdk.Contract(this.lendingPoolContractId);
      const botAddress = this.keypair.publicKey();
      const account = await this.server.getAccount(botAddress);

      const args = [
        StellarSdk.nativeToScVal(borrowerAddress, { type: 'address' }),
      ];

      let transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.config.getNetworkPassphrase(),
      })
        .addOperation(contract.call('check_and_issue_warning', ...args))
        .setTimeout(30)
        .build();

      // Simulate
      const simulated = await this.server.simulateTransaction(transaction);

      if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
        throw new Error('Warning simulation failed');
      }

      // Assemble
      transaction = StellarSdk.SorobanRpc.assembleTransaction(
        transaction,
        simulated
      ).build();

      // Sign
      transaction.sign(this.keypair);

      // Submit
      const response = await this.server.sendTransaction(transaction);

      // Wait for confirmation
      const txHash = response.hash;
      await this.waitForTransaction(txHash);

      return txHash;
    } catch (error: any) {
      console.error('Failed to issue warning:', error.message);
      throw error;
    }
  }

  /**
   * Liquidate a loan
   */
  async liquidateLoan(borrowerAddress: string): Promise<string> {
    if (!this.keypair) {
      throw new Error('Keypair required to execute transactions');
    }

    try {
      const contract = new StellarSdk.Contract(this.lendingPoolContractId);
      const botAddress = this.keypair.publicKey();
      const account = await this.server.getAccount(botAddress);

      const args = [
        StellarSdk.nativeToScVal(botAddress, { type: 'address' }),
        StellarSdk.nativeToScVal(borrowerAddress, { type: 'address' }),
      ];

      let transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.config.getNetworkPassphrase(),
      })
        .addOperation(contract.call('liquidate_loan', ...args))
        .setTimeout(30)
        .build();

      // Simulate
      const simulated = await this.server.simulateTransaction(transaction);

      if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
        throw new Error('Liquidation simulation failed');
      }

      // Assemble
      transaction = StellarSdk.SorobanRpc.assembleTransaction(
        transaction,
        simulated
      ).build();

      // Sign
      transaction.sign(this.keypair);

      // Submit
      const response = await this.server.sendTransaction(transaction);

      // Wait for confirmation
      const txHash = response.hash;
      await this.waitForTransaction(txHash);

      return txHash;
    } catch (error: any) {
      console.error('Failed to liquidate loan:', error.message);
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  private async waitForTransaction(
    txHash: string,
    maxAttempts: number = 20
  ): Promise<void> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const result = await this.server.getTransaction(txHash);

      if (result.status === 'SUCCESS') {
        return;
      }

      if (result.status === 'FAILED') {
        throw new Error(`Transaction failed: ${txHash}`);
      }

      // Wait 1 second before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error(`Transaction timeout: ${txHash}`);
  }
}
