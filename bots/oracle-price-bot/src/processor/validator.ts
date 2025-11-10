// bots/oracle-price-bot/src/processor/validator.ts
import { VALIDATION_CONFIG } from "../config/validation";

export class PriceValidator {
  validate(asset: string, price: number, lastPrice?: number) {
    const config = VALIDATION_CONFIG[asset];
    if (!config) {
      throw new Error(`Validation config for asset ${asset} not found`);
    }

    if (price < config.minPrice) {
      throw new Error(`Price ${price} is below minimum ${config.minPrice}`);
    }

    if (price > config.maxPrice) {
      throw new Error(`Price ${price} is above maximum ${config.maxPrice}`);
    }

    if (lastPrice) {
      const change = Math.abs(price - lastPrice) / lastPrice;
      if (change > config.maxChangePercent / 100) {
        throw new Error(
          `Price change ${change * 100}% exceeds maximum change ${config.maxChangePercent}%`,
        );
      }
    }
  }
}
