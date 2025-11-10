// bots/liquidation-bot/src/calculator/economics.ts
import { HealthFactor } from "./health";

export interface LiquidationEconomics {
  collateralValue: bigint; // USDC value of collateral
  liquidatorReward: bigint; // 10% of collateral value
  gasCost: bigint; // Estimated gas cost
  profit: bigint; // Reward - gas
  isProfitable: boolean;
}

export class EconomicsCalculator {
  async analyzeLiquidation(
    health: HealthFactor,
  ): Promise<LiquidationEconomics> {
    // Calculate reward (10% of collateral value)
    const liquidatorReward = (health.collateralValue * 10n) / 100n;

    // Estimate gas cost
    // Simplified - would need actual gas estimation
    const gasCost = 5_000000n; // Assume 5 USDC gas cost

    // Calculate profit
    const profit = liquidatorReward - gasCost;

    return {
      collateralValue: health.collateralValue,
      liquidatorReward,
      gasCost,
      profit,
      isProfitable: profit > 0n,
    };
  }

  shouldLiquidate(economics: LiquidationEconomics): boolean {
    // Only liquidate if profitable
    // Add minimum profit threshold
    const MIN_PROFIT = 1_000000n; // 1 USDC minimum profit

    return economics.profit >= MIN_PROFIT;
  }
}
