# 🔮 Oracle Price Bot - Technical Specification

## Overview

The Oracle Price Bot is a critical infrastructure component that maintains real-time pricing data for RWA (Real-World Asset) tokens in the Stellar Lending Protocol. It fetches prices from external data sources and submits them to the on-chain Oracle contract, enabling accurate collateral valuation and loan health monitoring.

## Architecture

```
┌─────────────────┐
│  Data Sources   │
│  - Chainlink    │
│  - Franklin T.  │
│  - Ondo Finance │
│  - Backed.fi    │
│  - Custom APIs  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Price Fetcher  │
│  - Multi-source │
│  - Aggregation  │
│  - Validation   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Price Processor │
│  - Smoothing    │
│  - Sanity Check │
│  - Formatting   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Transaction Mgr │
│  - Build TX     │
│  - Sign TX      │
│  - Submit TX    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Oracle Contract │
│  (On-chain)     │
└─────────────────┘
```

## Core Features

### 1. Multi-Source Price Fetching

**Feature**: Fetch prices from multiple data providers for redundancy and accuracy.

**Capabilities**:

- Support 5+ data sources per asset
- Parallel fetching for performance
- Source priority/weighting system
- Automatic failover on source unavailability
- Source health monitoring

**Data Sources**:

```typescript
interface DataSource {
  name: string;
  type: "chainlink" | "api" | "oracle" | "custom";
  url: string;
  apiKey?: string;
  weight: number; // 0-100, used in weighted average
  priority: number; // Lower = higher priority for failover
  timeout: number; // ms
  retries: number;
}

const DATA_SOURCES: Record<string, DataSource[]> = {
  TBILL_TOKEN: [
    {
      name: "Franklin Templeton API",
      type: "api",
      url: "https://api.franklintempleton.com/tbill/price",
      weight: 40,
      priority: 1,
      timeout: 5000,
      retries: 3,
    },
    {
      name: "Chainlink RWA Feed",
      type: "chainlink",
      url: "https://rwa-oracle.chain.link/tbill",
      weight: 30,
      priority: 2,
      timeout: 5000,
      retries: 3,
    },
    {
      name: "Ondo Finance",
      type: "api",
      url: "https://api.ondo.finance/ousg/nav",
      weight: 30,
      priority: 3,
      timeout: 5000,
      retries: 2,
    },
  ],
};
```

### 2. Price Aggregation & Validation

**Feature**: Aggregate prices from multiple sources with outlier detection.

**Algorithms**:

- Weighted average (default)
- Median (outlier resistant)
- Trimmed mean (remove top/bottom 20%)

**Validation Rules**:

```typescript
interface ValidationConfig {
  maxDeviationPercent: number; // Max deviation from median (e.g., 5%)
  minSources: number; // Minimum sources required (e.g., 2)
  maxStaleness: number; // Max age of price data (seconds)
  minPrice: number; // Sanity check: minimum valid price
  maxPrice: number; // Sanity check: maximum valid price
  maxChangePercent: number; // Max % change from last price (e.g., 10%)
}

const VALIDATION_CONFIG: Record<string, ValidationConfig> = {
  TBILL_TOKEN: {
    maxDeviationPercent: 3.0,
    minSources: 2,
    maxStaleness: 3600, // 1 hour
    minPrice: 0.95, // $0.95 (T-Bills shouldn't drop below par)
    maxPrice: 1.1, // $1.10
    maxChangePercent: 2.0, // 2% max change per update
  },
};
```

**Outlier Detection**:

```typescript
function detectOutliers(prices: number[]): number[] {
  const median = calculateMedian(prices);
  const maxDeviation = VALIDATION_CONFIG[asset].maxDeviationPercent / 100;

  return prices.filter((price) => {
    const deviation = Math.abs(price - median) / median;
    return deviation <= maxDeviation;
  });
}
```

### 3. Price Smoothing

**Feature**: Apply exponential moving average to reduce volatility and manipulation.

**Implementation**:

```typescript
interface SmoothingConfig {
  enabled: boolean;
  alpha: number; // Smoothing factor (0-1), higher = less smoothing
  windowSize: number; // Number of historical prices to consider
}

class PriceSmoother {
  private history: Map<string, number[]> = new Map();

  smooth(asset: string, rawPrice: number, config: SmoothingConfig): number {
    if (!config.enabled) return rawPrice;

    const history = this.history.get(asset) || [];
    history.push(rawPrice);

    // Keep only windowSize prices
    if (history.length > config.windowSize) {
      history.shift();
    }

    // Exponential Moving Average
    const ema = history.reduce((acc, price, i) => {
      const weight = Math.pow(config.alpha, history.length - 1 - i);
      return acc + price * weight;
    }, 0);

    const totalWeight = history.reduce((acc, _, i) => {
      return acc + Math.pow(config.alpha, history.length - 1 - i);
    }, 0);

    this.history.set(asset, history);
    return ema / totalWeight;
  }
}
```

