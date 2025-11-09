// bots/auto-repay-bot/src/triggers/time-based.ts
import { Logger } from "../monitoring/logger";

export class TimeBasedTrigger {
    constructor(
        private processAutoRepays: () => Promise<void>,
        private logger: Logger,
    ) {}

    async start(): Promise<void> {
        // Run every 5 minutes as fallback
        setInterval(async () => {
            this.logger.info('Time-based trigger executing');
            await this.processAutoRepays();
        }, 5 * 60 * 1000); // 5 minutes
    }
}
