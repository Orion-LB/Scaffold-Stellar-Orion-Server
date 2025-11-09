# 💰 Auto-Repay Bot - Technical Specification

## Overview

The Auto-Repay Bot automatically routes accumulated yield from the RWA Vault to borrowers' loan repayments. This enables a "set-it-and-forget-it" experience where staked RWA tokens generate yield that automatically pays down USDC loans.

## Purpose

**Automatically route user yield to loan repayments** so borrowers can leverage their RWA yield to reduce debt without manual intervention.

## Architecture

```
┌─────────────────┐
│  Vault Contract │
│  (Yield Funded) │
└────────┬────────┘
         │ Events
         ▼
┌─────────────────┐
│  Event Monitor  │
│  - Watch events │
│  - Polling      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Eligibility     │
│ Checker         │
│ - Has loan?     │
│ - Has yield?    │
│ - Auto enabled? │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Repayment       │
│ Executor        │
│ - Build TX      │
│ - Submit        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Lending Pool    │
│ Contract        │
└─────────────────┘
```

## Core Features

### 1. Event Monitoring

**Feature**: Listen for `YieldFunded` events from the Vault contract

**Event Structure**:
```rust
// In Vault contract
pub enum VaultEvent {
    YieldFunded {
        total_yield: i128,
        timestamp: u64,
    },
}
```

**Implementation**:
```typescript
interface YieldFundedEvent {
  totalYield: bigint;
  timestamp: number;
  ledger: number;
}

class EventMonitor {
  private lastProcessedLedger: number = 0;

  async pollEvents(): Promise<YieldFundedEvent[]> {
    const latestLedger = await this.server.getLatestLedger();
    const events: YieldFundedEvent[] = [];

    // Poll from last processed to latest
    for (let ledger = this.lastProcessedLedger + 1;
         ledger <= latestLedger.sequence;
         ledger++) {

      const ledgerEvents = await this.getEventsAtLedger(ledger);

      for (const event of ledgerEvents) {
        if (event.topic === 'YieldFunded') {
          events.push({
            totalYield: this.parseYield(event),
            timestamp: ledgerEvents.timestamp,
            ledger: ledger,
          });
        }
      }
    }

    this.lastProcessedLedger = latestLedger.sequence;
    return events;
  }

  private async getEventsAtLedger(ledger: number): Promise<any[]> {
    // Query contract events at specific ledger
    const result = await this.server.getEvents({
      startLedger: ledger,
      endLedger: ledger,
      filters: [
        {
          type: 'contract',
          contractIds: [this.vaultContractId],
        },
      ],
    });

    return result.events || [];
  }
}
```

### 2. Borrower Discovery

**Feature**: Fetch all active borrowers from Lending Pool

**Challenge**: Soroban doesn't have built-in contract indexing

**Solutions**:

**Option A: Event-Based Tracking** (Recommended for hackathon)
```typescript
class BorrowerTracker {
  private borrowers: Set<string> = new Set();

  // Track from loan origination events
  async trackFromEvents(): Promise<void> {
    const events = await this.getContractEvents('loan_originated');

    for (const event of events) {
      const borrower = event.data.borrower;
      this.borrowers.add(borrower);
    }
  }

  // Check each tracked borrower
  async getActiveBorrowers(): Promise<string[]> {
    const active: string[] = [];

    for (const borrower of this.borrowers) {
      const loan = await this.lendingPool.getLoan(borrower);

      if (loan && loan.outstandingDebt > 0n) {
        active.push(borrower);
      }
    }

    return active;
  }
}
```

**Option B: Off-Chain Indexer** (Production approach)
```typescript
// Use Stellar event streaming service
import { StellarEventStream } from '@stellar/event-stream';

class BorrowerIndexer {
  private db: Database; // SQLite or similar

  async indexBorrowers(): Promise<void> {
    const stream = new StellarEventStream({
      contractId: this.lendingPoolId,
      network: 'testnet',
    });

    stream.on('loan_originated', (event) => {
      this.db.insert('borrowers', {
        address: event.borrower,
        loanAmount: event.loanAmount,
        timestamp: event.timestamp,
      });
    });

    stream.on('loan_closed', (event) => {
      this.db.update('borrowers', {
        address: event.borrower,
        active: false,
      });
    });
  }

  async getActiveBorrowers(): Promise<string[]> {
    return this.db.query(
      'SELECT address FROM borrowers WHERE active = true'
    );
  }
}
```

