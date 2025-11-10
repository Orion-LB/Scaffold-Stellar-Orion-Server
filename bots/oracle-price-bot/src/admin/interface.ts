// bots/oracle-price-bot/src/admin/interface.ts
import { Logger } from "../monitoring/logger";
import { TransactionManager } from "../blockchain/transaction";
import { DATA_SOURCES, DataSource } from "../config/sources";
import { BotMetrics } from "../monitoring/metrics";
import { Alert } from "../monitoring/alerts";

export interface BotStatus {
  running: boolean;
  lastUpdate: number;
  metrics: BotMetrics;
  alerts: Alert[];
}

export class AdminInterface {
  private paused = false;
  private logger = new Logger("AdminInterface");

  constructor(
    private txManager: TransactionManager,
    private metrics: BotMetrics,
    private alerts: Alert[],
  ) {}

  // Manual price update (emergency override)
  async forceUpdatePrice(
    asset: string,
    price: number,
    adminKey: string,
  ): Promise<void> {
    if (!this.verifyAdminKey(adminKey)) {
      throw new Error("Unauthorized");
    }

    await this.txManager.submitPrice(asset, price, Date.now() / 1000);
    this.logger.info("Admin forced price update", { asset, price });
  }

  // Pause bot (emergency stop)
  async pauseBot(adminKey: string): Promise<void> {
    if (!this.verifyAdminKey(adminKey)) {
      throw new Error("Unauthorized");
    }

    this.paused = true;
    this.logger.warn("Bot paused by admin");
  }

  // Resume bot
  async resumeBot(adminKey: string): Promise<void> {
    if (!this.verifyAdminKey(adminKey)) {
      throw new Error("Unauthorized");
    }

    this.paused = false;
    this.logger.info("Bot resumed by admin");
  }

  // Update data source configuration
  async updateDataSource(
    asset: string,
    sourceName: string,
    config: Partial<DataSource>,
    adminKey: string,
  ): Promise<void> {
    if (!this.verifyAdminKey(adminKey)) {
      throw new Error("Unauthorized");
    }

    // Update configuration
    const sources = DATA_SOURCES[asset];
    const index = sources.findIndex((s) => s.name === sourceName);

    if (index >= 0) {
      sources[index] = { ...sources[index], ...config };
      this.logger.info("Data source updated", { asset, sourceName, config });
    }
  }

  // Get current status
  async getStatus(): Promise<BotStatus> {
    return {
      running: !this.paused,
      lastUpdate: this.metrics.lastUpdateTimestamp,
      metrics: this.metrics,
      alerts: this.alerts.slice(-10), // Last 10 alerts
    };
  }

  private verifyAdminKey(adminKey: string): boolean {
    // In a real implementation, this would be a more secure check
    return adminKey === "mysecretadminkey";
  }

  isPaused(): boolean {
    return this.paused;
  }
}
