// bots/liquidation-bot/src/executor/warning.ts
import * as StellarSdk from '@stellar/stellar-sdk';
import { NetworkConfig } from '../config/network';

export class WarningExecutor {
    private server: StellarSdk.SorobanRpc.Server;
    private keypair: StellarSdk.Keypair;
    private lendingPoolId: string;
    private networkPassphrase?: string;

    constructor(private config: NetworkConfig) {
        this.server = new StellarSdk.SorobanRpc.Server(config.rpcUrl);
        this.keypair = StellarSdk.Keypair.fromSecret(config.botSecretKey);
        this.lendingPoolId = config.lendingPoolContractId;
        this.networkPassphrase = config.networkPassphrase;
    }

    async issueWarning(borrower: string): Promise<string> {
        const botAddress = this.keypair.publicKey();

        // Build transaction
        const args = [
            StellarSdk.nativeToScVal(borrower, { type: 'address' }),
        ];

        const account = await this.server.getAccount(botAddress);
        const contract = new StellarSdk.Contract(this.lendingPoolId);

        let transaction = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: this.networkPassphrase || StellarSdk.Networks.TESTNET,
        })
            .addOperation(contract.call('check_and_issue_warning', ...args))
            .setTimeout(30)
            .build();

        // Simulate
        const simulated = await this.server.simulateTransaction(transaction);

        if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
            throw new Error(`Warning simulation failed`);
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
            throw new Error(`Warning transaction failed`);
        }

        return response.hash;
    }
}
