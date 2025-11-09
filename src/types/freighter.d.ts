// Freighter Wallet Type Declarations

interface FreighterSignTransactionOptions {
  network?: string;
  networkPassphrase?: string;
  accountToSign?: string;
}

interface FreighterAPI {
  isConnected(): Promise<boolean>;
  getPublicKey(): Promise<string>;
  getNetwork(): Promise<string>;
  getNetworkDetails(): Promise<{
    network: string;
    networkPassphrase: string;
  }>;
  signTransaction(xdr: string, opts?: FreighterSignTransactionOptions): Promise<string>;
  signAuthEntry(entryXdr: string, opts?: {
    accountToSign?: string;
  }): Promise<string>;
}

interface Window {
  freighter?: FreighterAPI;
}