**Option C: Maintained List** (Simplest for hackathon)
```typescript
// Maintain a simple JSON file of known borrowers
class BorrowerRegistry {
  private borrowers: string[] = [];

  constructor() {
    // Load from file
    this.borrowers = JSON.parse(
      fs.readFileSync('borrowers.json', 'utf-8')
    );
  }

  async addBorrower(address: string): Promise<void> {
    if (!this.borrowers.includes(address)) {
      this.borrowers.push(address);
      fs.writeFileSync(
        'borrowers.json',
        JSON.stringify(this.borrowers, null, 2)
      );
    }
  }

  getBorrowers(): string[] {
    return this.borrowers;
  }
}
```

### 3. Eligibility Checking

**Feature**: Determine which borrowers are eligible for auto-repay

**Criteria**:
1. ✅ Has an active loan (outstanding debt > 0)
2. ✅ Has claimable yield (yield > minimum threshold)
3. ✅ Auto-repay is enabled (if we add this feature)

**Implementation**:
```typescript
interface BorrowerEligibility {
  address: string;
  hasLoan: boolean;
  outstandingDebt: bigint;
  claimableYield: bigint;
  isEligible: boolean;
  repaymentAmount: bigint;
}

class EligibilityChecker {
  async checkBorrower(
    borrower: string
  ): Promise<BorrowerEligibility> {
    // 1. Get loan info
    const loan = await this.lendingPool.getLoan(borrower);

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
    const yield = await this.vault.getClaimableYield(borrower);

    // 3. Check minimum threshold (avoid dust)
    const MIN_YIELD = 1_000000n; // 1 USDC minimum

    if (yield < MIN_YIELD) {
      return {
        address: borrower,
        hasLoan: true,
        outstandingDebt: loan.outstandingDebt,
        claimableYield: yield,
        isEligible: false,
        repaymentAmount: 0n,
      };
    }

    // 4. Calculate repayment amount
    const repaymentAmount = yield < loan.outstandingDebt
      ? yield
      : loan.outstandingDebt;

    return {
      address: borrower,
      hasLoan: true,
      outstandingDebt: loan.outstandingDebt,
      claimableYield: yield,
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
}
```

### 4. Repayment Execution

**Feature**: Execute auto-repay transactions for eligible borrowers

**Contract Interaction**:
```rust
// In Lending Pool contract
pub fn repay_loan(
    env: Env,
    borrower: Address,
    amount: i128,
) -> Result<(), ContractError> {
    // This internally calls:
    // 1. vault.pull_yield_for_repay(borrower, amount)
    // 2. Reduces outstanding_debt
    // 3. Updates loan state
}
```

**Implementation**:
```typescript
class RepaymentExecutor {
  private server: StellarSdk.SorobanRpc.Server;
  private keypair: StellarSdk.Keypair;

  async executeRepayment(
    borrower: string,
    amount: bigint
  ): Promise<string> {
    const botAddress = this.keypair.publicKey();

    // Build transaction
    const args = [
      StellarSdk.nativeToScVal(borrower, { type: 'address' }),
      StellarSdk.nativeToScVal(amount, { type: 'i128' }),
    ];

    const account = await this.server.getAccount(botAddress);
    const contract = new StellarSdk.Contract(this.lendingPoolId);

    let transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call('repay_loan', ...args))
      .setTimeout(30)
      .build();

    // Simulate
    const simulated = await this.server.simulateTransaction(transaction);

    if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      throw new Error(`Simulation failed: ${JSON.stringify(simulated)}`);
    }

    // Assemble with auth
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
```

### 5. Batch Processing

**Feature**: Process multiple repayments efficiently

**Challenge**: Stellar has transaction size limits

**Strategy**:
```typescript
interface BatchConfig {
  maxBatchSize: number;       // Max operations per TX
  maxGasPerTx: number;         // Gas limit per TX
  delayBetweenBatches: number; // ms between batches
}

class BatchProcessor {
  private config: BatchConfig = {
    maxBatchSize: 5,           // Conservative for hackathon
    maxGasPerTx: 100_000_000,
    delayBetweenBatches: 2000,
  };

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
```

### 6. Scheduling & Triggers

