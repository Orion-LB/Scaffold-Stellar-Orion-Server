// bots/oracle-price-bot/src/fetcher/base.ts
import { DataSource } from "../config/sources";

export interface PriceFetchResult {
  price: number;
  timestamp: number;
  source: string;
}

export abstract class PriceFetcher {
  constructor(protected config: DataSource) {}

  abstract fetchPrice(asset: string): Promise<number>;

  getName(): string {
    return this.config.name;
  }

  getWeight(): number {
    return this.config.weight;
  }

  protected async fetchWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    for (let i = 0; i < this.config.retries; i++) {
      try {
        return await this.fetchWithTimeout(fn, this.config.timeout);
      } catch (error: any) {
        lastError = error;
        const delay = 1000 * Math.pow(2, i); // exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  protected async fetchWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number,
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), timeout),
      ),
    ]);
  }
}
