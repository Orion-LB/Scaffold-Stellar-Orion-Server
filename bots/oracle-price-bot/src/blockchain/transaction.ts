// bots/oracle-price-bot/src/blockchain/transaction.ts
import * as StellarSdk from "@stellar/stellar-sdk";
import { NetworkConfig } from "../config/network";

export class TransactionManager {
  private server: StellarSdk.SorobanRpc.Server;
  private keypair: StellarSdk.Keypair;
  private assetAddresses: Map<string, string>;

  constructor(private config: NetworkConfig) {
    this.server = new StellarSdk.SorobanRpc.Server(config.rpcUrl);
    this.keypair = StellarSdk.Keypair.fromSecret(config.botSecretKey);

    // Map asset names to contract addresses
    this.assetAddresses = new Map([
      ["STRWA_INVOICES", process.env.STRWA_INVOICES_ADDRESS || ""],
      ["STRWA_TBILLS", process.env.STRWA_TBILLS_ADDRESS || ""],
      ["STRWA_REALESTATE", process.env.STRWA_REALESTATE_ADDRESS || ""],
    ]);
  }

  async submitPrice(
    asset: string,
    price: number,
    timestamp: number,
  ): Promise<string> {
    // Map asset name to contract address
    const assetAddress = this.assetAddresses.get(asset);
    if (!assetAddress) {
      throw new Error(
        `Unknown asset: ${asset}. Available: ${Array.from(this.assetAddresses.keys()).join(", ")}`,
      );
    }
    const priceScaled = BigInt(Math.round(price * 1_000_000)); // 6 decimals
    const botAddress = this.keypair.publicKey();

    const args = [
      new StellarSdk.Address(assetAddress).toScVal(),
      StellarSdk.nativeToScVal(priceScaled, { type: "i128" }),
      StellarSdk.nativeToScVal(timestamp, { type: "u64" }),
      new StellarSdk.Address(botAddress).toScVal(),
    ];

    const account = await this.server.getAccount(botAddress);
    const contract = new StellarSdk.Contract(this.config.oracleContractId);

    let transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase:
        this.config.networkPassphrase || StellarSdk.Networks.TESTNET,
    })
      .addOperation(contract.call("set_price", ...args))
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
      simulated,
    ).build();

    // Sign
    transaction.sign(this.keypair);

    // Submit
    const response = await this.server.sendTransaction(transaction);

    // Poll for confirmation
    let result = await this.server.getTransaction(response.hash);
    let attempts = 0;

    while (result.status === "NOT_FOUND" && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      result = await this.server.getTransaction(response.hash);
      attempts++;
    }

    if (result.status !== "SUCCESS") {
      throw new Error(`Transaction failed: ${result.status}`);
    }

    return response.hash;
  }
}