**Feature**: Multiple trigger mechanisms for reliability

**Triggers**:

**A. Event-Based** (Primary)
```typescript
class EventBasedTrigger {
  async start(): Promise<void> {
    // Poll for events every 30 seconds
    setInterval(async () => {
      const events = await this.eventMonitor.pollEvents();

      if (events.length > 0) {
        this.logger.info('Yield funded event detected', {
          events: events.length,
        });

        await this.processAutoRepays();
      }
    }, 30_000); // 30 seconds
  }
}
```

**B. Time-Based** (Fallback)
```typescript
class TimeBasedTrigger {
  async start(): Promise<void> {
    // Run every 5 minutes as fallback
    setInterval(async () => {
      this.logger.info('Time-based trigger executing');
      await this.processAutoRepays();
    }, 5 * 60 * 1000); // 5 minutes
  }
}
```

**C. Manual** (Admin override)
```typescript
class ManualTrigger {
  async triggerForBorrower(borrower: string): Promise<void> {
    this.logger.info('Manual trigger for borrower', { borrower });

    const eligibility = await this.checker.checkBorrower(borrower);

    if (eligibility.isEligible) {
      await this.executor.executeRepayment(
        borrower,
        eligibility.repaymentAmount
      );
    }
  }

  async triggerForAll(): Promise<void> {
    this.logger.info('Manual trigger for all borrowers');
    await this.processAutoRepays();
  }
}
```

### 7. Error Handling

**Feature**: Robust error handling for various failure modes

**Error Types**:
```typescript
enum AutoRepayError {
  INSUFFICIENT_YIELD = 'Insufficient yield to repay',
  NO_LOAN = 'Borrower has no active loan',
  SIMULATION_FAILED = 'Transaction simulation failed',
  TRANSACTION_FAILED = 'Transaction execution failed',
  NETWORK_ERROR = 'Network connection error',
  CONTRACT_ERROR = 'Contract invocation error',
}

class ErrorHandler {
  async handleError(
    error: any,
    borrower: string,
    amount: bigint
  ): Promise<void> {
    // Log error
    this.logger.error('Auto-repay error', {
      borrower,
      amount,
      error: error.message,
      stack: error.stack,
    });

    // Determine if retryable
    const isRetryable = this.isRetryable(error);

    if (isRetryable) {
      // Add to retry queue
      this.retryQueue.add({
        borrower,
        amount,
        attempts: 0,
        maxAttempts: 3,
        nextRetry: Date.now() + 60_000, // 1 minute
      });
    } else {
      // Alert admin
      this.alerts.send({
        severity: 'critical',
        message: `Auto-repay failed for ${borrower}`,
        metadata: {
          borrower,
          amount: amount.toString(),
          error: error.message,
        },
      });
    }
  }

  private isRetryable(error: any): boolean {
    const retryableErrors = [
      'Network request failed',
      'timeout',
      'ECONNRESET',
      'Transaction simulation failed',
    ];

    return retryableErrors.some(msg =>
      error.message.includes(msg)
    );
  }
}
```

### 8. Monitoring & Metrics

**Feature**: Track bot performance and health

