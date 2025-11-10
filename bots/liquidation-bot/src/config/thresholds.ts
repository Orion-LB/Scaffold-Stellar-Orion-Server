// bots/liquidation-bot/src/config/thresholds.ts
export interface WarningConfig {
  warning1Threshold: number; // 1.5 (150% health)
  warning2Threshold: number; // 1.2 (120% health)
  warning3Threshold: number; // 1.1 (110% health) - final warning
  liquidationThreshold: number; // 1.1 (110% health)

  timeBetweenWarnings: number; // 2 weeks (1,209,600 seconds)
  penaltyPercent: number; // 2% of outstanding debt
}

export const WARNING_CONFIG: WarningConfig = {
  warning1Threshold: 1.5,
  warning2Threshold: 1.2,
  warning3Threshold: 1.1,
  liquidationThreshold: 1.1,
  timeBetweenWarnings: 14 * 24 * 3600, // 2 weeks
  penaltyPercent: 2, // 2%
};
