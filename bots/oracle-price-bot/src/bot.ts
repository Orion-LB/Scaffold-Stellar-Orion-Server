// src/bot.ts
import { Logger } from './monitoring/logger';
import { MetricsCollector } from './monitoring/metrics';
import { AlertService } from './monitoring/alerts';
import { PriceFetcher } from './fetcher/base';
import { PriceAggregator } from './processor/aggregator';
import { PriceValidator } from './processor/validator';
import { PriceSmoother, SmoothingConfig } from './processor/smoother';
import { TransactionManager } from './blockchain/transaction';
import { NetworkConfig } from './config/network';
import { DATA_SOURCES, DataSource } from './config/sources';
import { VALIDATION_CONFIG, ValidationConfig } from './config/validation';
import { ChainlinkFetcher } from './fetcher/chainlink';
import { FranklinTempletonFetcher } from './fetcher/franklin';

export interface BotConfig {
    dataSources: Record<string, DataSource[]>;
    validation: Record<string, ValidationConfig>;
    smoothing: SmoothingConfig;
    schedule: any;
    alerting?: any;
}

function createFetcher(source: DataSource): PriceFetcher {
    switch (source.type) {
        case 'chainlink':
            return new ChainlinkFetcher(source);
        case 'api':
            if (source.name.includes('Franklin')) {
                return new FranklinTempletonFetcher(source);
            }
            // Add other api fetchers here
            throw new Error(`Unsupported API fetcher: ${source.name}`);
        default:
            throw new Error(`Unsupported fetcher type: ${source.type}`);
    }
}


export class OraclePriceBot {
  private logger: Logger;
  private metrics: MetricsCollector;
  private alerts: AlertService;
  private paused: boolean = false;

  private fetchers: Map<string, PriceFetcher[]> = new Map();
  private aggregator: PriceAggregator;
  private validator: PriceValidator;
  private smoother: PriceSmoother;
  private txManager: TransactionManager;

  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private config: BotConfig,
    private networkConfig: NetworkConfig
  ) {
    this.logger = new Logger('OraclePriceBot');
    this.metrics = new MetricsCollector();
    this.alerts = new AlertService(config.alerting);

    this.aggregator = new PriceAggregator();
    this.validator = new PriceValidator();
    this.smoother = new PriceSmoother();
    this.txManager = new TransactionManager(networkConfig);

    this.initializeFetchers();
  }

  private initializeFetchers(): void {
    for (const [asset, sources] of Object.entries(this.config.dataSources)) {
      const fetchers = sources.map(source => {
        return createFetcher(source);
      });
      this.fetchers.set(asset, fetchers);
    }
  }

  async start(): Promise<void> {
    this.logger.info('Starting Oracle Price Bot...');

    for (const asset of Object.keys(this.config.dataSources)) {
      await this.startAssetUpdates(asset);
    }

    // Start monitoring
    this.startHealthCheck();

    this.logger.info('Oracle Price Bot started successfully');
  }

  private async startAssetUpdates(asset: string): Promise<void> {
    const schedule = this.config.schedule;

    // Time-based updates
    if (schedule.timeBased.enabled) {
      const interval = setInterval(
        () => this.updateAssetPrice(asset),
        schedule.timeBased.intervalSeconds * 1000
      );
      this.updateIntervals.set(asset, interval);
    }

    // Event-based updates (price change threshold)
    if (schedule.eventBased.enabled) {
      setInterval(
        () => this.checkPriceChange(asset),
        schedule.eventBased.checkIntervalSeconds * 1000
      );
    }

    // Initial update
    await this.updateAssetPrice(asset);
  }

  public async updateAssetPrice(asset: string): Promise<void> {
    if (this.paused) {
      this.logger.debug('Bot is paused, skipping update');
      return;
    }

    const startTime = Date.now();

    try {
      // 1. Fetch prices from all sources
      const fetchers = this.fetchers.get(asset)!;
      const pricePromises = fetchers.map(async (f) => {
        const fetchStartTime = Date.now();
        try {
            const price = await f.fetchPrice(asset);
            const fetchEndTime = Date.now();
            return {
                price,
                sourceName: f.getName(),
                weight: f.getWeight(),
                responseTime: fetchEndTime - fetchStartTime,
                status: 'fulfilled' as const,
            };
        } catch (error) {
            return {
                sourceName: f.getName(),
                status: 'rejected' as const,
                reason: error,
            };
        }
      });
      const results = await Promise.all(pricePromises);

      const prices: number[] = [];
      const weights: number[] = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          prices.push(result.price);
          weights.push(result.weight);
          this.metrics.recordSourceSuccess(asset, result.sourceName, result.responseTime);
        } else {
          this.logger.warn(`Source ${result.sourceName} failed`, {
            error: result.reason,
          });
          this.metrics.recordSourceFailure(asset, result.sourceName);
        }
      }

      // 2. Validate minimum sources
      if (prices.length < this.config.validation[asset].minSources) {
        throw new Error(
          `Insufficient price sources: ${prices.length} < ${this.config.validation[asset].minSources}`
        );
      }

      // 3. Aggregate prices
      const aggregatedPrice = this.aggregator.aggregate(prices, weights);

      // 4. Validate price
      const lastPrice = this.metrics.getLastPrice(asset);
      this.validator.validate(asset, aggregatedPrice, lastPrice);

      // 5. Smooth price
      const smoothedPrice = this.smoother.smooth(
        asset,
        aggregatedPrice,
        this.config.smoothing
      );

      // 6. Submit to blockchain
      const timestamp = Math.floor(Date.now() / 1000);
      const txHash = await this.txManager.submitPrice(
        asset,
        smoothedPrice,
        timestamp
      );

      // 7. Record metrics
      const latency = Date.now() - startTime;
      this.metrics.recordUpdate(asset, smoothedPrice, latency, true);

      this.logger.info('Price updated successfully', {
        asset,
        price: smoothedPrice,
        txHash,
        latency,
      });

    } catch (error: any) {
      this.logger.error('Price update failed', { asset, error: error.message });
      this.metrics.recordUpdate(asset, 0, Date.now() - startTime, false);

      this.alerts.send({
        severity: 'critical',
        message: `Price update failed for ${asset}`,
        timestamp: new Date(),
        metadata: { error: error.message },
      });
    }
  }

  private async checkPriceChange(asset: string): Promise<void> {
    const fetchers = this.fetchers.get(asset)!;
    const mainFetcher = fetchers[0]; // Use highest priority source

    try {
      const currentPrice = await mainFetcher.fetchPrice(asset);
      const lastPrice = this.metrics.getLastPrice(asset);

      if (!lastPrice) return;

      const changePercent = Math.abs((currentPrice - lastPrice) / lastPrice) * 100;

      if (changePercent >= this.config.schedule.eventBased.priceChangeThreshold) {
        this.logger.info('Price change threshold exceeded, triggering update', {
          asset,
          changePercent,
        });
        await this.updateAssetPrice(asset);
      }
    } catch (error: any) {
      this.logger.error('Price change check failed', { asset, error: error.message });
    }
  }

  private startHealthCheck(): void {
    setInterval(() => {
      this.metrics.checkHealth();
      this.alerts.checkHealth();
    }, 60000); // Every minute
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping Oracle Price Bot...');

    for (const interval of this.updateIntervals.values()) {
      clearInterval(interval);
    }

    this.updateIntervals.clear();
    this.logger.info('Oracle Price Bot stopped');
  }
}