**Metrics**:
```typescript
interface AutoRepayMetrics {
  // Processing stats
  totalRepayments: number;
  successfulRepayments: number;
  failedRepayments: number;

  // Financial stats
  totalYieldProcessed: bigint;
  totalDebtRepaid: bigint;
  averageRepaymentAmount: bigint;

  // Performance stats
  averageProcessingTime: number; // ms
  lastProcessedLedger: number;
  lastProcessedTime: number;

  // Borrower stats
  activeBorrowers: number;
  eligibleBorrowers: number;
}

class MetricsCollector {
  private metrics: AutoRepayMetrics = {
    totalRepayments: 0,
    successfulRepayments: 0,
    failedRepayments: 0,
    totalYieldProcessed: 0n,
    totalDebtRepaid: 0n,
    averageRepaymentAmount: 0n,
    averageProcessingTime: 0,
    lastProcessedLedger: 0,
    lastProcessedTime: 0,
    activeBorrowers: 0,
    eligibleBorrowers: 0,
  };

  recordRepayment(
    success: boolean,
    amount: bigint,
    processingTime: number
  ): void {
    this.metrics.totalRepayments++;

    if (success) {
      this.metrics.successfulRepayments++;
      this.metrics.totalYieldProcessed += amount;
      this.metrics.totalDebtRepaid += amount;

      // Update average
      this.metrics.averageRepaymentAmount =
        this.metrics.totalDebtRepaid / BigInt(this.metrics.successfulRepayments);
    } else {
      this.metrics.failedRepayments++;
    }

    // Update processing time
    this.metrics.averageProcessingTime =
      (this.metrics.averageProcessingTime * (this.metrics.totalRepayments - 1) + processingTime)
      / this.metrics.totalRepayments;
  }

  getMetrics(): AutoRepayMetrics {
    return { ...this.metrics };
  }

  checkHealth(): void {
    // Check if bot is processing regularly
    const now = Date.now() / 1000;
    const staleness = now - this.metrics.lastProcessedTime;

    if (staleness > 600) { // 10 minutes
      console.warn(`⚠️ Auto-repay bot hasn't processed in ${staleness}s`);
    }

    // Check success rate
    const successRate = this.metrics.successfulRepayments /
      Math.max(this.metrics.totalRepayments, 1);

    if (successRate < 0.9) { // 90% threshold
      console.warn(`⚠️ Auto-repay success rate low: ${(successRate * 100).toFixed(1)}%`);
    }
  }
}
```

## Implementation

### File Structure

```
bots/
├── auto-repay-bot/
│   ├── src/
│   │   ├── index.ts              # Main entry point
│   │   ├── bot.ts                # AutoRepayBot class
│   │   ├── monitor/
│   │   │   ├── events.ts         # Event monitoring
│   │   │   └── borrowers.ts      # Borrower tracking
│   │   ├── processor/
│   │   │   ├── eligibility.ts    # Eligibility checking
│   │   │   └── batch.ts          # Batch processing
│   │   ├── executor/
│   │   │   ├── transaction.ts    # TX building & submission
│   │   │   └── retry.ts          # Retry logic
│   │   ├── triggers/
│   │   │   ├── event-based.ts    # Event trigger
│   │   │   ├── time-based.ts     # Time trigger
│   │   │   └── manual.ts         # Manual trigger
│   │   ├── monitoring/
│   │   │   ├── metrics.ts        # Metrics collection
│   │   │   ├── logger.ts         # Logging
│   │   │   └── alerts.ts         # Alert system
│   │   ├── admin/
│   │   │   └── api.ts            # Admin REST API
│   │   └── config/
│   │       ├── network.ts        # Network config
│   │       └── contracts.ts      # Contract addresses
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── eligibility.test.ts
│   │   │   └── batch.test.ts
│   │   └── integration/
│   │       └── end-to-end.test.ts
│   ├── borrowers.json            # Known borrowers list
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
```

### Main Bot Class

```typescript
// src/bot.ts
import { Logger } from './monitoring/logger';
import { MetricsCollector } from './monitoring/metrics';
import { EventMonitor } from './monitor/events';
import { BorrowerTracker } from './monitor/borrowers';
import { EligibilityChecker } from './processor/eligibility';
import { BatchProcessor } from './processor/batch';
import { RepaymentExecutor } from './executor/transaction';
import { NetworkConfig } from './config/network';

export class AutoRepayBot {
  private logger: Logger;
  private metrics: MetricsCollector;
  private eventMonitor: EventMonitor;
  private borrowerTracker: BorrowerTracker;
  private eligibilityChecker: EligibilityChecker;
  private batchProcessor: BatchProcessor;
  private executor: RepaymentExecutor;

  constructor(private config: NetworkConfig) {
    this.logger = new Logger('AutoRepayBot');
    this.metrics = new MetricsCollector();
    this.eventMonitor = new EventMonitor(config);
    this.borrowerTracker = new BorrowerTracker(config);
    this.eligibilityChecker = new EligibilityChecker(config);
    this.batchProcessor = new BatchProcessor();
    this.executor = new RepaymentExecutor(config);
  }

  async start(): Promise<void> {
    this.logger.info('Starting Auto-Repay Bot...');

    // Load known borrowers
    await this.borrowerTracker.loadBorrowers();

    // Start event monitoring (every 30 seconds)
    this.startEventMonitoring();

    // Start time-based fallback (every 5 minutes)
    this.startTimedProcessing();

    // Start health monitoring
    this.startHealthMonitoring();

    this.logger.info('Auto-Repay Bot started successfully');
  }

