// bots/shared/clients/oracle-client.ts
import * as StellarSdk from '@stellar/stellar-sdk';
import { SharedConfig } from '../config';

export interface PriceData {
  price: bigint;
  timestamp: number;
  decimals: number;
}

/**
 * Client for interacting with the Oracle contract
 */
export class OracleClient {
  private server: StellarSdk.SorobanRpc.Server;
  private config: SharedConfig;
  private oracleContractId: string;

  constructor(config?: SharedConfig) {
    this.config = config || SharedConfig.getInstance();
    this.server = new StellarSdk.SorobanRpc.Server(this.config.getRpcUrl());
    this.oracleContractId = this.config.getContractId('oracle');
  }

  /**
   * Get the current price for an asset from the oracle
   * @param assetAddress - The address of the asset (e.g., stRWA token)
   * @returns [price, timestamp] where price is in USDC (6 decimals)
   */
  async getPrice(assetAddress: string): Promise<[bigint, number]> {
    try {
      const contract = new StellarSdk.Contract(this.oracleContractId);

      // For read-only operations, we can use any account
      // In production, you might want to use a dedicated read account
      const sourceAccount = await this.server.getAccount(assetAddress);

      const args = [
        StellarSdk.nativeToScVal(assetAddress, { type: 'address' }),
      ];

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.config.getNetworkPassphrase(),
      })
        .addOperation(contract.call('get_price', ...args))
        .setTimeout(30)
        .build();

      const simulated = await this.server.simulateTransaction(transaction);

      if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
        throw new Error('Failed to get price from oracle');
      }

      // Parse the result
      const result = StellarSdk.scValToNative(simulated.result!.retval);

      // Result format: { price: i128, timestamp: u64 }
      const price = BigInt(result.price);
      const timestamp = Number(result.timestamp);

      return [price, timestamp];
    } catch (error: any) {
      console.error('Failed to get price from oracle:', error.message);
      throw error;
    }
  }

  /**
   * Check if the oracle price is stale
   * @param timestamp - The timestamp from the oracle
   * @param maxAgeSeconds - Maximum age in seconds (default: 24 hours)
   */
  isPriceStale(timestamp: number, maxAgeSeconds: number = 24 * 3600): boolean {
    const now = Date.now() / 1000;
    return now - timestamp > maxAgeSeconds;
  }

  /**
   * Get price and validate freshness
   */
  async getPriceWithValidation(
    assetAddress: string,
    maxAgeSeconds: number = 24 * 3600
  ): Promise<[bigint, number]> {
    const [price, timestamp] = await this.getPrice(assetAddress);

    if (this.isPriceStale(timestamp, maxAgeSeconds)) {
      throw new Error(
        `Oracle price is stale. Last update: ${new Date(timestamp * 1000).toISOString()}`
      );
    }

    return [price, timestamp];
  }
}
