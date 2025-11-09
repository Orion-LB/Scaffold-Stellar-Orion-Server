// bots/oracle-price-bot/src/fetcher/base.ts
import { DataSource } from "../config/sources";

export interface PriceFetchResult {
  price: number;
  timestamp: number;
  source: string;
}

export abstract class PriceFetcher {
  constructor(
    protected config: DataSource
  ) {}

  abstract fetchPrice(asset: string): Promise<number>;

  getName(): string {
    return this.config.name;
  }

  getWeight(): number {
    return this.config.weight;
  }

  protected async fetchWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      ),
    ]);
  }
}
