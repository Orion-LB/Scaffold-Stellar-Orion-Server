// bots/oracle-price-bot/src/fetcher/franklin.ts
import { PriceFetcher } from "./base";

export class FranklinTempletonFetcher extends PriceFetcher {
  async fetchPrice(asset: string): Promise<number> {
    return this.fetchWithRetry(async () => {
      const response = await fetch(this.config.url, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });
      const data = await response.json();
      return parseFloat(data.nav); // Net Asset Value
    });
  }
}
