// bots/oracle-price-bot/src/monitoring/metrics.ts
export interface BotMetrics {
    // Performance
    successfulUpdates: number;
    failedUpdates: number;
    averageLatency: number;           // ms from fetch to on-chain confirmation
  
    // Price data
    lastPrice: number;
    priceChangeLast1h: number;        // %
    priceChangeLast24h: number;       // %
  
    // Data sources
    sourceHealthMap: Map<string, {
      successRate: number;            // %
      averageResponseTime: number;    // ms
      lastFailure: Date | null;
    }>;
  
    // Blockchain
    transactionSuccessRate: number;   // %
    averageGasUsed: number;
    lastUpdateTimestamp: number;
  }

export class MetricsCollector {
    private metrics: Map<string, BotMetrics> = new Map();

    recordUpdate(asset: string, price: number, latency: number, success: boolean) {
        const assetMetrics = this.getAssetMetrics(asset);
        if (success) {
            assetMetrics.successfulUpdates++;
            assetMetrics.lastPrice = price;
            assetMetrics.lastUpdateTimestamp = Date.now() / 1000;
        } else {
            assetMetrics.failedUpdates++;
        }
        assetMetrics.averageLatency = ((assetMetrics.averageLatency * (assetMetrics.successfulUpdates -1)) + latency) / assetMetrics.successfulUpdates;
    }

    recordSourceSuccess(sourceName: string) {
        // TODO: implement
    }

    recordSourceFailure(sourceName: string) {
        // TODO: implement
    }

    getAssetMetrics(asset: string): BotMetrics {
        if (!this.metrics.has(asset)) {
            this.metrics.set(asset, {
                successfulUpdates: 0,
                failedUpdates: 0,
                averageLatency: 0,
                lastPrice: 0,
                priceChangeLast1h: 0,
                priceChangeLast24h: 0,
                sourceHealthMap: new Map(),
                transactionSuccessRate: 0,
                averageGasUsed: 0,
                lastUpdateTimestamp: 0,
            });
        }
        return this.metrics.get(asset)!;
    }

    getLastPrice(asset: string): number | undefined {
        return this.getAssetMetrics(asset).lastPrice;
    }

    checkHealth() {
        // TODO: implement
    }
}
