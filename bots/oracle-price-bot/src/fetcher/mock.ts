// bots/oracle-price-bot/src/fetcher/mock.ts
import { PriceFetcher } from "./base";
import { DataSource } from "../config/sources";

/**
 * Mock price fetcher for testing multi-asset deployments
 * Returns simulated prices with small random variations
 */
export class MockPriceFetcher extends PriceFetcher {
  private prices: Map<string, number> = new Map([
    ["STRWA_INVOICES", 1.05], // $1.05 per invoice stRWA
    ["STRWA_TBILLS", 1.02], // $1.02 per TBills stRWA
    ["STRWA_REALESTATE", 1.08], // $1.08 per Real Estate stRWA
  ]);

  constructor(source: DataSource) {
    super(source);
  }

  async fetchPrice(asset: string): Promise<number> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const basePrice = this.prices.get(asset);
    if (!basePrice) {
      throw new Error(`No mock price configured for ${asset}`);
    }

    // Add small random variation (±0.1%)
    const variation = (Math.random() - 0.5) * 0.002;
    const price = basePrice * (1 + variation);

    return price;
  }

  getName(): string {
    return this.source.name;
  }

  getWeight(): number {
    return this.source.weight;
  }
}
