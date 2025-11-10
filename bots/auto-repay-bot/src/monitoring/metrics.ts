// bots/auto-repay-bot/src/monitoring/metrics.ts
export interface AutoRepayMetrics {
  // Processing stats
  totalRepayments: number;
  successfulRepayments: number;
  failedRepayments: number;

  // Financial stats
  totalYieldProcessed: bigint;
  totalDebtRepaid: bigint;
  averageRepaymentAmount: bigint;

  // Performance stats
  averageProcessingTime: number; // ms
  lastProcessedLedger: number;
  lastProcessedTime: number;

  // Borrower stats
  activeBorrowers: number;
  eligibleBorrowers: number;
}

export class MetricsCollector {
  public metrics: AutoRepayMetrics = {
    totalRepayments: 0,
    successfulRepayments: 0,
    failedRepayments: 0,
    totalYieldProcessed: 0n,
    totalDebtRepaid: 0n,
    averageRepaymentAmount: 0n,
    averageProcessingTime: 0,
    lastProcessedLedger: 0,
    lastProcessedTime: 0,
    activeBorrowers: 0,
    eligibleBorrowers: 0,
  };

  recordRepayment(
    success: boolean,
    amount: bigint,
    processingTime: number,
  ): void {
    this.metrics.totalRepayments++;

    if (success) {
      this.metrics.successfulRepayments++;
      this.metrics.totalYieldProcessed += amount;
      this.metrics.totalDebtRepaid += amount;

      // Update average
      this.metrics.averageRepaymentAmount =
        this.metrics.totalDebtRepaid /
        BigInt(this.metrics.successfulRepayments);
    } else {
      this.metrics.failedRepayments++;
    }

    // Update processing time
    this.metrics.averageProcessingTime =
      (this.metrics.averageProcessingTime * (this.metrics.totalRepayments - 1) +
        processingTime) /
      this.metrics.totalRepayments;
  }

  getMetrics(): AutoRepayMetrics {
    return { ...this.metrics };
  }

  checkHealth(): void {
    // Check if bot is processing regularly
    const now = Date.now() / 1000;
    const staleness = now - this.metrics.lastProcessedTime;

    if (staleness > 600) {
      // 10 minutes
      console.warn(`⚠️ Auto-repay bot hasn't processed in ${staleness}s`);
    }

    // Check success rate
    const successRate =
      this.metrics.successfulRepayments /
      Math.max(this.metrics.totalRepayments, 1);

    if (successRate < 0.9) {
      // 90% threshold
      console.warn(
        `⚠️ Auto-repay success rate low: ${(successRate * 100).toFixed(1)}%`,
      );
    }
  }
}
