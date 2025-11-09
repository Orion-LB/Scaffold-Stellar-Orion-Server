import { ContractService, TransactionResult, StellarWalletProvider, ContractClientOptions } from './ContractService';

export interface PriceData {
  price: bigint;
  timestamp: bigint;
}

/**
 * Oracle Service
 * Price oracle for asset pricing
 * Prices are in basis points (e.g., 10500 = 105.00 USDC)
 */
export class OracleService extends ContractService {
  constructor(options: ContractClientOptions) {
    super(options);
  }

  // ============ Read Operations ============

  /**
   * Get latest price for asset in basis points
   * Example: 10500 BP = 105.00 USDC
   */
  async get_price(asset: string): Promise<bigint> {
    const result = await this.queryContract('get_price', { asset });
    return BigInt(result || '0');
  }

  /**
   * Get price with timestamp
   * Returns: [price, timestamp]
   */
  async get_price_data(asset: string): Promise<PriceData> {
    const result = await this.queryContract('get_price_data', { asset });
    return result;
  }

  // ============ Write Operations (Bot Only) ============

  /**
   * Submit asset price update
   * Bot only function
   *
   * Parameters:
   * - bot: Bot address (must be authorized)
   * - asset: Asset contract address
   * - price: Price in basis points (e.g., 10500 = 105.00 USDC)
   */
  async submit_price(bot: string, asset: string, price: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('submit_price', {
      bot,
      asset,
      price: price.toString()
    }, wallet);
  }

  // ============ Helper Methods ============

  /**
   * Convert basis points to USDC amount
   * Example: 10500 BP → 105.00 USDC
   */
  basisPointsToUSDC(basisPoints: bigint): number {
    return Number(basisPoints) / 100;
  }

  /**
   * Convert USDC amount to basis points
   * Example: 105.00 USDC → 10500 BP
   */
  usdcToBasisPoints(usdc: number): bigint {
    return BigInt(Math.floor(usdc * 100));
  }

  /**
   * Check if price is stale (> 24 hours old)
   */
  isPriceStale(timestamp: bigint): boolean {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const ageInSeconds = now - timestamp;
    const TWENTY_FOUR_HOURS = BigInt(86400);
    return ageInSeconds > TWENTY_FOUR_HOURS;
  }

  /**
   * Get price age in seconds
   */
  getPriceAge(timestamp: bigint): number {
    const now = BigInt(Math.floor(Date.now() / 1000));
    return Number(now - timestamp);
  }
}