### 4. On-Chain Submission

**Feature**: Build, sign, and submit price updates to the Oracle contract.

**Transaction Building**:

```typescript
async function submitPrice(
  asset: Address,
  price: number,
  timestamp: number,
): Promise<string> {
  const priceScaled = BigInt(Math.round(price * 1_000_000)); // 6 decimals

  const args = [
    StellarSdk.nativeToScVal(asset, "address"),
    StellarSdk.nativeToScVal(priceScaled, "i128"),
    StellarSdk.nativeToScVal(timestamp, "u64"),
    StellarSdk.nativeToScVal(botAddress, "address"),
  ];

  const tx = await buildTransaction(
    server,
    botAddress,
    oracleContractId,
    "set_price",
    args,
  );

  const signedTx = await signTransaction(tx);
  const result = await submitTransaction(server, signedTx);

  return result.hash;
}
```

**Gas Optimization**:

- Batch multiple asset updates in single transaction when possible
- Implement adaptive gas pricing based on network congestion
- Skip updates if price change < threshold (e.g., 0.1%)

### 5. Update Scheduling

**Feature**: Flexible scheduling system with multiple trigger types.

**Triggers**:

```typescript
interface UpdateSchedule {
  timeBased: {
    enabled: boolean;
    intervalSeconds: number; // Default: 60s
    alignToMinute?: boolean; // Align updates to minute boundaries
  };

  eventBased: {
    enabled: boolean;
    priceChangeThreshold: number; // Update if price changes by X%
    checkIntervalSeconds: number; // How often to check for changes
  };

  manual: {
    enabled: boolean;
    webhookUrl?: string; // Webhook for manual triggers
    adminAddresses: string[]; // Addresses that can trigger updates
  };
}

const SCHEDULE_CONFIG: UpdateSchedule = {
  timeBased: {
    enabled: true,
    intervalSeconds: 60,
    alignToMinute: true,
  },

  eventBased: {
    enabled: true,
    priceChangeThreshold: 0.5, // 0.5% change triggers update
    checkIntervalSeconds: 30,
  },

  manual: {
    enabled: true,
    webhookUrl: "https://bot.orion.com/oracle/trigger",
    adminAddresses: [process.env.ADMIN_ADDRESS!],
  },
};
```

### 6. Error Handling & Retry Logic

**Feature**: Robust error handling with exponential backoff.

**Retry Strategy**:

```typescript
interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
  retryableErrors: string[]; // Error codes/messages to retry
}

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      const isRetryable = config.retryableErrors.some((msg) =>
        error.message.includes(msg),
      );

      if (!isRetryable || attempt === config.maxRetries) {
        throw error;
      }

      // Exponential backoff
      const delay = Math.min(
        config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelay,
      );

      logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
        error: error.message,
      });

      await sleep(delay);
    }
  }

  throw lastError!;
}

const RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    "Network request failed",
    "timeout",
    "ECONNRESET",
    "Transaction simulation failed",
  ],
};
```

### 7. Monitoring & Alerting

**Feature**: Comprehensive monitoring with alerting for anomalies.

**Metrics**:

```typescript
interface BotMetrics {
  // Performance
  successfulUpdates: number;
  failedUpdates: number;
  averageLatency: number; // ms from fetch to on-chain confirmation

  // Price data
  lastPrice: number;
  priceChangeLast1h: number; // %
  priceChangeLast24h: number; // %

  // Data sources
  sourceHealthMap: Map<
    string,
    {
      successRate: number; // %
      averageResponseTime: number; // ms
      lastFailure: Date | null;
    }
  >;

  // Blockchain
  transactionSuccessRate: number; // %
  averageGasUsed: number;
  lastUpdateTimestamp: number;
}

interface Alert {
  severity: "info" | "warning" | "critical";
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class MonitoringService {
  private metrics: BotMetrics;
  private alerts: Alert[] = [];

  checkHealth(): void {
    // Check staleness
    const now = Date.now() / 1000;
    const staleness = now - this.metrics.lastUpdateTimestamp;

    if (staleness > 300) {
      // 5 minutes
      this.alert({
        severity: "critical",
        message: "Oracle update is stale",
        timestamp: new Date(),
        metadata: { stalenessSeconds: staleness },
      });
    }

    // Check price volatility
    if (Math.abs(this.metrics.priceChangeLast1h) > 5) {
      this.alert({
        severity: "warning",
        message: "High price volatility detected",
        timestamp: new Date(),
        metadata: { changePercent: this.metrics.priceChangeLast1h },
      });
    }

    // Check data source health
    for (const [source, health] of this.metrics.sourceHealthMap) {
      if (health.successRate < 0.8) {
        // 80% threshold
        this.alert({
          severity: "warning",
          message: `Data source unhealthy: ${source}`,
          timestamp: new Date(),
          metadata: { source, successRate: health.successRate },
        });
      }
    }
  }

  private alert(alert: Alert): void {
    this.alerts.push(alert);

    // Send to external monitoring (Slack, PagerDuty, etc.)
    if (alert.severity === "critical") {
      this.sendToSlack(alert);
      this.sendToPagerDuty(alert);
    }

    logger.log(alert.severity, alert.message, alert.metadata);
  }
}
```

