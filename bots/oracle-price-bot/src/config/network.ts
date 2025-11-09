// bots/oracle-price-bot/src/config/network.ts
export interface NetworkConfig {
    rpcUrl: string;
    botSecretKey: string;
    oracleContractId: string;
    networkPassphrase?: string;
}
