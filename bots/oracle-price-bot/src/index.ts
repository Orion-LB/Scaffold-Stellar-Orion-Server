// bots/oracle-price-bot/src/index.ts
import { OraclePriceBot, BotConfig } from "./bot";
import { NetworkConfig } from "./config/network";
import { DATA_SOURCES } from "./config/sources";
import { VALIDATION_CONFIG } from "./config/validation";
import { createAdminApi } from "./admin/api";
import { AdminInterface } from "./admin/interface";
import { TransactionManager } from "./blockchain/transaction";
import { MetricsCollector } from "./monitoring/metrics";
import { AlertService } from "./monitoring/alerts";

// Load environment variables
import * as dotenv from "dotenv";
dotenv.config();

const networkConfig: NetworkConfig = {
  rpcUrl:
    process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org:443",
  botSecretKey: process.env.BOT_SECRET_KEY || "",
  oracleContractId: process.env.ORACLE_CONTRACT_ID || "",
  networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE,
};

const botConfig: BotConfig = {
  dataSources: DATA_SOURCES,
  validation: VALIDATION_CONFIG,
  smoothing: {
    enabled: true,
    alpha: 0.5,
    windowSize: 10,
  },
  schedule: {
    timeBased: {
      enabled: true,
      intervalSeconds: 60,
    },
    eventBased: {
      enabled: true,
      priceChangeThreshold: 0.5,
      checkIntervalSeconds: 30,
    },
  },
};

const bot = new OraclePriceBot(botConfig, networkConfig);

const txManager = new TransactionManager(networkConfig);
const metrics = new MetricsCollector();
const alerts = new AlertService();
const adminInterface = new AdminInterface(
  txManager,
  metrics.getAssetMetrics("TBILL_TOKEN"),
  alerts["alerts"],
);

const adminApi = createAdminApi(adminInterface);

bot.start().catch((error) => {
  console.error("Failed to start bot:", error);
  process.exit(1);
});

const port = process.env.PORT || 3000;
adminApi.listen(port, () => {
  console.log(`Admin API listening on port ${port}`);
});
