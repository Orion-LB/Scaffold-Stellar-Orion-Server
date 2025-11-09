// bots/oracle-price-bot/src/blockchain/transaction.ts
import * as StellarSdk from '@stellar/stellar-sdk';
import { NetworkConfig } from '../config/network';

export class TransactionManager {
  private server: StellarSdk.SorobanRpc.Server;
  private keypair: StellarSdk.Keypair;

  constructor(private config: NetworkConfig) {
    this.server = new StellarSdk.SorobanRpc.Server(config.rpcUrl);
    this.keypair = StellarSdk.Keypair.fromSecret(config.botSecretKey);
  }

  async submitPrice(
    assetAddress: string,
    price: number,
    timestamp: number
  ): Promise<string> {
    const priceScaled = BigInt(Math.round(price * 1_000_000)); // 6 decimals
    const botAddress = this.keypair.publicKey();

    const args = [
      StellarSdk.nativeToScVal(assetAddress, {type: 'address'}),
      StellarSdk.nativeToScVal(priceScaled, {type: 'i128'}),
      StellarSdk.nativeToScVal(timestamp, {type: 'u64'}),
      StellarSdk.nativeToScVal(botAddress, {type: 'address'}),
    ];

    const account = await this.server.getAccount(botAddress);
    const contract = new StellarSdk.Contract(this.config.oracleContractId);

    let transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.config.networkPassphrase || StellarSdk.Networks.TESTNET,
    })
      .addOperation(contract.call('set_price', ...args))
      .setTimeout(30)
      .build();

    // Simulate
    const simulated = await this.server.simulateTransaction(transaction);

    if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      throw new Error(`Simulation failed: ${JSON.stringify(simulated)}`);
    }

    // Assemble
    transaction = StellarSdk.SorobanRpc.assembleTransaction(
      transaction,
      simulated
    ).build();

    // Sign
    transaction.sign(this.keypair);

    // Submit
    const response = await this.server.sendTransaction(transaction);

    // Poll for confirmation
    let result = await this.server.getTransaction(response.hash);
    let attempts = 0;

    while (result.status === 'NOT_FOUND' && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      result = await this.server.getTransaction(response.hash);
      attempts++;
    }

    if (result.status !== 'SUCCESS') {
      throw new Error(`Transaction failed: ${result.status}`);
    }

    return response.hash;
  }
}
