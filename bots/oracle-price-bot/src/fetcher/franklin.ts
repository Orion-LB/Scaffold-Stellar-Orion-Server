// bots/oracle-price-bot/src/fetcher/franklin.ts
import { PriceFetcher } from "./base";

export class FranklinTempletonFetcher extends PriceFetcher {
  async fetchPrice(asset: string): Promise<number> {
    const response = await this.fetchWithTimeout(
      () => fetch(this.config.url, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      }),
      this.config.timeout
    );

    const data = await response.json();
    return parseFloat(data.nav); // Net Asset Value
  }
}
