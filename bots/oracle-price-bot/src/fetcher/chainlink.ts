// bots/oracle-price-bot/src/fetcher/chainlink.ts
import { PriceFetcher } from "./base";

export class ChainlinkFetcher extends PriceFetcher {
  async fetchPrice(asset: string): Promise<number> {
    const response = await this.fetchWithTimeout(
      () => fetch(this.config.url),
      this.config.timeout
    );

    const data = await response.json();
    return parseFloat(data.answer) / 1e8; // Chainlink uses 8 decimals
  }
}
