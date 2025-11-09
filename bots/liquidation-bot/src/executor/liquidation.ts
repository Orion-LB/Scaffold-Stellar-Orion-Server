// bots/liquidation-bot/src/executor/liquidation.ts
import * as StellarSdk from '@stellar/stellar-sdk';
import { NetworkConfig } from '../config/network';

export interface LiquidationResult {
    borrower: string;
    txHash: string;
    reward: bigint;
    success: boolean;
}

export class LiquidationExecutor {
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

    async liquidateLoan(borrower: string): Promise<LiquidationResult> {
        const botAddress = this.keypair.publicKey();

        // Build transaction
        const args = [
            StellarSdk.nativeToScVal(botAddress, { type: 'address' }),
            StellarSdk.nativeToScVal(borrower, { type: 'address' }),
        ];

        const account = await this.server.getAccount(botAddress);
        const contract = new StellarSdk.Contract(this.lendingPoolId);

        let transaction = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: this.networkPassphrase || StellarSdk.Networks.TESTNET,
        })
            .addOperation(contract.call('liquidate_loan', ...args))
            .setTimeout(30)
            .build();

        // Simulate
        const simulated = await this.server.simulateTransaction(transaction);

        if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
            throw new Error(`Liquidation simulation failed`);
        }

        // Parse expected reward from simulation
        const reward = this.parseRewardFromSimulation(simulated);

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
            throw new Error(`Liquidation transaction failed`);
        }

        return {
            borrower,
            txHash: response.hash,
            reward,
            success: true,
        };
    }

    private parseRewardFromSimulation(simulated: any): bigint {
        // Parse the reward amount from simulation results
        // This would extract the USDC transfer amount to the bot
        // Simplified for hackathon - would need actual parsing logic
        return 0n;
    }
}
