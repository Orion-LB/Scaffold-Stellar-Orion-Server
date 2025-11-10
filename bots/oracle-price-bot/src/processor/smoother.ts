// bots/oracle-price-bot/src/processor/smoother.ts
export interface SmoothingConfig {
  enabled: boolean;
  alpha: number; // Smoothing factor (0-1), higher = less smoothing
  windowSize: number; // Number of historical prices to consider
}

export class PriceSmoother {
  private history: Map<string, number[]> = new Map();

  smooth(asset: string, rawPrice: number, config: SmoothingConfig): number {
    if (!config.enabled) return rawPrice;

    const history = this.history.get(asset) || [];
    history.push(rawPrice);

    // Keep only windowSize prices
    if (history.length > config.windowSize) {
      history.shift();
    }

    // Exponential Moving Average
    const ema = history.reduce((acc, price, i) => {
      const weight = Math.pow(config.alpha, history.length - 1 - i);
      return acc + price * weight;
    }, 0);

    const totalWeight = history.reduce((acc, _, i) => {
      return acc + Math.pow(config.alpha, history.length - 1 - i);
    }, 0);

    this.history.set(asset, history);
    return ema / totalWeight;
  }
}
