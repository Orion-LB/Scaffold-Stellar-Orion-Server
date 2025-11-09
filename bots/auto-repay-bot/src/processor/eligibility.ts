// bots/auto-repay-bot/src/processor/eligibility.ts
import { NetworkConfig } from "../config/network";
import { Contract, SorobanRpc } from "@stellar/stellar-sdk";

export interface BorrowerEligibility {
    address: string;
    hasLoan: boolean;
    outstandingDebt: bigint;
    claimableYield: bigint;
    isEligible: boolean;
    repaymentAmount: bigint;
}

export class EligibilityChecker {
    private lendingPool: Contract;
    private vault: Contract;
    private server: SorobanRpc.Server;

    constructor(private config: NetworkConfig) {
        this.lendingPool = new Contract(config.lendingPoolContractId);
        this.vault = new Contract(config.vaultContractId);
        this.server = new SorobanRpc.Server(config.rpcUrl);
    }

    async checkBorrower(
        borrower: string
    ): Promise<BorrowerEligibility> {
        // 1. Get loan info
        const loan = await this.getLoan(borrower);

        if (!loan || loan.outstandingDebt === 0n) {
            return {
                address: borrower,
                hasLoan: false,
                outstandingDebt: 0n,
                claimableYield: 0n,
                isEligible: false,
                repaymentAmount: 0n,
            };
        }

        // 2. Get claimable yield
        const claimableYield = await this.getClaimableYield(borrower);

        // 3. Check minimum threshold (avoid dust)
        const MIN_YIELD = 1_000000n; // 1 USDC minimum

        if (claimableYield < MIN_YIELD) {
            return {
                address: borrower,
                hasLoan: true,
                outstandingDebt: loan.outstandingDebt,
                claimableYield,
                isEligible: false,
                repaymentAmount: 0n,
            };
        }

        // 4. Calculate repayment amount
        const repaymentAmount = claimableYield < loan.outstandingDebt
            ? claimableYield
            : loan.outstandingDebt;

        return {
            address: borrower,
            hasLoan: true,
            outstandingDebt: loan.outstandingDebt,
            claimableYield,
            isEligible: true,
            repaymentAmount,
        };
    }

    async checkAllBorrowers(
        borrowers: string[]
    ): Promise<BorrowerEligibility[]> {
        const eligibilities = await Promise.all(
            borrowers.map(b => this.checkBorrower(b))
        );

        return eligibilities.filter(e => e.isEligible);
    }

    private async getLoan(borrower: string): Promise<{ outstandingDebt: bigint } | null> {
        // This is a mock implementation. In a real scenario, you would call the contract.
        console.log(`Checking loan for ${borrower}`);
        return { outstandingDebt: 100_000000n }; // 100 USDC
    }

    private async getClaimableYield(borrower: string): Promise<bigint> {
        // This is a mock implementation. In a real scenario, you would call the contract.
        console.log(`Checking yield for ${borrower}`);
        return 50_000000n; // 50 USDC
    }
}
