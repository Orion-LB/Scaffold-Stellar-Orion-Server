// bots/liquidation-bot/src/bot.ts
import { Logger } from "./monitoring/logger";
import { MetricsCollector, MonitoringCycleResult } from "./monitoring/metrics";
import { HealthCalculator } from "./calculator/health";
import { EconomicsCalculator } from "./calculator/economics";
import { WarningManager, WarningState } from "./manager/warning";
import { BorrowerRegistry } from "./manager/borrowers";
import { WarningExecutor } from "./executor/warning";
import { LiquidationExecutor, LiquidationResult } from "./executor/liquidation";
import { NetworkConfig } from "./config/network";
import { Loan } from "./calculator/health";

// Mock clients
class OracleClient {
  constructor(private config: NetworkConfig) {}
  async getPrice(asset: string): Promise<[bigint, number]> {
    return [1_000000n, Date.now() / 1000];
  }
}

class LendingPoolClient {
  constructor(private config: NetworkConfig) {}
  async getLoan(borrower: string): Promise<Loan | null> {
    return {
      collateralAmount: 200_000000000000000000n,
      outstandingDebt: 100_000000n,
      penalties: 0n,
      lastPaymentTime: 0,
      warningsIssued: 0,
      lastWarningTime: 0,
    };
  }
}

interface MonitoringResult {
  borrower: string;
  success: boolean;
  healthy: boolean;
  healthFactor: number;
  warningIssued?: boolean;
  warningState?: WarningState;
  liquidated?: boolean;
  reward?: bigint;
  txHash?: string;
  skippedUnprofitable?: boolean;
  error?: string;
}

export class LiquidationBot {
  public logger: Logger;
  public metrics: MetricsCollector;
  public healthCalculator: HealthCalculator;
  private economicsCalculator: EconomicsCalculator;
  private warningManager: WarningManager;
  private borrowerRegistry: BorrowerRegistry;
  private warningExecutor: WarningExecutor;
  private liquidationExecutor: LiquidationExecutor;
  public oracle: OracleClient;
  public lendingPool: LendingPoolClient;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(public config: NetworkConfig) {
    this.logger = new Logger("LiquidationBot");
    this.metrics = new MetricsCollector();
    this.healthCalculator = new HealthCalculator();
    this.economicsCalculator = new EconomicsCalculator();
    this.warningManager = new WarningManager();
    this.borrowerRegistry = new BorrowerRegistry(config);
    this.warningExecutor = new WarningExecutor(config);
    this.liquidationExecutor = new LiquidationExecutor(config);
    this.oracle = new OracleClient(config);
    this.lendingPool = new LendingPoolClient(config);
  }

  async start(): Promise<void> {
    this.logger.info("Starting Liquidation Bot...");
    await this.borrowerRegistry.load();
    this.startMonitoringLoop();
    this.startHealthCheck();
    this.logger.info("Liquidation Bot started successfully");
  }

  private startMonitoringLoop(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.monitorAllLoans();
    }, 15_000); // 15 seconds
    this.monitorAllLoans();
  }

  private async monitorAllLoans(): Promise<void> {
    const startTime = Date.now();
    try {
      const borrowers = await this.borrowerRegistry.getActiveBorrowers();
      this.logger.info("Monitoring loans", { count: borrowers.length });
      const [price, priceTimestamp] = await this.oracle.getPrice(
        this.config.stRwaTokenAddress,
      );

      const now = Date.now() / 1000;
      if (now - priceTimestamp > 24 * 3600) {
        this.logger.error("Oracle price is stale, skipping cycle");
        return;
      }

      const results: MonitoringResult[] = [];
      for (const borrower of borrowers) {
        try {
          const result = await this.monitorLoan(
            borrower,
            price,
            priceTimestamp,
          );
          results.push(result);
        } catch (error: any) {
          this.logger.error("Failed to monitor loan", {
            borrower,
            error: error.message,
          });
          results.push({
            borrower,
            success: false,
            error: error.message,
            healthy: false,
            healthFactor: 0,
          });
        }
      }

      const processingTime = Date.now() - startTime;
      this.metrics.recordMonitoringCycle({
        borrowersChecked: borrowers.length,
        warningsIssued: results.filter((r) => r.warningIssued).length,
        liquidationsExecuted: results.filter((r) => r.liquidated).length,
        errors: results.filter((r) => !r.success).length,
        processingTime,
      });

      this.logger.info("Monitoring cycle completed", {
        borrowers: borrowers.length,
        warnings: results.filter((r) => r.warningIssued).length,
        liquidations: results.filter((r) => r.liquidated).length,
        time: processingTime,
      });
    } catch (error: any) {
      this.logger.error("Monitoring cycle failed", { error: error.message });
    }
  }

  public async monitorLoan(
    borrower: string,
    price: bigint,
    priceTimestamp: number,
  ): Promise<MonitoringResult> {
    const loan = await this.lendingPool.getLoan(borrower);
    if (!loan) {
      return { borrower, success: true, healthy: true, healthFactor: Infinity };
    }

    const health = await this.healthCalculator.calculateHealth(
      borrower,
      loan,
      price,
      priceTimestamp,
    );
    this.metrics.recordHealthFactor(borrower, health.healthFactor);

    if (health.needsLiquidation) {
      const economics =
        await this.economicsCalculator.analyzeLiquidation(health);
      if (!economics.isProfitable) {
        this.logger.warn("Liquidation not profitable, skipping", {
          borrower,
          reward: economics.liquidatorReward.toString(),
          gasCost: economics.gasCost.toString(),
        });
        return {
          borrower,
          success: true,
          healthy: false,
          healthFactor: health.healthFactor,
          skippedUnprofitable: true,
        };
      }

      this.logger.warn("Executing liquidation", {
        borrower,
        healthFactor: health.healthFactor,
        reward: economics.liquidatorReward.toString(),
        profit: economics.profit.toString(),
      });

      const liquidationResult =
        await this.liquidationExecutor.liquidateLoan(borrower);
      this.metrics.recordLiquidation(
        liquidationResult.success,
        liquidationResult.reward,
        economics.gasCost,
      );
      return {
        ...liquidationResult,
        healthy: false,
        healthFactor: health.healthFactor,
        liquidated: true,
      };
    }

    const currentTime = Date.now() / 1000;
    const warningState = this.warningManager.determineWarningState(
      health,
      loan,
      currentTime,
    );
    if (
      this.warningManager.shouldIssueWarning(warningState, loan, currentTime)
    ) {
      this.logger.warn("Issuing warning", {
        borrower,
        warningState,
        healthFactor: health.healthFactor,
        warningsIssued: loan.warningsIssued,
      });
      const txHash = await this.warningExecutor.issueWarning(borrower);
      this.metrics.recordWarning(loan.warningsIssued + 1);
      return {
        borrower,
        success: true,
        healthy: false,
        healthFactor: health.healthFactor,
        warningIssued: true,
        warningState,
        txHash,
      };
    }

    return {
      borrower,
      success: true,
      healthy: true,
      healthFactor: health.healthFactor,
    };
  }

  private startHealthCheck(): void {
    setInterval(() => {
      this.metrics.checkHealth();
    }, 60_000); // Every minute
  }

  async stop(): Promise<void> {
    this.logger.info("Stopping Liquidation Bot...");
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.logger.info("Liquidation Bot stopped");
  }
}