### 8. Admin Controls

**Feature**: Admin interface for manual overrides and configuration.

**Admin Functions**:

```typescript
class AdminInterface {
  // Manual price update (emergency override)
  async forceUpdatePrice(
    asset: string,
    price: number,
    adminKey: string,
  ): Promise<void> {
    if (!this.verifyAdminKey(adminKey)) {
      throw new Error("Unauthorized");
    }

    await submitPrice(asset, price, Date.now() / 1000);
    logger.info("Admin forced price update", { asset, price });
  }

  // Pause bot (emergency stop)
  async pauseBot(adminKey: string): Promise<void> {
    if (!this.verifyAdminKey(adminKey)) {
      throw new Error("Unauthorized");
    }

    this.paused = true;
    logger.warn("Bot paused by admin");
  }

  // Resume bot
  async resumeBot(adminKey: string): Promise<void> {
    if (!this.verifyAdminKey(adminKey)) {
      throw new Error("Unauthorized");
    }

    this.paused = false;
    logger.info("Bot resumed by admin");
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
      logger.info("Data source updated", { asset, sourceName, config });
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
}
```

## Implementation

### File Structure

```
bots/
├── oracle-price-bot/
│   ├── src/
│   │   ├── index.ts              # Main entry point
│   │   ├── bot.ts                # OraclePriceBot class
│   │   ├── fetcher/
│   │   │   ├── base.ts           # BaseFetcher interface
│   │   │   ├── chainlink.ts      # Chainlink data source
│   │   │   ├── franklin.ts       # Franklin Templeton API
│   │   │   ├── ondo.ts           # Ondo Finance API
│   │   │   ├── backed.ts         # Backed Finance API
│   │   │   └── custom.ts         # Custom API implementation
│   │   ├── processor/
│   │   │   ├── aggregator.ts     # Price aggregation logic
│   │   │   ├── validator.ts      # Price validation
│   │   │   └── smoother.ts       # Price smoothing (EMA)
│   │   ├── blockchain/
│   │   │   ├── transaction.ts    # Transaction building
│   │   │   ├── signer.ts         # Transaction signing
│   │   │   └── submitter.ts      # Transaction submission
│   │   ├── monitoring/
│   │   │   ├── metrics.ts        # Metrics collection
│   │   │   ├── logger.ts         # Logging service
│   │   │   └── alerts.ts         # Alert system
│   │   ├── admin/
│   │   │   ├── interface.ts      # Admin controls
│   │   │   └── api.ts            # Admin REST API
│   │   └── config/
│   │       ├── sources.ts        # Data source configs
│   │       ├── validation.ts     # Validation configs
│   │       └── network.ts        # Network configs
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── fetcher.test.ts
│   │   │   ├── aggregator.test.ts
│   │   │   ├── validator.test.ts
│   │   │   └── smoother.test.ts
│   │   ├── integration/
│   │   │   ├── end-to-end.test.ts
│   │   │   └── contract.test.ts
│   │   └── mocks/
│   │       ├── data-sources.ts
│   │       └── stellar.ts
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
```

### Main Bot Class

