// bots/auto-repay-bot/src/processor/batch.ts
import { BorrowerEligibility } from "./eligibility";
import { RepaymentExecutor } from "../executor/transaction";
import { Logger } from "../monitoring/logger";

export interface BatchConfig {
    maxBatchSize: number;       // Max operations per TX
    maxGasPerTx: number;         // Gas limit per TX
    delayBetweenBatches: number; // ms between batches
}

export interface BatchResult {
    borrower: string;
    amount: bigint;
    success: boolean;
    txHash?: string;
    error?: string;
}

export class BatchProcessor {
    private config: BatchConfig = {
        maxBatchSize: 5,           // Conservative for hackathon
        maxGasPerTx: 100_000_000,
        delayBetweenBatches: 2000,
    };

    constructor(
        private executor: RepaymentExecutor,
        private logger: Logger,
    ) {}

    async processBatch(
        eligibleBorrowers: BorrowerEligibility[]
    ): Promise<BatchResult[]> {
        const results: BatchResult[] = [];

        // Split into batches
        for (let i = 0; i < eligibleBorrowers.length; i += this.config.maxBatchSize) {
            const batch = eligibleBorrowers.slice(i, i + this.config.maxBatchSize);

            try {
                // Process batch sequentially for safety
                for (const borrower of batch) {
                    try {
                        const txHash = await this.executor.executeRepayment(
                            borrower.address,
                            borrower.repaymentAmount
                        );

                        results.push({
                            borrower: borrower.address,
                            amount: borrower.repaymentAmount,
                            success: true,
                            txHash,
                        });

                        this.logger.info('Auto-repay executed', {
                            borrower: borrower.address,
                            amount: borrower.repaymentAmount,
                            txHash,
                        });

                    } catch (error: any) {
                        results.push({
                            borrower: borrower.address,
                            amount: borrower.repaymentAmount,
                            success: false,
                            error: error.message,
                        });

                        this.logger.error('Auto-repay failed', {
                            borrower: borrower.address,
                            error: error.message,
                        });
                    }
                }

                // Delay between batches to avoid rate limiting
                if (i + this.config.maxBatchSize < eligibleBorrowers.length) {
                    await new Promise(resolve =>
                        setTimeout(resolve, this.config.delayBetweenBatches)
                    );
                }

            } catch (error: any) {
                this.logger.error('Batch processing failed', { error: error.message });
            }
        }

        return results;
    }
}
