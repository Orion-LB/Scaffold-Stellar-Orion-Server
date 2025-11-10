// bots/oracle-price-bot/src/config/sources.ts
export interface DataSource {
  name: string;
  type: "chainlink" | "api" | "oracle" | "custom";
  url: string;
  apiKey?: string;
  weight: number; // 0-100, used in weighted average
  priority: number; // Lower = higher priority for failover
  timeout: number; // ms
  retries: number;
}

export const DATA_SOURCES: Record<string, DataSource[]> = {
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