```typescript
// src/bot.ts
import { Logger } from "./monitoring/logger";
import { MetricsCollector } from "./monitoring/metrics";
import { AlertService } from "./monitoring/alerts";
import { PriceFetcher } from "./fetcher/base";
import { PriceAggregator } from "./processor/aggregator";
import { PriceValidator } from "./processor/validator";
import { PriceSmoother } from "./processor/smoother";
import { TransactionManager } from "./blockchain/transaction";

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
    private networkConfig: NetworkConfig,
  ) {
    this.logger = new Logger("OraclePriceBot");
    this.metrics = new MetricsCollector();
    this.alerts = new AlertService(config.alerting);

    this.aggregator = new PriceAggregator();
    this.validator = new PriceValidator(config.validation);
    this.smoother = new PriceSmoother();
    this.txManager = new TransactionManager(networkConfig);

    this.initializeFetchers();
  }

  private initializeFetchers(): void {
    for (const [asset, sources] of Object.entries(this.config.dataSources)) {
      const fetchers = sources.map((source) => {
        return createFetcher(source);
      });
      this.fetchers.set(asset, fetchers);
    }
  }

  async start(): Promise<void> {
    this.logger.info("Starting Oracle Price Bot...");

    for (const asset of Object.keys(this.config.dataSources)) {
      await this.startAssetUpdates(asset);
    }

    // Start monitoring
    this.startHealthCheck();

    this.logger.info("Oracle Price Bot started successfully");
  }

  private async startAssetUpdates(asset: string): Promise<void> {
    const schedule = this.config.schedule;

    // Time-based updates
    if (schedule.timeBased.enabled) {
      const interval = setInterval(
        () => this.updateAssetPrice(asset),
        schedule.timeBased.intervalSeconds * 1000,
      );
      this.updateIntervals.set(asset, interval);
    }

    // Event-based updates (price change threshold)
    if (schedule.eventBased.enabled) {
      setInterval(
        () => this.checkPriceChange(asset),
        schedule.eventBased.checkIntervalSeconds * 1000,
      );
    }

    // Initial update
    await this.updateAssetPrice(asset);
  }

  private async updateAssetPrice(asset: string): Promise<void> {
    if (this.paused) {
      this.logger.debug("Bot is paused, skipping update");
      return;
    }

    const startTime = Date.now();

    try {
      // 1. Fetch prices from all sources
      const fetchers = this.fetchers.get(asset)!;
      const pricePromises = fetchers.map((f) => f.fetchPrice(asset));
      const results = await Promise.allSettled(pricePromises);

      const prices: number[] = [];
      const weights: number[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === "fulfilled") {
          prices.push(result.value);
          weights.push(fetchers[i].getWeight());
          this.metrics.recordSourceSuccess(fetchers[i].getName());
        } else {
          this.logger.warn(`Source ${fetchers[i].getName()} failed`, {
            error: result.reason,
          });
          this.metrics.recordSourceFailure(fetchers[i].getName());
        }
      }

      // 2. Validate minimum sources
      if (prices.length < this.config.validation[asset].minSources) {
        throw new Error(
          `Insufficient price sources: ${prices.length} < ${this.config.validation[asset].minSources}`,
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
        this.config.smoothing,
      );

      // 6. Submit to blockchain
      const timestamp = Math.floor(Date.now() / 1000);
      const txHash = await this.txManager.submitPrice(
        asset,
        smoothedPrice,
        timestamp,
      );

      // 7. Record metrics
      const latency = Date.now() - startTime;
      this.metrics.recordUpdate(asset, smoothedPrice, latency, true);

      this.logger.info("Price updated successfully", {
        asset,
        price: smoothedPrice,
        txHash,
        latency,
      });
    } catch (error: any) {
      this.logger.error("Price update failed", { asset, error: error.message });
      this.metrics.recordUpdate(asset, 0, Date.now() - startTime, false);

      this.alerts.send({
        severity: "critical",
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

      const changePercent =
        Math.abs((currentPrice - lastPrice) / lastPrice) * 100;

      if (
        changePercent >= this.config.schedule.eventBased.priceChangeThreshold
      ) {
        this.logger.info("Price change threshold exceeded, triggering update", {
          asset,
          changePercent,
        });
        await this.updateAssetPrice(asset);
      }
    } catch (error: any) {
      this.logger.error("Price change check failed", {
        asset,
        error: error.message,
      });
    }
  }

  private startHealthCheck(): void {
    setInterval(() => {
      this.metrics.checkHealth();
      this.alerts.checkHealth();
    }, 60000); // Every minute
  }

  async stop(): Promise<void> {
    this.logger.info("Stopping Oracle Price Bot...");

    for (const interval of this.updateIntervals.values()) {
      clearInterval(interval);
    }

    this.updateIntervals.clear();
    this.logger.info("Oracle Price Bot stopped");
  }
}
```

### Price Fetcher Interface

```typescript
// src/fetcher/base.ts
export interface PriceFetchResult {
  price: number;
  timestamp: number;
  source: string;
}

export abstract class PriceFetcher {
  constructor(protected config: DataSource) {}

  abstract fetchPrice(asset: string): Promise<number>;

  getName(): string {
    return this.config.name;
  }

  getWeight(): number {
    return this.config.weight;
  }

  protected async fetchWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number,
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), timeout),
      ),
    ]);
  }
}

// src/fetcher/chainlink.ts
export class ChainlinkFetcher extends PriceFetcher {
  async fetchPrice(asset: string): Promise<number> {
    const response = await this.fetchWithTimeout(
      () => fetch(this.config.url),
      this.config.timeout,
    );

    const data = await response.json();
    return parseFloat(data.answer) / 1e8; // Chainlink uses 8 decimals
  }
}

// src/fetcher/franklin.ts
export class FranklinTempletonFetcher extends PriceFetcher {
  async fetchPrice(asset: string): Promise<number> {
    const response = await this.fetchWithTimeout(
      () =>
        fetch(this.config.url, {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        }),
      this.config.timeout,
    );

    const data = await response.json();
    return parseFloat(data.nav); // Net Asset Value
  }
}
```

