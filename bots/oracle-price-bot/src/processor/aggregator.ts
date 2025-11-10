// bots/oracle-price-bot/src/processor/aggregator.ts
export class PriceAggregator {
  aggregate(prices: number[], weights: number[]): number {
    if (prices.length === 0) {
      throw new Error("No prices to aggregate");
    }

    if (prices.length === 1) {
      return prices[0];
    }

    // Weighted average
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const weightedSum = prices.reduce(
      (sum, price, i) => sum + price * weights[i],
      0,
    );

    return weightedSum / totalWeight;
  }

  median(prices: number[]): number {
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }

    return sorted[mid];
  }

  trimmedMean(prices: number[], trimPercent: number = 20): number {
    const sorted = [...prices].sort((a, b) => a - b);
    const trimCount = Math.floor(prices.length * (trimPercent / 100));

    const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
    return trimmed.reduce((sum, p) => sum + p, 0) / trimmed.length;
  }
}
