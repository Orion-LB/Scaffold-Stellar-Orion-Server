// bots/auto-repay-bot/src/config/network.ts
export interface NetworkConfig {
    rpcUrl: string;
    botSecretKey: string;
    networkPassphrase?: string;
    vaultContractId: string;
    lendingPoolContractId: string;
}