### Price Aggregator

```typescript
// src/processor/aggregator.ts
export class PriceAggregator {
  aggregate(prices: number[], weights: number[]): number {
    if (prices.length === 0) {
      throw new Error("No prices to aggregate");
    }

    if (prices.length === 1) {
      return prices[0];
    }

    // Weighted average
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const weightedSum = prices.reduce(
      (sum, price, i) => sum + price * weights[i],
      0,
    );

    return weightedSum / totalWeight;
  }

  median(prices: number[]): number {
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }

    return sorted[mid];
  }

  trimmedMean(prices: number[], trimPercent: number = 20): number {
    const sorted = [...prices].sort((a, b) => a - b);
    const trimCount = Math.floor(prices.length * (trimPercent / 100));

    const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
    return trimmed.reduce((sum, p) => sum + p, 0) / trimmed.length;
  }
}
```

### Transaction Manager

```typescript
// src/blockchain/transaction.ts
import * as StellarSdk from "@stellar/stellar-sdk";

export class TransactionManager {
  private server: StellarSdk.SorobanRpc.Server;
  private keypair: StellarSdk.Keypair;

  constructor(private config: NetworkConfig) {
    this.server = new StellarSdk.SorobanRpc.Server(config.rpcUrl);
    this.keypair = StellarSdk.Keypair.fromSecret(config.botSecretKey);
  }

  async submitPrice(
    assetAddress: string,
    price: number,
    timestamp: number,
  ): Promise<string> {
    const priceScaled = BigInt(Math.round(price * 1_000_000)); // 6 decimals
    const botAddress = this.keypair.publicKey();

    const args = [
      StellarSdk.nativeToScVal(assetAddress, "address"),
      StellarSdk.nativeToScVal(priceScaled, "i128"),
      StellarSdk.nativeToScVal(timestamp, "u64"),
      StellarSdk.nativeToScVal(botAddress, "address"),
    ];

    const account = await this.server.getAccount(botAddress);
    const contract = new StellarSdk.Contract(this.config.oracleContractId);

    let transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(contract.call("set_price", ...args))
      .setTimeout(30)
      .build();

    // Simulate
    const simulated = await this.server.simulateTransaction(transaction);

    if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      throw new Error(`Simulation failed: ${JSON.stringify(simulated)}`);
    }

    // Assemble
    transaction = StellarSdk.SorobanRpc.assembleTransaction(
      transaction,
      simulated,
    ).build();

    // Sign
    transaction.sign(this.keypair);

    // Submit
    const response = await this.server.sendTransaction(transaction);

    // Poll for confirmation
    let result = await this.server.getTransaction(response.hash);
    let attempts = 0;

    while (result.status === "NOT_FOUND" && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      result = await this.server.getTransaction(response.hash);
      attempts++;
    }

    if (result.status !== "SUCCESS") {
      throw new Error(`Transaction failed: ${result.status}`);
    }

    return response.hash;
  }
}
```

## Testing Strategy

### Unit Tests

**1. Price Fetcher Tests**

```typescript
// tests/unit/fetcher.test.ts
describe("ChainlinkFetcher", () => {
  let fetcher: ChainlinkFetcher;

  beforeEach(() => {
    fetcher = new ChainlinkFetcher({
      name: "Chainlink Test",
      type: "chainlink",
      url: "https://mock.chainlink.com",
      weight: 50,
      priority: 1,
      timeout: 5000,
      retries: 3,
    });
  });

  it("should fetch price successfully", async () => {
    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ answer: "100000000" }), // $1.00 with 8 decimals
    });

    const price = await fetcher.fetchPrice("TBILL");
    expect(price).toBe(1.0);
  });

  it("should timeout on slow response", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000)),
      );

    await expect(fetcher.fetchPrice("TBILL")).rejects.toThrow(
      "Request timeout",
    );
  });

  it("should handle API errors", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

    await expect(fetcher.fetchPrice("TBILL")).rejects.toThrow("Network error");
  });
});
```

**2. Price Aggregator Tests**

