import { PriceSmoother } from "../../src/processor/smoother";

describe("PriceSmoother", () => {
  let smoother: PriceSmoother;

  beforeEach(() => {
    smoother = new PriceSmoother();
  });

  it("should return raw price when smoothing disabled", () => {
    const result = smoother.smooth("TBILL", 1.05, {
      enabled: false,
      alpha: 0.5,
      windowSize: 10,
    });

    expect(result).toBe(1.05);
  });

  it("should smooth prices with EMA", () => {
    const config = { enabled: true, alpha: 0.5, windowSize: 5 };

    // Feed multiple prices
    smoother.smooth("TBILL", 1.00, config);
    smoother.smooth("TBILL", 1.10, config);
    const result = smoother.smooth("TBILL", 1.20, config);

    // Should be smoothed (less than raw 1.20)
    expect(result).toBeLessThan(1.20);
    expect(result).toBeGreaterThan(1.00);
  });

  it("should maintain separate histories per asset", () => {
    const config = { enabled: true, alpha: 0.5, windowSize: 5 };

    smoother.smooth("TBILL", 1.00, config);
    smoother.smooth("BOND", 2.00, config);

    const tbillResult = smoother.smooth("TBILL", 1.10, config);
    const bondResult = smoother.smooth("BOND", 2.10, config);

    expect(tbillResult).not.toBe(bondResult);
  });
});
