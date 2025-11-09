// bots/auto-repay-bot/src/triggers/event-based.ts
import { EventMonitor } from "../monitor/events";
import { Logger } from "../monitoring/logger";

export class EventBasedTrigger {
    constructor(
        private eventMonitor: EventMonitor,
        private processAutoRepays: () => Promise<void>,
        private logger: Logger,
    ) {}

    async start(): Promise<void> {
        // Poll for events every 30 seconds
        setInterval(async () => {
            try {
                const events = await this.eventMonitor.pollEvents();

                if (events.length > 0) {
                    this.logger.info('Yield funded event detected', {
                        events: events.length,
                    });

                    await this.processAutoRepays();
                }
            } catch (error: any) {
                this.logger.error('Event monitoring failed', {
                    error: error.message,
                });
            }
        }, 30_000); // 30 seconds
    }
}
