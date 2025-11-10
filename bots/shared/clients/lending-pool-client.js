"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LendingPoolClient = void 0;
// bots/shared/clients/lending-pool-client.ts
const StellarSdk = __importStar(require("@stellar/stellar-sdk"));
const config_1 = require("../config");
/**
 * Client for interacting with the Lending Pool contract
 */
class LendingPoolClient {
  constructor(keypair, config) {
    this.config = config || config_1.SharedConfig.getInstance();
    this.server = new StellarSdk.rpc.Server(this.config.getRpcUrl());
    this.lendingPoolContractId = this.config.getContractId("lending_pool");
    this.keypair = keypair;
  }
  /**
   * Get loan details for a borrower
   */
  async getLoan(borrowerAddress) {
    try {
      const contract = new StellarSdk.Contract(this.lendingPoolContractId);
      // Use borrower's account for read-only operation
      const sourceAccount = await this.server.getAccount(borrowerAddress);
      const args = [
        StellarSdk.nativeToScVal(borrowerAddress, { type: "address" }),
      ];
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.config.getNetworkPassphrase(),
      })
        .addOperation(contract.call("get_loan", ...args))
        .setTimeout(30)
        .build();
      const simulated = await this.server.simulateTransaction(transaction);
      if (!StellarSdk.rpc.Api.isSimulationSuccess(simulated)) {
        // No loan found
        return null;
      }
      // Parse the result
      const result = StellarSdk.scValToNative(simulated.result.retval);
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
    } catch (error) {
      console.error("Failed to get loan:", error.message);
      return null;
    }
  }
  /**
   * Repay a loan on behalf of a borrower
   * Requires keypair to sign transaction
   */
  async repayLoan(borrowerAddress, repaymentAmount) {
    if (!this.keypair) {
      throw new Error("Keypair required to execute transactions");
    }
    try {
      const contract = new StellarSdk.Contract(this.lendingPoolContractId);
      const botAddress = this.keypair.publicKey();
      const account = await this.server.getAccount(botAddress);
      const args = [
        StellarSdk.nativeToScVal(borrowerAddress, { type: "address" }),
        StellarSdk.nativeToScVal(repaymentAmount, { type: "i128" }),
      ];
      let transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.config.getNetworkPassphrase(),
      })
        .addOperation(contract.call("repay_loan", ...args))
        .setTimeout(30)
        .build();
      // Simulate
      const simulated = await this.server.simulateTransaction(transaction);
      if (!StellarSdk.rpc.Api.isSimulationSuccess(simulated)) {
        throw new Error("Repayment simulation failed");
      }
      // Assemble with simulation results
      transaction = StellarSdk.rpc
        .assembleTransaction(transaction, simulated)
        .build();
      // Sign
      transaction.sign(this.keypair);
      // Submit
      const response = await this.server.sendTransaction(transaction);
      // Wait for confirmation
      const txHash = response.hash;
      await this.waitForTransaction(txHash);
      return txHash;
    } catch (error) {
      console.error("Failed to repay loan:", error.message);
      throw error;
    }
  }
  /**
   * Issue a warning to a borrower
   */
  async issueWarning(borrowerAddress) {
    if (!this.keypair) {
      throw new Error("Keypair required to execute transactions");
    }
    try {
      const contract = new StellarSdk.Contract(this.lendingPoolContractId);
      const botAddress = this.keypair.publicKey();
      const account = await this.server.getAccount(botAddress);
      const args = [
        StellarSdk.nativeToScVal(borrowerAddress, { type: "address" }),
      ];
      let transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.config.getNetworkPassphrase(),
      })
        .addOperation(contract.call("check_and_issue_warning", ...args))
        .setTimeout(30)
        .build();
      // Simulate
      const simulated = await this.server.simulateTransaction(transaction);
      if (!StellarSdk.rpc.Api.isSimulationSuccess(simulated)) {
        throw new Error("Warning simulation failed");
      }
      // Assemble
      transaction = StellarSdk.rpc
        .assembleTransaction(transaction, simulated)
        .build();
      // Sign
      transaction.sign(this.keypair);
      // Submit
      const response = await this.server.sendTransaction(transaction);
      // Wait for confirmation
      const txHash = response.hash;
      await this.waitForTransaction(txHash);
      return txHash;
    } catch (error) {
      console.error("Failed to issue warning:", error.message);
      throw error;
    }
  }
  /**
   * Liquidate a loan
   */
  async liquidateLoan(borrowerAddress) {
    if (!this.keypair) {
      throw new Error("Keypair required to execute transactions");
    }
    try {
      const contract = new StellarSdk.Contract(this.lendingPoolContractId);
      const botAddress = this.keypair.publicKey();
      const account = await this.server.getAccount(botAddress);
      const args = [
        StellarSdk.nativeToScVal(botAddress, { type: "address" }),
        StellarSdk.nativeToScVal(borrowerAddress, { type: "address" }),
      ];
      let transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.config.getNetworkPassphrase(),
      })
        .addOperation(contract.call("liquidate_loan", ...args))
        .setTimeout(30)
        .build();
      // Simulate
      const simulated = await this.server.simulateTransaction(transaction);
      if (!StellarSdk.rpc.Api.isSimulationSuccess(simulated)) {
        throw new Error("Liquidation simulation failed");
      }
      // Assemble
      transaction = StellarSdk.rpc
        .assembleTransaction(transaction, simulated)
        .build();
      // Sign
      transaction.sign(this.keypair);
      // Submit
      const response = await this.server.sendTransaction(transaction);
      // Wait for confirmation
      const txHash = response.hash;
      await this.waitForTransaction(txHash);
      return txHash;
    } catch (error) {
      console.error("Failed to liquidate loan:", error.message);
      throw error;
    }
  }
  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash, maxAttempts = 20) {
    let attempts = 0;
    while (attempts < maxAttempts) {
      const result = await this.server.getTransaction(txHash);
      if (result.status === "SUCCESS") {
        return;
      }
      if (result.status === "FAILED") {
        throw new Error(`Transaction failed: ${txHash}`);
      }
      // Wait 1 second before next attempt
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }
    throw new Error(`Transaction timeout: ${txHash}`);
  }
}
exports.LendingPoolClient = LendingPoolClient;
