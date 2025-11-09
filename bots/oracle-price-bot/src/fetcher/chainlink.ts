// bots/oracle-price-bot/src/fetcher/chainlink.ts
import { PriceFetcher } from "./base";

export class ChainlinkFetcher extends PriceFetcher {
  async fetchPrice(asset: string): Promise<number> {
    return this.fetchWithRetry(async () => {
      const response = await fetch(this.config.url);
      const data = await response.json();
      return parseFloat(data.answer) / 1e8; // Chainlink uses 8 decimals
    });
  }
}