  private startEventMonitoring(): void {
    setInterval(async () => {
      try {
        const events = await this.eventMonitor.pollEvents();

        if (events.length > 0) {
          this.logger.info('Yield funded events detected', {
            count: events.length,
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

  private startTimedProcessing(): void {
    setInterval(async () => {
      this.logger.info('Timed processing trigger');
      await this.processAutoRepays();
    }, 5 * 60 * 1000); // 5 minutes
  }

  private async processAutoRepays(): Promise<void> {
    const startTime = Date.now();

    try {
      // 1. Get all known borrowers
      const borrowers = this.borrowerTracker.getBorrowers();
      this.logger.info('Processing auto-repays', {
        borrowers: borrowers.length,
      });

      // 2. Check eligibility
      const eligible = await this.eligibilityChecker.checkAllBorrowers(
        borrowers
      );

      this.logger.info('Eligible borrowers found', {
        eligible: eligible.length,
      });

      this.metrics.eligibleBorrowers = eligible.length;

      if (eligible.length === 0) {
        return;
      }

      // 3. Process batch
      const results = await this.batchProcessor.processBatch(eligible);

      // 4. Record metrics
      const processingTime = Date.now() - startTime;

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
```

## Testing Strategy

### Unit Tests

**1. Eligibility Checker Tests**
```typescript
// tests/unit/eligibility.test.ts
describe('EligibilityChecker', () => {
  it('should identify eligible borrower', async () => {
    // Mock borrower with loan and yield
    const mockLoan = {
      outstandingDebt: 100_000000n, // 100 USDC
    };
    const mockYield = 50_000000n; // 50 USDC

    const checker = new EligibilityChecker(mockConfig);

    // Mock contract calls
    jest.spyOn(checker['lendingPool'], 'getLoan')
      .mockResolvedValue(mockLoan);
    jest.spyOn(checker['vault'], 'getClaimableYield')
      .mockResolvedValue(mockYield);

    const result = await checker.checkBorrower('GABC...');

    expect(result.isEligible).toBe(true);
    expect(result.repaymentAmount).toBe(50_000000n);
  });

  it('should reject borrower with no loan', async () => {
    const checker = new EligibilityChecker(mockConfig);

    jest.spyOn(checker['lendingPool'], 'getLoan')
      .mockResolvedValue(null);

    const result = await checker.checkBorrower('GABC...');

    expect(result.isEligible).toBe(false);
  });

  it('should reject borrower with insufficient yield', async () => {
    const mockLoan = {
      outstandingDebt: 100_000000n,
    };
    const mockYield = 500_000n; // 0.5 USDC (below threshold)

    const checker = new EligibilityChecker(mockConfig);

    jest.spyOn(checker['lendingPool'], 'getLoan')
      .mockResolvedValue(mockLoan);
    jest.spyOn(checker['vault'], 'getClaimableYield')
      .mockResolvedValue(mockYield);

    const result = await checker.checkBorrower('GABC...');

    expect(result.isEligible).toBe(false);
  });

  it('should cap repayment at outstanding debt', async () => {
    const mockLoan = {
      outstandingDebt: 50_000000n, // 50 USDC debt
    };
    const mockYield = 100_000000n; // 100 USDC yield

    const checker = new EligibilityChecker(mockConfig);

    jest.spyOn(checker['lendingPool'], 'getLoan')
      .mockResolvedValue(mockLoan);
    jest.spyOn(checker['vault'], 'getClaimableYield')
      .mockResolvedValue(mockYield);

    const result = await checker.checkBorrower('GABC...');

    expect(result.isEligible).toBe(true);
    expect(result.repaymentAmount).toBe(50_000000n); // Capped at debt
  });
});
```

**2. Batch Processor Tests**
```typescript
// tests/unit/batch.test.ts
describe('BatchProcessor', () => {
  it('should process batch successfully', async () => {
    const eligible = [
      {
        address: 'GABC1...',
        repaymentAmount: 50_000000n,
        isEligible: true,
      },
      {
        address: 'GABC2...',
        repaymentAmount: 30_000000n,
        isEligible: true,
      },
    ];

    const processor = new BatchProcessor();
    const results = await processor.processBatch(eligible);

    expect(results.length).toBe(2);
    expect(results.every(r => r.success)).toBe(true);
  });

  it('should handle partial failures', async () => {
    // Mock one success, one failure
    const results = await processor.processBatch(eligible);

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    expect(successful.length).toBe(1);
    expect(failed.length).toBe(1);
  });
});
```

### Integration Tests

```typescript
// tests/integration/end-to-end.test.ts
describe('Auto-Repay Bot E2E', () => {
  it('should process auto-repay from yield funded to completion', async () => {
    // 1. Setup: Create borrower with loan and yield
    const borrower = await setupBorrowerWithLoanAndYield();

    // 2. Trigger: Emit YieldFunded event
    await vault.fundYield(100_000000n);

    // 3. Wait for bot to process
    await sleep(5000);

    // 4. Verify: Check loan was repaid
    const loan = await lendingPool.getLoan(borrower);
    expect(loan.outstandingDebt).toBeLessThan(initialDebt);

    // 5. Verify: Check yield was used
    const yield = await vault.getClaimableYield(borrower);
    expect(yield).toBe(0n);
  });
});
```

## Deployment

### Environment Configuration

```bash
# .env
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org:443
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Bot Configuration
BOT_SECRET_KEY=S...
VAULT_CONTRACT_ID=C...
LENDING_POOL_CONTRACT_ID=C...

# Processing Configuration
EVENT_POLL_INTERVAL_MS=30000
TIMED_PROCESS_INTERVAL_MS=300000
BATCH_SIZE=5
MIN_YIELD_THRESHOLD=1000000

# Server Configuration
PORT=3001
```

### Admin API

```typescript
// src/admin/api.ts
import express from 'express';

const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', bot: 'auto-repay' });
});

app.get('/metrics', (req, res) => {
  const metrics = bot.getMetrics();
  res.json(metrics);
});

app.post('/admin/trigger', async (req, res) => {
  try {
    await bot.processAutoRepays();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/admin/trigger/:borrower', async (req, res) => {
  const { borrower } = req.params;

  try {
    await bot.processBorrower(borrower);
    res.json({ success: true, borrower });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('Auto-Repay Admin API on port 3001');
});
```

## Key Technical Considerations

### 1. Contract Authorization

**Important**: The bot needs authorization to call `repay_loan` on behalf of borrowers.

**Solution**: The `repay_loan` function in the Lending Pool contract should allow:
```rust
// Allow bot to trigger repayment (bot pays gas, not borrower)
pub fn repay_loan(
    env: Env,
    borrower: Address,
    amount: i128,
) -> Result<(), ContractError> {
    // No auth check needed - anyone can pay someone else's debt
    // Borrower benefits, bot pays gas

    // Pull yield from vault (vault checks borrower auth)
    let yield_used = vault_client.pull_yield_for_repay(&borrower, &amount);

    // Reduce debt
    loan.outstanding_debt -= yield_used;

    Ok(())
}
```

### 2. Gas Optimization

**Challenge**: Each repayment costs gas

**Optimizations**:
- Skip borrowers with yield < minimum threshold
- Batch processing with delays
- Use simulation to estimate gas before submission
- Monitor gas prices and pause if too high

### 3. Borrower Discovery Trade-offs

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| Event tracking | Simple, no external deps | May miss historical borrowers | Hackathon |
| Off-chain indexer | Complete data, fast queries | Requires infrastructure | Production |
| Maintained list | Very simple | Manual updates needed | MVP/Testing |

### 4. Yield Timing

**Issue**: Yield may be funded in batches (weekly, monthly)

**Solution**: Bot should handle:
- Large batches of eligible borrowers at once
- Repeated processing if yield > all debts
- Cooldown periods between runs

## Summary

The Auto-Repay Bot is a **background automation service** that:

✅ **Monitors** vault yield funding events
✅ **Identifies** borrowers with loans and claimable yield
✅ **Executes** automatic loan repayments
✅ **Optimizes** gas costs through batching
✅ **Tracks** metrics and health

**Key Features**:
- Event-driven + time-based triggers
- Eligibility filtering
- Batch processing
- Error handling & retries
- Admin controls
- Comprehensive monitoring

**For Hackathon**: Focus on simple event tracking and single-borrower processing first, then add batching if time permits.

**Estimated Implementation Time**: 6-8 hours for core functionality + tests
