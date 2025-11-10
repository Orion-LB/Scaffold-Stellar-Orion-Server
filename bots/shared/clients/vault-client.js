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
exports.VaultClient = void 0;
// bots/shared/clients/vault-client.ts
const StellarSdk = __importStar(require("@stellar/stellar-sdk"));
const config_1 = require("../config");
/**
 * Client for interacting with the RWA Vault contract
 */
class VaultClient {
  constructor(config) {
    this.config = config || config_1.SharedConfig.getInstance();
    this.server = new StellarSdk.rpc.Server(this.config.getRpcUrl());
    this.vaultContractId = this.config.getContractId("rwa_vault");
  }
  /**
   * Get the claimable yield for a depositor
   */
  async getClaimableYield(depositorAddress) {
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
      const result = StellarSdk.scValToNative(simulated.result.retval);
      return BigInt(result);
    } catch (error) {
      console.error("Failed to get claimable yield:", error.message);
      return 0n;
    }
  }
  /**
   * Get the balance for a depositor
   */
  async getBalance(depositorAddress) {
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
      const result = StellarSdk.scValToNative(simulated.result.retval);
      return BigInt(result);
    } catch (error) {
      console.error("Failed to get balance:", error.message);
      return 0n;
    }
  }
  /**
   * Check if an address is a borrower
   */
  async isBorrower(address) {
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
      const result = StellarSdk.scValToNative(simulated.result.retval);
      return Boolean(result);
    } catch (error) {
      console.error("Failed to check borrower status:", error.message);
      return false;
    }
  }
}
exports.VaultClient = VaultClient;
