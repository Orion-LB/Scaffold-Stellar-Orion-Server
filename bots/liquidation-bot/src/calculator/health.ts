// bots/liquidation-bot/src/calculator/health.ts

export interface Loan {
  collateralAmount: bigint;
  outstandingDebt: bigint;
  penalties: bigint;
  lastPaymentTime: number;
  warningsIssued: number;
  lastWarningTime: number;
}

export interface HealthFactor {
  borrower: string;
  collateralAmount: bigint; // stRWA tokens
  collateralValue: bigint; // USDC value
  outstandingDebt: bigint; // USDC
  penalties: bigint; // USDC
  totalDebt: bigint; // outstanding + penalties
  healthFactor: number; // Decimal (1.5 = 150%)
  price: bigint; // stRWA price in USDC
  isHealthy: boolean;
  needsWarning: boolean;
  needsLiquidation: boolean;
}

export class HealthCalculator {
  async calculateHealth(
    borrower: string,
    loan: Loan,
    price: bigint,
    priceTimestamp: number,
  ): Promise<HealthFactor> {
    // Price has 6 decimals (USDC)
    // Collateral has 18 decimals (stRWA)
    // Need to normalize to same decimals

    // Handle price staleness
    const now = Date.now() / 1000;
    if (now - priceTimestamp > 24 * 3600) {
      throw new Error("Oracle price is stale, cannot calculate health");
    }

    // Collateral value in USDC (6 decimals)
    const collateralValue =
      (loan.collateralAmount * price) / 1_000_000_000_000_000_000n;

    // Total debt
    const totalDebt = loan.outstandingDebt + loan.penalties;

    // Health factor as decimal
    let healthFactor = 0;
    if (totalDebt > 0n) {
      // Convert to decimal with 2 decimal places
      healthFactor = Number((collateralValue * 100n) / totalDebt) / 100;
    } else {
      healthFactor = Infinity; // No debt = infinite health
    }

    // Handle very small amounts (dust)
    const MIN_DEBT = 1_000000n; // 1 USDC
    if (totalDebt < MIN_DEBT) {
      healthFactor = Infinity; // Dust is not worth liquidating
    }

    return {
      borrower,
      collateralAmount: loan.collateralAmount,
      collateralValue,
      outstandingDebt: loan.outstandingDebt,
      penalties: loan.penalties,
      totalDebt,
      healthFactor,
      price,
      isHealthy: healthFactor >= 1.5,
      needsWarning: healthFactor < 1.5 && healthFactor > 1.1,
      needsLiquidation: healthFactor <= 1.1,
    };
  }
}
