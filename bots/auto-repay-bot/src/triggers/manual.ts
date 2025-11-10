// bots/auto-repay-bot/src/triggers/manual.ts
import { EligibilityChecker } from "../processor/eligibility";
import { RepaymentExecutor } from "../executor/transaction";
import { Logger } from "../monitoring/logger";

export class ManualTrigger {
  constructor(
    private checker: EligibilityChecker,
    private executor: RepaymentExecutor,
    private processAutoRepays: () => Promise<void>,
    private logger: Logger,
  ) {}

  async triggerForBorrower(borrower: string): Promise<void> {
    this.logger.info("Manual trigger for borrower", { borrower });

    const eligibility = await this.checker.checkBorrower(borrower);

    if (eligibility.isEligible) {
      await this.executor.executeRepayment(
        borrower,
        eligibility.repaymentAmount,
      );
    }
  }

  async triggerForAll(): Promise<void> {
    this.logger.info("Manual trigger for all borrowers");
    await this.processAutoRepays();
  }
}
