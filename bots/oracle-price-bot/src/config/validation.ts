// bots/oracle-price-bot/src/config/validation.ts
export interface ValidationConfig {
    maxDeviationPercent: number;     // Max deviation from median (e.g., 5%)
    minSources: number;               // Minimum sources required (e.g., 2)
    maxStaleness: number;             // Max age of price data (seconds)
    minPrice: number;                 // Sanity check: minimum valid price
    maxPrice: number;                 // Sanity check: maximum valid price
    maxChangePercent: number;         // Max % change from last price (e.g., 10%)
  }
  
  export const VALIDATION_CONFIG: Record<string, ValidationConfig> = {
    'TBILL_TOKEN': {
      maxDeviationPercent: 3.0,
      minSources: 2,
      maxStaleness: 3600,          // 1 hour
      minPrice: 0.95,              // $0.95 (T-Bills shouldn't drop below par)
      maxPrice: 1.10,              // $1.10
      maxChangePercent: 2.0,       // 2% max change per update
    },
  };
