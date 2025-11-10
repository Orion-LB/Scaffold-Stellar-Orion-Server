// bots/auto-repay-bot/src/config/network.ts
export interface NetworkConfig {
  rpcUrl: string;
  botSecretKey: string;
  networkPassphrase?: string;
  vaultContractIds: string[]; // Changed to array for multi-asset support
  lendingPoolContractId: string;
}
