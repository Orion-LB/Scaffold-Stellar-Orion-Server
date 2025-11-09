// bots/auto-repay-bot/src/bot.ts
import { Logger } from './monitoring/logger';
import { MetricsCollector } from './monitoring/metrics';
import { EventMonitor } from './monitor/events';
import { BorrowerTracker } from './monitor/borrowers';
import { EligibilityChecker } from './processor/eligibility';
import { BatchProcessor } from './processor/batch';
import { RepaymentExecutor } from './executor/transaction';
import { NetworkConfig } from './config/network';
import { EventBasedTrigger } from './triggers/event-based';
import { TimeBasedTrigger } from './triggers/time-based';

export class AutoRepayBot {
  private logger: Logger;
  public metrics: MetricsCollector;
  private eventMonitor: EventMonitor;
  private borrowerTracker: BorrowerTracker;
  private eligibilityChecker: EligibilityChecker;
  private batchProcessor: BatchProcessor;
  private executor: RepaymentExecutor;
  private eventBasedTrigger: EventBasedTrigger;
  private timeBasedTrigger: TimeBasedTrigger;

  constructor(private config: NetworkConfig) {
    this.logger = new Logger('AutoRepayBot');
    this.metrics = new MetricsCollector();
    this.eventMonitor = new EventMonitor(config);
    this.borrowerTracker = new BorrowerTracker(config);
    this.executor = new RepaymentExecutor(config);
    this.eligibilityChecker = new EligibilityChecker(config);
    this.batchProcessor = new BatchProcessor(this.executor, this.logger);
    this.eventBasedTrigger = new EventBasedTrigger(this.eventMonitor, this.processAutoRepays.bind(this), this.logger);
    this.timeBasedTrigger = new TimeBasedTrigger(this.processAutoRepays.bind(this), this.logger);
  }

  async start(): Promise<void> {
    this.logger.info('Starting Auto-Repay Bot...');

    // Load known borrowers
    await this.borrowerTracker.loadBorrowers();

    // Start event monitoring (every 30 seconds)
    this.eventBasedTrigger.start();

    // Start time-based fallback (every 5 minutes)
    this.timeBasedTrigger.start();

    // Start health monitoring
    this.startHealthMonitoring();

    this.logger.info('Auto-Repay Bot started successfully');
  }

  public async processAutoRepays(): Promise<void> {
    const startTime = Date.now();

    try {
      // 1. Get all known borrowers
      const borrowers = this.borrowerTracker.getBorrowers();
      this.logger.info('Processing auto-repays', {
        borrowers: borrowers.length,
      });
      this.metrics.metrics.activeBorrowers = borrowers.length;

      // 2. Check eligibility
      const eligible = await this.eligibilityChecker.checkAllBorrowers(
        borrowers
      );

      this.logger.info('Eligible borrowers found', {
        eligible: eligible.length,
      });

      this.metrics.metrics.eligibleBorrowers = eligible.length;

      if (eligible.length === 0) {
        return;
      }

      // 3. Process batch
      const results = await this.batchProcessor.processBatch(eligible);

      // 4. Record metrics
      const processingTime = Date.now() - startTime;
      this.metrics.metrics.lastProcessedTime = Date.now() / 1000;


      for (const result of results) {
        this.metrics.recordRepayment(
          result.success,
          result.amount,
          processingTime
        );
      }

      // 5. Log summary
      const successful = results.filter(r => r.success).length;
      this.logger.info('Auto-repay batch completed', {
        total: results.length,
        successful,
        failed: results.length - successful,
        processingTime,
      });

    } catch (error: any) {
      this.logger.error('Auto-repay processing failed', {
        error: error.message,
      });
    }
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      this.metrics.checkHealth();
    }, 60_000); // Every minute
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping Auto-Repay Bot...');
    // Cleanup intervals (store references for cleanup)
    this.logger.info('Auto-Repay Bot stopped');
  }
}
