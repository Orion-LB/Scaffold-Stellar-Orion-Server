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
      successfulRequests: number;
      totalRequests: number;
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
        assetMetrics.averageLatency = assetMetrics.successfulUpdates > 0 ? ((assetMetrics.averageLatency * (assetMetrics.successfulUpdates -1)) + latency) / assetMetrics.successfulUpdates : latency;
    }

    private getSourceHealth(asset: string, sourceName: string) {
        const assetMetrics = this.getAssetMetrics(asset);
        if (!assetMetrics.sourceHealthMap.has(sourceName)) {
            assetMetrics.sourceHealthMap.set(sourceName, {
                successRate: 100,
                successfulRequests: 0,
                totalRequests: 0,
                averageResponseTime: 0,
                lastFailure: null,
            });
        }
        return assetMetrics.sourceHealthMap.get(sourceName)!;
    }

    recordSourceSuccess(asset: string, sourceName: string, responseTime: number) {
        const sourceHealth = this.getSourceHealth(asset, sourceName);
        sourceHealth.totalRequests++;
        sourceHealth.successfulRequests++;
        sourceHealth.successRate = (sourceHealth.successfulRequests / sourceHealth.totalRequests) * 100;
        sourceHealth.averageResponseTime = ((sourceHealth.averageResponseTime * (sourceHealth.successfulRequests - 1)) + responseTime) / sourceHealth.successfulRequests;
    }

    recordSourceFailure(asset: string, sourceName: string) {
        const sourceHealth = this.getSourceHealth(asset, sourceName);
        sourceHealth.totalRequests++;
        sourceHealth.successRate = (sourceHealth.successfulRequests / sourceHealth.totalRequests) * 100;
        sourceHealth.lastFailure = new Date();
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
        // Simple health check for hackathon - just verify we have recent updates
        for (const [asset, metrics] of this.metrics.entries()) {
            const now = Date.now() / 1000;
            const staleness = now - metrics.lastUpdateTimestamp;

            if (staleness > 300) { // 5 minutes
                console.warn(`⚠️ Oracle update is stale for ${asset}: ${staleness}s old`);
            }
        }
    }
}
