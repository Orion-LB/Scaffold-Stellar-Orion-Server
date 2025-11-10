// bots/liquidation-bot/src/index.ts
import { LiquidationBot } from "./bot";
import { NetworkConfig } from "./config/network";
import { createAdminApi } from "./admin/api";

// Load environment variables
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/../.env" });

const networkConfig: NetworkConfig = {
  rpcUrl:
    process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org:443",
  botSecretKey: process.env.BOT_SECRET_KEY || "",
  networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE,
  oracleContractId: process.env.ORACLE_CONTRACT_ID || "",
  lendingPoolContractId: process.env.LENDING_POOL_CONTRACT_ID || "",
  stRwaTokenAddress: process.env.STRWA_TOKEN_ADDRESS || "",
};

const bot = new LiquidationBot(networkConfig);

const adminApi = createAdminApi(bot);

bot.start().catch((error) => {
  console.error("Failed to start bot:", error);
  process.exit(1);
});

const port = process.env.PORT || 3002;
adminApi.listen(port, () => {
  console.log(`Admin API listening on port ${port}`);
});