```typescript
// tests/unit/aggregator.test.ts
describe("PriceAggregator", () => {
  let aggregator: PriceAggregator;

  beforeEach(() => {
    aggregator = new PriceAggregator();
  });

  it("should calculate weighted average correctly", () => {
    const prices = [1.0, 1.02, 0.98];
    const weights = [40, 30, 30];

    const result = aggregator.aggregate(prices, weights);
    expect(result).toBeCloseTo(1.002, 3);
  });

  it("should calculate median correctly", () => {
    const prices = [1.0, 1.02, 0.98, 1.05, 0.95];
    const result = aggregator.median(prices);
    expect(result).toBe(1.0);
  });

  it("should calculate trimmed mean correctly", () => {
    const prices = [0.9, 1.0, 1.01, 1.02, 1.1]; // Outliers at ends
    const result = aggregator.trimmedMean(prices, 20);
    expect(result).toBeCloseTo(1.01, 2);
  });

  it("should throw on empty prices", () => {
    expect(() => aggregator.aggregate([], [])).toThrow(
      "No prices to aggregate",
    );
  });
});
```

**3. Price Validator Tests**

```typescript
// tests/unit/validator.test.ts
describe("PriceValidator", () => {
  let validator: PriceValidator;

  beforeEach(() => {
    validator = new PriceValidator({
      TBILL: {
        maxDeviationPercent: 5.0,
        minSources: 2,
        maxStaleness: 3600,
        minPrice: 0.95,
        maxPrice: 1.1,
        maxChangePercent: 2.0,
      },
    });
  });

  it("should accept valid price", () => {
    expect(() => validator.validate("TBILL", 1.0, 0.99)).not.toThrow();
  });

  it("should reject price below minimum", () => {
    expect(() => validator.validate("TBILL", 0.9, 0.99)).toThrow(
      "below minimum",
    );
  });

  it("should reject price above maximum", () => {
    expect(() => validator.validate("TBILL", 1.2, 0.99)).toThrow(
      "above maximum",
    );
  });

  it("should reject excessive price change", () => {
    expect(() => validator.validate("TBILL", 1.05, 1.0)).toThrow(
      "exceeds maximum change",
    );
  });
});
```

**4. Price Smoother Tests**

```typescript
// tests/unit/smoother.test.ts
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
    smoother.smooth("TBILL", 1.0, config);
    smoother.smooth("TBILL", 1.1, config);
    const result = smoother.smooth("TBILL", 1.2, config);

    // Should be smoothed (less than raw 1.20)
    expect(result).toBeLessThan(1.2);
    expect(result).toBeGreaterThan(1.0);
  });

  it("should maintain separate histories per asset", () => {
    const config = { enabled: true, alpha: 0.5, windowSize: 5 };

    smoother.smooth("TBILL", 1.0, config);
    smoother.smooth("BOND", 2.0, config);

    const tbillResult = smoother.smooth("TBILL", 1.1, config);
    const bondResult = smoother.smooth("BOND", 2.1, config);

    expect(tbillResult).not.toBe(bondResult);
  });
});
```

### Integration Tests

**1. End-to-End Update Test**

```typescript
// tests/integration/end-to-end.test.ts
describe("Oracle Price Bot E2E", () => {
  let bot: OraclePriceBot;
  let mockServer: MockStellarServer;

  beforeEach(async () => {
    mockServer = new MockStellarServer();
    await mockServer.start();

    const config = {
      dataSources: {
        TBILL: [
          createMockDataSource("Source1", 1.0),
          createMockDataSource("Source2", 1.01),
          createMockDataSource("Source3", 0.99),
        ],
      },
      validation: {
        /* ... */
      },
      schedule: {
        timeBased: { enabled: false },
        eventBased: { enabled: false },
        manual: { enabled: true },
      },
    };

    bot = new OraclePriceBot(config, mockServer.getNetworkConfig());
  });

  afterEach(async () => {
    await bot.stop();
    await mockServer.stop();
  });

  it("should fetch, aggregate, and submit price", async () => {
    await bot.start();

    // Trigger manual update
    await bot.updateAssetPrice("TBILL");

    // Verify transaction was submitted
    const transactions = mockServer.getSubmittedTransactions();
    expect(transactions).toHaveLength(1);

    // Verify price is correct (weighted average of 1.00, 1.01, 0.99)
    const priceArg = transactions[0].operations[0].args[1];
    const price = Number(priceArg) / 1_000_000;
    expect(price).toBeCloseTo(1.0, 2);
  });

  it("should handle data source failures gracefully", async () => {
    // Make one source fail
    const config = {
      dataSources: {
        TBILL: [
          createMockDataSource("Source1", 1.0),
          createFailingDataSource("Source2"),
          createMockDataSource("Source3", 0.99),
        ],
      },
      validation: {
        TBILL: { minSources: 2 /* ... */ },
      },
      schedule: { manual: { enabled: true } },
    };

    bot = new OraclePriceBot(config, mockServer.getNetworkConfig());
    await bot.start();

    // Should still succeed with 2/3 sources
    await expect(bot.updateAssetPrice("TBILL")).resolves.not.toThrow();
  });

  it("should fail when insufficient sources", async () => {
    const config = {
      dataSources: {
        TBILL: [
          createFailingDataSource("Source1"),
          createFailingDataSource("Source2"),
          createMockDataSource("Source3", 1.0),
        ],
      },
      validation: {
        TBILL: { minSources: 2 /* ... */ },
      },
      schedule: { manual: { enabled: true } },
    };

    bot = new OraclePriceBot(config, mockServer.getNetworkConfig());
    await bot.start();

    // Should fail with only 1/3 sources working
    await expect(bot.updateAssetPrice("TBILL")).rejects.toThrow(
      "Insufficient price sources",
    );
  });
});
```

