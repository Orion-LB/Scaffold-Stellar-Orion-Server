// bots/liquidation-bot/src/monitoring/metrics.ts

export interface MonitoringCycleResult {
    borrowersChecked: number;
    warningsIssued: number;
    liquidationsExecuted: number;
    errors: number;
    processingTime: number;
}

export interface LiquidationMetrics {
    // Monitoring stats
    totalCycles: number;
    borrowersChecked: number;
    averageCheckTime: number;          // ms per borrower
  
    // Warning stats
    totalWarningsIssued: number;
    warning1Count: number;
    warning2Count: number;
    warning3Count: number;
  
    // Liquidation stats
    totalLiquidations: number;
    successfulLiquidations: number;
    failedLiquidations: number;
  
    // Financial stats
    totalRewardsEarned: bigint;        // USDC
    totalGasSpent: bigint;             // USDC equivalent
    totalProfit: bigint;               // Rewards - Gas
    averageRewardPerLiquidation: bigint;
  
    // Health stats
    averageHealthFactor: number;
    lowestHealthFactor: number;
    lowestHealthBorrower: string;
  
    // Performance
    lastCycleTime: number;
    cyclesPerHour: number;
  }
  
  export class MetricsCollector {
    private metrics: LiquidationMetrics = {
      totalCycles: 0,
      borrowersChecked: 0,
      averageCheckTime: 0,
      totalWarningsIssued: 0,
      warning1Count: 0,
      warning2Count: 0,
      warning3Count: 0,
      totalLiquidations: 0,
      successfulLiquidations: 0,
      failedLiquidations: 0,
      totalRewardsEarned: 0n,
      totalGasSpent: 0n,
      totalProfit: 0n,
      averageRewardPerLiquidation: 0n,
      averageHealthFactor: 0,
      lowestHealthFactor: Infinity,
      lowestHealthBorrower: '',
      lastCycleTime: 0,
      cyclesPerHour: 0,
    };
    private startTime = Date.now() / 1000;
  
    recordMonitoringCycle(cycle: MonitoringCycleResult): void {
      this.metrics.totalCycles++;
      this.metrics.borrowersChecked += cycle.borrowersChecked;
      this.metrics.lastCycleTime = Date.now() / 1000;
  
      // Update average check time
      if (this.metrics.totalCycles > 0) {
        this.metrics.averageCheckTime =
            (this.metrics.averageCheckTime * (this.metrics.totalCycles - 1) +
            cycle.processingTime / cycle.borrowersChecked) /
            this.metrics.totalCycles;
      } else {
          this.metrics.averageCheckTime = cycle.processingTime / cycle.borrowersChecked;
      }
  
      // Update cycles per hour
      const hoursRunning = (Date.now() / 1000 - this.startTime) / 3600;
      if (hoursRunning > 0) {
        this.metrics.cyclesPerHour = this.metrics.totalCycles / hoursRunning;
      }
    }
  
    recordWarning(warningCount: number): void {
      this.metrics.totalWarningsIssued++;
  
      switch (warningCount) {
        case 1:
          this.metrics.warning1Count++;
          break;
        case 2:
          this.metrics.warning2Count++;
          break;
        case 3:
          this.metrics.warning3Count++;
          break;
      }
    }
  
    recordLiquidation(
      success: boolean,
      reward: bigint,
      gasCost: bigint
    ): void {
      this.metrics.totalLiquidations++;
  
      if (success) {
        this.metrics.successfulLiquidations++;
        this.metrics.totalRewardsEarned += reward;
        this.metrics.totalGasSpent += gasCost;
        this.metrics.totalProfit += reward - gasCost;
  
        // Update average reward
        if (this.metrics.successfulLiquidations > 0) {
            this.metrics.averageRewardPerLiquidation =
                this.metrics.totalRewardsEarned /
                BigInt(this.metrics.successfulLiquidations);
        }
      } else {
        this.metrics.failedLiquidations++;
        this.metrics.totalGasSpent += gasCost; // Still spent gas on failure
      }
    }
  
    recordHealthFactor(borrower: string, healthFactor: number): void {
      if (healthFactor < this.metrics.lowestHealthFactor) {
        this.metrics.lowestHealthFactor = healthFactor;
        this.metrics.lowestHealthBorrower = borrower;
      }
    }
  
    getMetrics(): LiquidationMetrics {
      return { ...this.metrics };
    }
  
    checkHealth(): void {
      // Check if bot is running regularly
      const now = Date.now() / 1000;
      const staleness = now - this.metrics.lastCycleTime;
  
      if (staleness > 60) {
        // 1 minute
        console.warn(
          `⚠️ Liquidation bot hasn't run in ${staleness}s`
        );
      }
  
      // Check success rate
      if (this.metrics.totalLiquidations > 0) {
        const successRate =
            this.metrics.successfulLiquidations /
            this.metrics.totalLiquidations;
    
        if (successRate < 0.95) {
            // 95% threshold
            console.warn(
            `⚠️ Liquidation success rate low: ${(successRate * 100).toFixed(1)}%`
            );
        }
      }
  
      // Check profitability
      if (this.metrics.totalLiquidations > 0 && this.metrics.successfulLiquidations > 0) {
        const averageProfit =
          this.metrics.totalProfit /
          BigInt(this.metrics.successfulLiquidations);
  
        if (averageProfit < 0n) {
          console.error('❌ Bot is losing money on liquidations!');
        }
      }
    }
  }
