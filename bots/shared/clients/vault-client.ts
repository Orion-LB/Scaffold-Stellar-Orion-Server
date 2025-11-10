// bots/shared/clients/vault-client.ts
import * as StellarSdk from "@stellar/stellar-sdk";
import { SharedConfig } from "../config";

/**
 * Client for interacting with the RWA Vault contract
 */
export class VaultClient {
  private server: StellarSdk.rpc.Server;
  private config: SharedConfig;
  private vaultContractId: string;

  constructor(config?: SharedConfig) {
    this.config = config || SharedConfig.getInstance();
    this.server = new StellarSdk.rpc.Server(this.config.getRpcUrl());
    this.vaultContractId = this.config.getContractId("rwa_vault");
  }

  /**
   * Get the claimable yield for a depositor
   */
  async getClaimableYield(depositorAddress: string): Promise<bigint> {
    try {
      const contract = new StellarSdk.Contract(this.vaultContractId);
      const sourceAccount = await this.server.getAccount(depositorAddress);

      const args = [
        StellarSdk.nativeToScVal(depositorAddress, { type: "address" }),
      ];

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.config.getNetworkPassphrase(),
      })
        .addOperation(contract.call("get_claimable_yield", ...args))
        .setTimeout(30)
        .build();

      const simulated = await this.server.simulateTransaction(transaction);

      if (!StellarSdk.rpc.Api.isSimulationSuccess(simulated)) {
        return 0n; // No yield available
      }

      const result = StellarSdk.scValToNative(simulated.result!.retval);
      return BigInt(result);
    } catch (error: any) {
      console.error("Failed to get claimable yield:", error.message);
      return 0n;
    }
  }

  /**
   * Get the balance for a depositor
   */
  async getBalance(depositorAddress: string): Promise<bigint> {
    try {
      const contract = new StellarSdk.Contract(this.vaultContractId);
      const sourceAccount = await this.server.getAccount(depositorAddress);

      const args = [
        StellarSdk.nativeToScVal(depositorAddress, { type: "address" }),
      ];

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.config.getNetworkPassphrase(),
      })
        .addOperation(contract.call("get_balance", ...args))
        .setTimeout(30)
        .build();

      const simulated = await this.server.simulateTransaction(transaction);

      if (!StellarSdk.rpc.Api.isSimulationSuccess(simulated)) {
        return 0n;
      }

      const result = StellarSdk.scValToNative(simulated.result!.retval);
      return BigInt(result);
    } catch (error: any) {
      console.error("Failed to get balance:", error.message);
      return 0n;
    }
  }

  /**
   * Check if an address is a borrower
   */
  async isBorrower(address: string): Promise<boolean> {
    try {
      const contract = new StellarSdk.Contract(this.vaultContractId);
      const sourceAccount = await this.server.getAccount(address);

      const args = [StellarSdk.nativeToScVal(address, { type: "address" })];

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.config.getNetworkPassphrase(),
      })
        .addOperation(contract.call("is_borrower", ...args))
        .setTimeout(30)
        .build();

      const simulated = await this.server.simulateTransaction(transaction);

      if (!StellarSdk.rpc.Api.isSimulationSuccess(simulated)) {
        return false;
      }

      const result = StellarSdk.scValToNative(simulated.result!.retval);
      return Boolean(result);
    } catch (error: any) {
      console.error("Failed to check borrower status:", error.message);
      return false;
    }
  }
}
