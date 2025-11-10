// bots/liquidation-bot/src/config/network.ts
export interface NetworkConfig {
  rpcUrl: string;
  botSecretKey: string;
  networkPassphrase?: string;
  oracleContractId: string;
  lendingPoolContractId: string;
  stRwaTokenAddress: string;
}
