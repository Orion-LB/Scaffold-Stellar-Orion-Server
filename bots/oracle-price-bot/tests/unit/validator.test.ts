import { PriceValidator } from "../../src/processor/validator";

describe("PriceValidator", () => {
  let validator: PriceValidator;

  beforeEach(() => {
    validator = new PriceValidator();
  });

  it("should accept valid price", () => {
    expect(() => validator.validate("TBILL_TOKEN", 1.0, 0.99)).not.toThrow();
  });

  it("should reject price below minimum", () => {
    expect(() => validator.validate("TBILL_TOKEN", 0.9, 0.99)).toThrow(
      "below minimum",
    );
  });

  it("should reject price above maximum", () => {
    expect(() => validator.validate("TBILL_TOKEN", 1.2, 0.99)).toThrow(
      "above maximum",
    );
  });

  it("should reject excessive price change", () => {
    expect(() => validator.validate("TBILL_TOKEN", 1.05, 1.0)).toThrow(
      "exceeds maximum change",
    );
  });

  it("should accept small price change", () => {
    expect(() => validator.validate("TBILL_TOKEN", 1.01, 1.0)).not.toThrow();
  });

  it("should work without lastPrice", () => {
    expect(() => validator.validate("TBILL_TOKEN", 1.0)).not.toThrow();
  });

  it("should throw for unknown asset", () => {
    expect(() => validator.validate("UNKNOWN_ASSET", 1.0)).toThrow("not found");
  });
});
