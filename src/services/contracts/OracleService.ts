import { ContractService, TransactionResult, StellarWalletProvider, ContractClientOptions } from './ContractService';

export interface PriceData {
  asset: string;
  price: bigint;
  decimals: number;
  lastUpdate: Date;
  confidence: number;
}

export class OracleService extends ContractService {
  constructor(options: ContractClientOptions) {
    super(options);
  }
  
  // Queries
  async getPrice(assetAddress: string): Promise<bigint> {
    const result = await this.queryContract('get_price', { asset: assetAddress });
    return BigInt(result || '0');
  }
  
  async getLastUpdateTime(assetAddress: string): Promise<Date> {
    const result = await this.queryContract('get_last_update_time', { asset: assetAddress });
    return new Date(result || Date.now());
  }
  
  async getPriceData(assetAddress: string): Promise<PriceData> {
    const result = await this.queryContract('get_price_data', { asset: assetAddress });
    return result || this.getMockQueryResult('get_price_data', { asset: assetAddress });
  }
  
  async getSupportedAssets(): Promise<string[]> {
    const result = await this.queryContract('get_supported_assets');
    return result || [];
  }
  
  // Transactions (bot-only, but exposed for admin testing)
  async submitPrice(assetAddress: string, price: bigint, wallet?: StellarWalletProvider): Promise<TransactionResult> {
    return await this.invokeContract('submit_price', { asset: assetAddress, price: price.toString() }, wallet);
  }
  
  async submitPriceWithConfidence(
    assetAddress: string, 
    price: bigint, 
    confidence: number, 
    wallet?: StellarWalletProvider
  ): Promise<TransactionResult> {
    return await this.invokeContract('submit_price_with_confidence', { 
      asset: assetAddress, 
      price: price.toString(), 
      confidence: confidence.toString() 
    }, wallet);
  }
  
  protected getMockQueryResult(method: string, params: Record<string, any>): any {
    switch (method) {
      case 'get_price':
        const { asset } = params;
        // Return mock prices in USD with 8 decimals (like Chainlink)
        const prices: Record<string, bigint> = {
          'alexRWA': BigInt('5000000000'), // $50.00
          'ethRWA': BigInt('2500000000'), // $25.00
          'btcRWA': BigInt('45000000000000'), // $450,000.00
          'USDC': BigInt('100000000'), // $1.00
          'XLM': BigInt('14000000') // $0.14
        };
        return prices[asset] || BigInt('100000000');
      case 'get_last_update_time':
        return new Date(Date.now() - Math.random() * 300000); // Within last 5 minutes
      case 'get_price_data':
        const { asset: priceAsset } = params;
        const mockPrices: Record<string, PriceData> = {
          'alexRWA': {
            asset: priceAsset,
            price: BigInt('5000000000'),
            decimals: 8,
            lastUpdate: new Date(Date.now() - 120000), // 2 minutes ago
            confidence: 95.5
          },
          'USDC': {
            asset: priceAsset,
            price: BigInt('100000000'),
            decimals: 8,
            lastUpdate: new Date(Date.now() - 60000), // 1 minute ago
            confidence: 99.9
          }
        };
        return mockPrices[priceAsset] || {
          asset: priceAsset,
          price: BigInt('100000000'),
          decimals: 8,
          lastUpdate: new Date(),
          confidence: 90.0
        };
      case 'get_supported_assets':
        return ['alexRWA', 'ethRWA', 'btcRWA', 'USDC', 'XLM'];
      default:
        return null;
    }
  }
}