**2. Contract Integration Test**

```typescript
// tests/integration/contract.test.ts
describe("Oracle Contract Integration", () => {
  let testEnv: TestEnvironment;
  let bot: OraclePriceBot;
  let oracleContract: OracleContractClient;

  beforeEach(async () => {
    testEnv = await setupTestEnvironment();
    oracleContract = testEnv.oracleContract;

    const config = createTestConfig();
    bot = new OraclePriceBot(config, testEnv.networkConfig);

    await bot.start();
  });

  it("should update oracle price on-chain", async () => {
    const assetAddress = testEnv.rwaTokenAddress;

    // Trigger update
    await bot.updateAssetPrice(assetAddress);

    // Wait for confirmation
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Verify price on-chain
    const [price, timestamp] = await oracleContract.get_price({
      asset: assetAddress,
    });

    expect(Number(price) / 1_000_000).toBeCloseTo(1.0, 2);
    expect(timestamp).toBeGreaterThan(0);
  });

  it("should reject stale prices", async () => {
    const assetAddress = testEnv.rwaTokenAddress;

    // Submit initial price
    await bot.updateAssetPrice(assetAddress);

    // Advance time by 25 hours (past staleness threshold)
    testEnv.env
      .ledger()
      .set_timestamp(testEnv.env.ledger().timestamp() + 25 * 3600);

    // Try to use stale price in lending pool
    await expect(
      testEnv.lendingPool.originate_loan({
        borrower: testEnv.user,
        collateral_amount: BigInt(1000),
        loan_amount: BigInt(500),
        duration_months: 12,
      }),
    ).rejects.toThrow("Oracle price is stale");
  });
});
```

### Load Tests

**1. High-Frequency Update Test**

```typescript
// tests/load/high-frequency.test.ts
describe("High-Frequency Updates", () => {
  it("should handle 1 update per second for 5 minutes", async () => {
    const bot = createTestBot({
      schedule: {
        timeBased: {
          enabled: true,
          intervalSeconds: 1,
        },
      },
    });

    await bot.start();

    // Run for 5 minutes
    await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));

    await bot.stop();

    const metrics = bot.getMetrics();

    // Should have ~300 updates (5 min * 60 sec)
    expect(metrics.successfulUpdates).toBeGreaterThan(290);
    expect(metrics.successfulUpdates).toBeLessThan(310);

    // Success rate should be > 95%
    const successRate =
      metrics.successfulUpdates /
      (metrics.successfulUpdates + metrics.failedUpdates);
    expect(successRate).toBeGreaterThan(0.95);
  });
});
```

**2. Multiple Asset Test**

```typescript
// tests/load/multiple-assets.test.ts
describe("Multiple Assets", () => {
  it("should handle 10 assets simultaneously", async () => {
    const assets = Array.from({ length: 10 }, (_, i) => `ASSET_${i}`);

    const config = {
      dataSources: Object.fromEntries(
        assets.map((asset) => [
          asset,
          [createMockDataSource("Source", 1.0 + Math.random() * 0.1)],
        ]),
      ),
      schedule: {
        timeBased: { enabled: true, intervalSeconds: 60 },
      },
    };

    const bot = createTestBot(config);
    await bot.start();

    // Run for 2 minutes
    await new Promise((resolve) => setTimeout(resolve, 2 * 60 * 1000));

    await bot.stop();

    const metrics = bot.getMetrics();

    // Each asset should have ~2 updates
    for (const asset of assets) {
      const assetMetrics = metrics.getAssetMetrics(asset);
      expect(assetMetrics.updateCount).toBeGreaterThan(1);
    }
  });
});
```

### Edge Case Tests

