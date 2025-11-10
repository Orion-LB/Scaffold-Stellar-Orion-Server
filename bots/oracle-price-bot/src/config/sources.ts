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
  STRWA_INVOICES: [
    {
      name: "Mock Oracle - Invoices",
      type: "custom",
      url: "",
      weight: 100,
      priority: 1,
      timeout: 5000,
      retries: 3,
    },
  ],
  STRWA_TBILLS: [
    {
      name: "Mock Oracle - TBills",
      type: "custom",
      url: "",
      weight: 100,
      priority: 1,
      timeout: 5000,
      retries: 3,
    },
  ],
  STRWA_REALESTATE: [
    {
      name: "Mock Oracle - Real Estate",
      type: "custom",
      url: "",
      weight: 100,
      priority: 1,
      timeout: 5000,
      retries: 3,
    },
  ],
};
