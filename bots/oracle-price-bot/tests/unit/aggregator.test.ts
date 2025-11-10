// tests/unit/aggregator.test.ts
import { PriceAggregator } from "../../src/processor/aggregator";

describe("PriceAggregator", () => {
  let aggregator: PriceAggregator;

  beforeEach(() => {
    aggregator = new PriceAggregator();
  });

  it("should calculate weighted average correctly", () => {
    const prices = [1.0, 1.02, 0.98];
    const weights = [40, 30, 30];

    // Calculation: (1.00*40 + 1.02*30 + 0.98*30) / (40+30+30) = 100/100 = 1.00
    const result = aggregator.aggregate(prices, weights);
    expect(result).toBeCloseTo(1.0, 2);
  });

  it("should calculate median correctly", () => {
    const prices = [1.0, 1.02, 0.98, 1.05, 0.95];
    const result = aggregator.median(prices);
    expect(result).toBe(1.0);
  });

  it("should calculate trimmed mean correctly", () => {
    const prices = [0.9, 1.0, 1.01, 1.02, 1.1]; // Outliers at ends
    const result = aggregator.trimmedMean(prices, 20);
    expect(result).toBeCloseTo(1.01, 2);
  });

  it("should throw on empty prices", () => {
    expect(() => aggregator.aggregate([], [])).toThrow(
      "No prices to aggregate",
    );
  });
});
