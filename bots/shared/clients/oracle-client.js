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
exports.OracleClient = void 0;
// bots/shared/clients/oracle-client.ts
const StellarSdk = __importStar(require("@stellar/stellar-sdk"));
const config_1 = require("../config");
/**
 * Client for interacting with the Oracle contract
 */
class OracleClient {
  constructor(config) {
    this.config = config || config_1.SharedConfig.getInstance();
    this.server = new StellarSdk.rpc.Server(this.config.getRpcUrl());
    this.oracleContractId = this.config.getContractId("oracle");
  }
  /**
   * Get the current price for an asset from the oracle
   * @param assetAddress - The address of the asset (e.g., stRWA token)
   * @returns [price, timestamp] where price is in USDC (6 decimals)
   */
  async getPrice(assetAddress) {
    try {
      const contract = new StellarSdk.Contract(this.oracleContractId);
      // For read-only operations, we can use any account
      // In production, you might want to use a dedicated read account
      const sourceAccount = await this.server.getAccount(assetAddress);
      const args = [
        StellarSdk.nativeToScVal(assetAddress, { type: "address" }),
      ];
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.config.getNetworkPassphrase(),
      })
        .addOperation(contract.call("get_price", ...args))
        .setTimeout(30)
        .build();
      const simulated = await this.server.simulateTransaction(transaction);
      if (!StellarSdk.rpc.Api.isSimulationSuccess(simulated)) {
        throw new Error("Failed to get price from oracle");
      }
      // Parse the result
      const result = StellarSdk.scValToNative(simulated.result.retval);
      // Result format: { price: i128, timestamp: u64 }
      const price = BigInt(result.price);
      const timestamp = Number(result.timestamp);
      return [price, timestamp];
    } catch (error) {
      console.error("Failed to get price from oracle:", error.message);
      throw error;
    }
  }
  /**
   * Check if the oracle price is stale
   * @param timestamp - The timestamp from the oracle
   * @param maxAgeSeconds - Maximum age in seconds (default: 24 hours)
   */
  isPriceStale(timestamp, maxAgeSeconds = 24 * 3600) {
    const now = Date.now() / 1000;
    return now - timestamp > maxAgeSeconds;
  }
  /**
   * Get price and validate freshness
   */
  async getPriceWithValidation(assetAddress, maxAgeSeconds = 24 * 3600) {
    const [price, timestamp] = await this.getPrice(assetAddress);
    if (this.isPriceStale(timestamp, maxAgeSeconds)) {
      throw new Error(
        `Oracle price is stale. Last update: ${new Date(timestamp * 1000).toISOString()}`,
      );
    }
    return [price, timestamp];
  }
}
exports.OracleClient = OracleClient;