**1. Price Volatility Test**

```typescript
// tests/edge-cases/volatility.test.ts
describe("Price Volatility", () => {
  it("should detect and alert on rapid price changes", async () => {
    const alerts: Alert[] = [];
    const bot = createTestBot({
      alerting: {
        onAlert: (alert) => alerts.push(alert),
      },
    });

    // Simulate volatile prices
    const mockFetcher = createMockDataSource("Volatile", 1.0);
    mockFetcher.setPrice(1.0);
    await bot.updateAssetPrice("TBILL");

    mockFetcher.setPrice(1.1); // 10% jump
    await bot.updateAssetPrice("TBILL");

    // Should have warning alert
    const volatilityAlerts = alerts.filter((a) =>
      a.message.includes("volatility"),
    );
    expect(volatilityAlerts).toHaveLength(1);
    expect(volatilityAlerts[0].severity).toBe("warning");
  });
});
```

**2. Network Failure Test**

```typescript
// tests/edge-cases/network-failure.test.ts
describe("Network Failures", () => {
  it("should retry on network errors", async () => {
    let attempts = 0;
    const mockFetcher = {
      fetchPrice: jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error("Network request failed");
        }
        return 1.0;
      }),
    };

    const bot = createTestBot({
      dataSources: {
        TBILL: [mockFetcher],
      },
      retry: {
        maxRetries: 3,
        initialDelay: 100,
      },
    });

    await bot.updateAssetPrice("TBILL");

    // Should have retried 3 times
    expect(attempts).toBe(3);
  });

  it("should fail after max retries", async () => {
    const mockFetcher = {
      fetchPrice: jest.fn().mockRejectedValue(new Error("Network down")),
    };

    const bot = createTestBot({
      dataSources: { TBILL: [mockFetcher] },
      retry: { maxRetries: 2 },
    });

    await expect(bot.updateAssetPrice("TBILL")).rejects.toThrow("Network down");
    expect(mockFetcher.fetchPrice).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });
});
```

## Deployment

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node healthcheck.js

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
version: "3.8"

services:
  oracle-bot:
    build: .
    container_name: orion-oracle-bot
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - STELLAR_NETWORK=testnet
      - BOT_SECRET_KEY=${BOT_SECRET_KEY}
      - ORACLE_CONTRACT_ID=${ORACLE_CONTRACT_ID}
      - STELLAR_RPC_URL=https://soroban-testnet.stellar.org:443
      - LOG_LEVEL=info
    volumes:
      - ./config:/app/config:ro
      - ./logs:/app/logs
    networks:
      - orion-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  orion-network:
    driver: bridge
```

### Environment Configuration

```bash
# .env.testnet
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org:443
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

BOT_SECRET_KEY=S... # Bot's secret key
ORACLE_CONTRACT_ID=C... # Oracle contract address

# Data source API keys
FRANKLIN_TEMPLETON_API_KEY=...
ONDO_API_KEY=...

# Monitoring
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
PAGERDUTY_API_KEY=...

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/oracle-bot.log
```

### Monitoring Dashboard

The bot exposes a REST API for monitoring:

```typescript
// src/admin/api.ts
import express from "express";

const app = express();

app.get("/health", (req, res) => {
  const health = bot.getHealth();
  res.json(health);
});

app.get("/metrics", (req, res) => {
  const metrics = bot.getMetrics();
  res.json(metrics);
});

app.get("/status", (req, res) => {
  const status = bot.getStatus();
  res.json(status);
});

app.post("/admin/trigger-update/:asset", async (req, res) => {
  const { asset } = req.params;
  const adminKey = req.headers["x-admin-key"];

  try {
    await bot.admin.forceUpdatePrice(asset, adminKey);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/admin/pause", async (req, res) => {
  const adminKey = req.headers["x-admin-key"];

  try {
    await bot.admin.pauseBot(adminKey);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log("Admin API listening on port 3000");
});
```

## Summary

The Oracle Price Bot is a production-ready system with:

✅ **Multi-source price fetching** with failover
✅ **Price aggregation** with outlier detection
✅ **Comprehensive validation** (staleness, sanity checks, change limits)
✅ **Price smoothing** to reduce volatility
✅ **Robust error handling** with retries
✅ **Flexible scheduling** (time-based, event-based, manual)
✅ **Monitoring & alerting** for anomalies
✅ **Admin controls** for emergency overrides
✅ **Comprehensive test suite** (unit, integration, load, edge cases)
✅ **Docker deployment** with health checks
✅ **REST API** for monitoring and control

**Next Steps**:

1. Review and approve this specification
2. Implement the Oracle Price Bot code
3. Deploy to testnet for testing
4. Move to Auto-Repay Bot specification
