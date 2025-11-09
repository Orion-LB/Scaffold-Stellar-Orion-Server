# 🚨 Liquidation Bot - Technical Specification

## Overview

The Liquidation Bot is a critical risk management component that continuously monitors loan health and executes liquidations to protect lenders from bad debt. It implements a 3-warning progressive penalty system before liquidating undercollateralized loans.

## Purpose

**Monitor loan health and execute liquidations to protect lenders** from losses due to undercollateralized positions, while giving borrowers multiple opportunities to add collateral or repay debt.

## Architecture

```
┌─────────────────┐
│  Oracle Price   │
│  Updates        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Health Monitor │
│  - Fetch loans  │
│  - Calculate    │
│  - Check thres. │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Warning Manager │
│  - Track warns  │
│  - Issue new    │
│  - Check timing │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Liquidator     │
│  - Execute      │
│  - Claim reward │
│  - Distribute   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Lending Pool    │
│ Contract        │
└─────────────────┘
```

## Core Features

### 1. Health Factor Calculation

**Feature**: Calculate real-time health factor for all loans

**Formula**:
```
Health Factor = Collateral Value / Total Debt

Where:
- Collateral Value = collateral_amount × stRWA_price (from Oracle)
- Total Debt = outstanding_debt + penalties
```

**Implementation**:
```typescript
interface HealthFactor {
  borrower: string;
  collateralAmount: bigint;      // stRWA tokens
  collateralValue: bigint;        // USDC value
  outstandingDebt: bigint;        // USDC
  penalties: bigint;              // USDC
  totalDebt: bigint;              // outstanding + penalties
  healthFactor: number;           // Decimal (1.5 = 150%)
  price: bigint;                  // stRWA price in USDC
  isHealthy: boolean;
  needsWarning: boolean;
  needsLiquidation: boolean;
}

class HealthCalculator {
  async calculateHealth(
    borrower: string,
    loan: Loan,
    price: bigint
  ): Promise<HealthFactor> {
    // Price has 6 decimals (USDC)
    // Collateral has 18 decimals (stRWA)
    // Need to normalize to same decimals

    // Collateral value in USDC (6 decimals)
    const collateralValue = (loan.collateralAmount * price) / 1_000_000_000_000_000_000n;

    // Total debt
    const totalDebt = loan.outstandingDebt + loan.penalties;

    // Health factor as decimal
    let healthFactor = 0;
    if (totalDebt > 0n) {
      // Convert to decimal with 2 decimal places
      healthFactor = Number(collateralValue * 100n / totalDebt) / 100;
    } else {
      healthFactor = Infinity; // No debt = infinite health
    }

    return {
      borrower,
      collateralAmount: loan.collateralAmount,
      collateralValue,
      outstandingDebt: loan.outstandingDebt,
      penalties: loan.penalties,
      totalDebt,
      healthFactor,
      price,
      isHealthy: healthFactor >= 1.5,
      needsWarning: healthFactor < 1.5 && healthFactor > 1.1,
      needsLiquidation: healthFactor <= 1.1,
    };
  }
}
```

**Edge Cases**:
```typescript
// Handle division by zero
if (totalDebt === 0n) {
  return Infinity; // No debt = healthy
}

// Handle very small amounts (dust)
const MIN_DEBT = 1_000_000n; // 1 USDC
if (totalDebt < MIN_DEBT) {
  return Infinity; // Dust is not worth liquidating
}

// Handle price staleness
const now = Date.now() / 1000;
if (now - priceTimestamp > 24 * 3600) {
  throw new Error('Oracle price is stale, cannot calculate health');
}
```

### 2. Progressive Warning System

**Feature**: 3-warning system before liquidation

**Warning Thresholds**:
```typescript
interface WarningConfig {
  warning1Threshold: number;      // 1.5 (150% health)
  warning2Threshold: number;      // 1.2 (120% health)
  warning3Threshold: number;      // 1.1 (110% health) - final warning
  liquidationThreshold: number;   // 1.1 (110% health)

  timeBetweenWarnings: number;    // 2 weeks (1,209,600 seconds)
  penaltyPercent: number;         // 2% of outstanding debt
}

const WARNING_CONFIG: WarningConfig = {
  warning1Threshold: 1.5,
  warning2Threshold: 1.2,
  warning3Threshold: 1.1,
  liquidationThreshold: 1.1,
  timeBetweenWarnings: 14 * 24 * 3600, // 2 weeks
  penaltyPercent: 2, // 2%
};
```

**Warning State Machine**:
```typescript
enum WarningState {
  HEALTHY = 'HEALTHY',           // Health >= 1.5, no warnings
  WARNING_1 = 'WARNING_1',       // Health < 1.5 or 2 weeks no payment
  WARNING_2 = 'WARNING_2',       // Health < 1.2 or 4 weeks no payment
  WARNING_3 = 'WARNING_3',       // Health < 1.1 - FINAL WARNING
  LIQUIDATABLE = 'LIQUIDATABLE', // Health <= 1.1
}

class WarningManager {
  determineWarningState(
    health: HealthFactor,
    loan: Loan,
    currentTime: number
  ): WarningState {
    const timeSinceLastPayment = currentTime - loan.lastPaymentTime;
    const twoWeeks = WARNING_CONFIG.timeBetweenWarnings;

    // Liquidatable
    if (health.healthFactor <= WARNING_CONFIG.liquidationThreshold) {
      return WarningState.LIQUIDATABLE;
    }

    // Warning 3 (Final)
    if (health.healthFactor <= WARNING_CONFIG.warning3Threshold) {
      return WarningState.WARNING_3;
    }

    // Warning 2
    if (
      health.healthFactor <= WARNING_CONFIG.warning2Threshold ||
      (loan.warningsIssued >= 1 && timeSinceLastPayment >= twoWeeks * 2)
    ) {
      return WarningState.WARNING_2;
    }

    // Warning 1
    if (
      health.healthFactor <= WARNING_CONFIG.warning1Threshold ||
      timeSinceLastPayment >= twoWeeks
    ) {
      return WarningState.WARNING_1;
    }

    // Healthy
    return WarningState.HEALTHY;
  }

  shouldIssueWarning(
    currentState: WarningState,
    loan: Loan,
    currentTime: number
  ): boolean {
    // Already issued max warnings
    if (loan.warningsIssued >= 3) {
      return false;
    }

    // Check if enough time passed since last warning
    const timeSinceLastWarning = currentTime - loan.lastWarningTime;

    switch (currentState) {
      case WarningState.WARNING_1:
        return loan.warningsIssued === 0;

      case WarningState.WARNING_2:
        return (
          loan.warningsIssued === 1 &&
          timeSinceLastWarning >= WARNING_CONFIG.timeBetweenWarnings
        );

      case WarningState.WARNING_3:
        return (
          loan.warningsIssued === 2 &&
          timeSinceLastWarning >= WARNING_CONFIG.timeBetweenWarnings
        );

      default:
        return false;
    }
  }
}
```

### 3. Warning Issuance

**Feature**: Issue warnings on-chain via contract call

**Contract Interaction**:
```rust
// In Lending Pool contract
pub fn check_and_issue_warning(
    env: Env,
    borrower: Address,
) -> Result<bool, ContractError> {
    let mut loan = get_loan(&env, &borrower)?;

    // Calculate health
    let health = calculate_health_factor(&env, &loan)?;

    // Check if warning needed
    if should_issue_warning(&env, &loan, health) {
        loan.warnings_issued += 1;
        loan.last_warning_time = env.ledger().timestamp();

        // Apply 2% penalty
        let penalty = (loan.outstanding_debt * 2) / 100;
        loan.penalties += penalty;

        // Save
        save_loan(&env, &borrower, &loan);

        // Emit event
        env.events().publish((
            Symbol::new(&env, "warning_issued"),
            borrower.clone(),
            loan.warnings_issued,
            penalty,
        ));

        Ok(true)
    } else {
        Ok(false)
    }
}
```

**Bot Implementation**:
```typescript
class WarningExecutor {
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
      networkPassphrase: this.networkPassphrase,
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
```

### 4. Liquidation Execution

**Feature**: Execute liquidations at 110% threshold

**Contract Interaction**:
```rust
// In Lending Pool contract
pub fn liquidate_loan(
    env: Env,
    liquidator: Address,
    borrower: Address,
) -> Result<(), ContractError> {
    let loan = get_loan(&env, &borrower)?;

    // Calculate health
    let health = calculate_health_factor(&env, &loan)?;

    // Check liquidation threshold
    if health > 1100 { // 110% in basis points
        return Err(ContractError::LoanStillHealthy);
    }

    // Calculate liquidator reward (10% of collateral)
    let collateral_value = calculate_collateral_value(&env, &loan)?;
    let liquidator_reward = (collateral_value * 10) / 100;

    // Transfer collateral to pool
    let strwa_client = StRwaTokenClient::new(&env, &loan.strwa_token);
    strwa_client.transfer(
        &env.current_contract_address(),
        &env.current_contract_address(),
        &loan.collateral_amount,
    );

    // Pay liquidator reward in USDC
    let usdc_client = UsdcClient::new(&env, &get_usdc_address(&env));
    usdc_client.transfer(
        &env.current_contract_address(),
        &liquidator,
        &liquidator_reward,
    );

    // Mark borrower as not a borrower in vault
    let vault_client = VaultClient::new(&env, &get_vault_address(&env));
    vault_client.mark_as_borrower(&borrower, &0, &0);

    // Remove loan
    remove_loan(&env, &borrower);

    // Emit event
    env.events().publish((
        Symbol::new(&env, "loan_liquidated"),
        borrower.clone(),
        liquidator.clone(),
        loan.collateral_amount,
        liquidator_reward,
    ));

    Ok(())
}
```

**Bot Implementation**:
```typescript
class LiquidationExecutor {
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
      networkPassphrase: this.networkPassphrase,
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
```

### 5. Borrower Discovery

**Feature**: Efficiently track all active borrowers

**Challenge**: Same as Auto-Repay Bot - no built-in indexing

**Solutions**:

**Option A: Shared Registry** (Recommended for hackathon)
```typescript
// Share borrowers.json with Auto-Repay Bot
class BorrowerRegistry {
  private borrowers: string[] = [];

  constructor(registryPath: string = './borrowers.json') {
    this.borrowers = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  }

  async getActiveBorrowers(): Promise<string[]> {
    // Filter to only those with active loans
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

**Option B: Event-Based Tracking**
```typescript
class LoanEventTracker {
  private activeBorrowers: Set<string> = new Set();

  async trackFromEvents(): Promise<void> {
    // Track loan originations
    const originationEvents = await this.getEvents('loan_originated');
    for (const event of originationEvents) {
      this.activeBorrowers.add(event.borrower);
    }

    // Remove closed loans
    const closedEvents = await this.getEvents('loan_closed');
    for (const event of closedEvents) {
      this.activeBorrowers.delete(event.borrower);
    }

    // Remove liquidated loans
    const liquidatedEvents = await this.getEvents('loan_liquidated');
    for (const event of liquidatedEvents) {
      this.activeBorrowers.delete(event.borrower);
    }
  }

  getActiveBorrowers(): string[] {
    return Array.from(this.activeBorrowers);
  }
}
```

### 6. Monitoring Loop

**Feature**: Continuous health monitoring with configurable frequency

**Implementation**:
```typescript
class LiquidationBot {
  private monitoringInterval: NodeJS.Timeout | null = null;

  async start(): Promise<void> {
    this.logger.info('Starting Liquidation Bot...');

    // Load borrowers
    await this.borrowerRegistry.load();

    // Start monitoring loop
    this.startMonitoringLoop();

    // Start health monitoring
    this.startHealthCheck();

    this.logger.info('Liquidation Bot started successfully');
  }

  private startMonitoringLoop(): void {
    // Monitor every 15 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.monitorAllLoans();
    }, 15_000); // 15 seconds

    // Initial run
    this.monitorAllLoans();
  }

  private async monitorAllLoans(): Promise<void> {
    const startTime = Date.now();

    try {
      // 1. Get active borrowers
      const borrowers = await this.borrowerRegistry.getActiveBorrowers();

      this.logger.info('Monitoring loans', { count: borrowers.length });

      // 2. Get current oracle price
      const price = await this.oracle.getPrice(this.stRwaTokenAddress);

      // 3. Check each loan
      const results: MonitoringResult[] = [];

      for (const borrower of borrowers) {
        try {
          const result = await this.monitorLoan(borrower, price);
          results.push(result);
        } catch (error: any) {
          this.logger.error('Failed to monitor loan', {
            borrower,
            error: error.message,
          });

          results.push({
            borrower,
            success: false,
            error: error.message,
          });
        }
      }

      // 4. Record metrics
      const processingTime = Date.now() - startTime;

      this.metrics.recordMonitoringCycle({
        borrowersChecked: borrowers.length,
        warningsIssued: results.filter(r => r.warningIssued).length,
        liquidationsExecuted: results.filter(r => r.liquidated).length,
        errors: results.filter(r => !r.success).length,
        processingTime,
      });

      this.logger.info('Monitoring cycle completed', {
        borrowers: borrowers.length,
        warnings: results.filter(r => r.warningIssued).length,
        liquidations: results.filter(r => r.liquidated).length,
        time: processingTime,
      });

    } catch (error: any) {
      this.logger.error('Monitoring cycle failed', {
        error: error.message,
      });
    }
  }

  private async monitorLoan(
    borrower: string,
    price: bigint
  ): Promise<MonitoringResult> {
    // 1. Get loan
    const loan = await this.lendingPool.getLoan(borrower);

    if (!loan) {
      return {
        borrower,
        success: true,
        healthy: true,
        healthFactor: Infinity,
      };
    }

    // 2. Calculate health
    const health = await this.healthCalculator.calculateHealth(
      borrower,
      loan,
      price
    );

    // 3. Check if liquidation needed
    if (health.needsLiquidation) {
      this.logger.warn('Loan needs liquidation', {
        borrower,
        healthFactor: health.healthFactor,
      });

      const liquidationResult = await this.liquidationExecutor.liquidateLoan(
        borrower
      );

      return {
        borrower,
        success: true,
        healthy: false,
        healthFactor: health.healthFactor,
        liquidated: true,
        reward: liquidationResult.reward,
        txHash: liquidationResult.txHash,
      };
    }

    // 4. Check if warning needed
    const currentTime = Date.now() / 1000;
    const warningState = this.warningManager.determineWarningState(
      health,
      loan,
      currentTime
    );

    if (this.warningManager.shouldIssueWarning(warningState, loan, currentTime)) {
      this.logger.warn('Issuing warning', {
        borrower,
        warningState,
        healthFactor: health.healthFactor,
      });

      const txHash = await this.warningExecutor.issueWarning(borrower);

      return {
        borrower,
        success: true,
        healthy: false,
        healthFactor: health.healthFactor,
        warningIssued: true,
        warningState,
        txHash,
      };
    }

    // 5. Loan is healthy
    return {
      borrower,
      success: true,
      healthy: true,
      healthFactor: health.healthFactor,
    };
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping Liquidation Bot...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.logger.info('Liquidation Bot stopped');
  }
}
```

### 7. Notification System

**Feature**: Notify borrowers of warnings and liquidations

**On-Chain Events** (Primary for hackathon):
```rust
// Contract emits events
env.events().publish((
    Symbol::new(&env, "warning_issued"),
    borrower.clone(),
    warnings_issued,
    penalty,
    health_factor,
));

env.events().publish((
    Symbol::new(&env, "loan_liquidated"),
    borrower.clone(),
    liquidator.clone(),
    collateral_seized,
    liquidator_reward,
));
```

**Frontend Integration**:
```typescript
// Frontend listens to contract events
class NotificationService {
  async subscribeToWarnings(borrowerAddress: string): Promise<void> {
    // Poll for events related to this borrower
    const events = await this.server.getEvents({
      filters: [
        {
          type: 'contract',
          contractIds: [this.lendingPoolId],
          topics: [['*', 'warning_issued']],
        },
      ],
    });

    for (const event of events) {
      if (event.borrower === borrowerAddress) {
        this.displayWarning(event);
      }
    }
  }

  private displayWarning(event: any): void {
    const notification = {
      type: 'warning',
      severity: this.getWarningSeverity(event.warningsIssued),
      title: `Warning ${event.warningsIssued}/3 Issued`,
      message: `Your loan health is low. Penalty: ${event.penalty} USDC`,
      healthFactor: event.healthFactor,
      actions: [
        { label: 'Add Collateral', action: 'addCollateral' },
        { label: 'Repay Debt', action: 'repayDebt' },
      ],
    };

    // Display in UI
    this.showNotification(notification);
  }

  private getWarningSeverity(warningCount: number): string {
    switch (warningCount) {
      case 1:
        return 'info';
      case 2:
        return 'warning';
      case 3:
        return 'critical';
      default:
        return 'info';
    }
  }
}
```

**Off-Chain Notifications** (Optional, for production):
```typescript
class OffChainNotifier {
  async sendEmail(borrower: string, warning: WarningEvent): Promise<void> {
    // Requires borrower to register email
    const email = await this.getUserEmail(borrower);

    if (!email) return;

    await this.emailService.send({
      to: email,
      subject: `Loan Warning ${warning.count}/3`,
      body: `
        Your loan health is low: ${warning.healthFactor.toFixed(2)}

        Penalty applied: ${warning.penalty} USDC

        Action needed:
        - Add more collateral
        - Repay some debt

        If health falls to 1.1, your loan will be liquidated.
      `,
    });
  }

  async sendPushNotification(
    borrower: string,
    notification: Notification
  ): Promise<void> {
    // Use Firebase Cloud Messaging or similar
    await this.pushService.send({
      to: borrower,
      title: notification.title,
      body: notification.message,
      data: notification,
    });
  }
}
```

### 8. Reward Economics & Profitability

**Feature**: Ensure bot operation is economically viable

**Reward Calculation**:
```typescript
interface LiquidationEconomics {
  collateralValue: bigint;        // USDC value of collateral
  liquidatorReward: bigint;       // 10% of collateral value
  gasCost: bigint;                // Estimated gas cost
  profit: bigint;                 // Reward - gas
  isProfitable: boolean;
}

class EconomicsCalculator {
  async analyzeLiquidation(
    health: HealthFactor
  ): Promise<LiquidationEconomics> {
    // Calculate reward (10% of collateral value)
    const liquidatorReward = (health.collateralValue * 10n) / 100n;

    // Estimate gas cost
    // Simplified - would need actual gas estimation
    const gasCost = 5_000000n; // Assume 5 USDC gas cost

    // Calculate profit
    const profit = liquidatorReward - gasCost;

    return {
      collateralValue: health.collateralValue,
      liquidatorReward,
      gasCost,
      profit,
      isProfitable: profit > 0n,
    };
  }

  shouldLiquidate(economics: LiquidationEconomics): boolean {
    // Only liquidate if profitable
    // Add minimum profit threshold
    const MIN_PROFIT = 1_000000n; // 1 USDC minimum profit

    return economics.profit >= MIN_PROFIT;
  }
}
```

**Gas Optimization**:
```typescript
class GasOptimizer {
  async estimateGasCost(borrower: string): Promise<bigint> {
    // Build liquidation transaction
    const tx = await this.buildLiquidationTx(borrower);

    // Simulate to get gas estimate
    const simulated = await this.server.simulateTransaction(tx);

    if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      // Extract gas cost from simulation
      // Stellar uses resource fees, not traditional gas
      const resourceFee = simulated.minResourceFee || '0';
      return BigInt(resourceFee);
    }

    // Fallback estimate
    return 5_000000n; // 5 USDC
  }

  async shouldDelayLiquidation(
    economics: LiquidationEconomics,
    health: HealthFactor
  ): Promise<boolean> {
    // If health is very close to threshold, might wait for it to worsen
    // More collateral = more reward
    const DELAY_THRESHOLD = 1.09; // Wait if health > 1.09

    if (health.healthFactor > DELAY_THRESHOLD) {
      // Check if waiting might be more profitable
      // (More debt accumulation = lower health = more collateral to seize)
      return true;
    }

    return false;
  }
}
```

### 9. Monitoring & Metrics

**Feature**: Track bot performance and profitability

**Metrics**:
```typescript
interface LiquidationMetrics {
  // Monitoring stats
  totalCycles: number;
  borrowersChecked: number;
  averageCheckTime: number;          // ms per borrower

  // Warning stats
  totalWarningsIssued: number;
  warning1Count: number;
  warning2Count: number;
  warning3Count: number;

  // Liquidation stats
  totalLiquidations: number;
  successfulLiquidations: number;
  failedLiquidations: number;

  // Financial stats
  totalRewardsEarned: bigint;        // USDC
  totalGasSpent: bigint;             // USDC equivalent
  totalProfit: bigint;               // Rewards - Gas
  averageRewardPerLiquidation: bigint;

  // Health stats
  averageHealthFactor: number;
  lowestHealthFactor: number;
  lowestHealthBorrower: string;

  // Performance
  lastCycleTime: number;
  cyclesPerHour: number;
}

class MetricsCollector {
  private metrics: LiquidationMetrics = {
    totalCycles: 0,
    borrowersChecked: 0,
    averageCheckTime: 0,
    totalWarningsIssued: 0,
    warning1Count: 0,
    warning2Count: 0,
    warning3Count: 0,
    totalLiquidations: 0,
    successfulLiquidations: 0,
    failedLiquidations: 0,
    totalRewardsEarned: 0n,
    totalGasSpent: 0n,
    totalProfit: 0n,
    averageRewardPerLiquidation: 0n,
    averageHealthFactor: 0,
    lowestHealthFactor: Infinity,
    lowestHealthBorrower: '',
    lastCycleTime: 0,
    cyclesPerHour: 0,
  };

  recordMonitoringCycle(cycle: MonitoringCycleResult): void {
    this.metrics.totalCycles++;
    this.metrics.borrowersChecked += cycle.borrowersChecked;
    this.metrics.lastCycleTime = Date.now() / 1000;

    // Update average check time
    this.metrics.averageCheckTime =
      (this.metrics.averageCheckTime * (this.metrics.totalCycles - 1) +
        cycle.processingTime / cycle.borrowersChecked) /
      this.metrics.totalCycles;

    // Update cycles per hour
    const hoursRunning = (Date.now() / 1000 - this.startTime) / 3600;
    this.metrics.cyclesPerHour = this.metrics.totalCycles / hoursRunning;
  }

  recordWarning(warningCount: number): void {
    this.metrics.totalWarningsIssued++;

    switch (warningCount) {
      case 1:
        this.metrics.warning1Count++;
        break;
      case 2:
        this.metrics.warning2Count++;
        break;
      case 3:
        this.metrics.warning3Count++;
        break;
    }
  }

  recordLiquidation(
    success: boolean,
    reward: bigint,
    gasCost: bigint
  ): void {
    this.metrics.totalLiquidations++;

    if (success) {
      this.metrics.successfulLiquidations++;
      this.metrics.totalRewardsEarned += reward;
      this.metrics.totalGasSpent += gasCost;
      this.metrics.totalProfit += reward - gasCost;

      // Update average reward
      this.metrics.averageRewardPerLiquidation =
        this.metrics.totalRewardsEarned /
        BigInt(this.metrics.successfulLiquidations);
    } else {
      this.metrics.failedLiquidations++;
      this.metrics.totalGasSpent += gasCost; // Still spent gas on failure
    }
  }

  recordHealthFactor(borrower: string, healthFactor: number): void {
    if (healthFactor < this.metrics.lowestHealthFactor) {
      this.metrics.lowestHealthFactor = healthFactor;
      this.metrics.lowestHealthBorrower = borrower;
    }
  }

  getMetrics(): LiquidationMetrics {
    return { ...this.metrics };
  }

  checkHealth(): void {
    // Check if bot is running regularly
    const now = Date.now() / 1000;
    const staleness = now - this.metrics.lastCycleTime;

    if (staleness > 60) {
      // 1 minute
      console.warn(
        `⚠️ Liquidation bot hasn't run in ${staleness}s`
      );
    }

    // Check success rate
    const successRate =
      this.metrics.successfulLiquidations /
      Math.max(this.metrics.totalLiquidations, 1);

    if (successRate < 0.95) {
      // 95% threshold
      console.warn(
        `⚠️ Liquidation success rate low: ${(successRate * 100).toFixed(1)}%`
      );
    }

    // Check profitability
    if (this.metrics.totalLiquidations > 0) {
      const averageProfit =
        this.metrics.totalProfit /
        BigInt(this.metrics.successfulLiquidations);

      if (averageProfit < 0n) {
        console.error('❌ Bot is losing money on liquidations!');
      }
    }
  }
}
```

## Implementation

### File Structure

```
bots/
├── liquidation-bot/
│   ├── src/
│   │   ├── index.ts              # Main entry point
│   │   ├── bot.ts                # LiquidationBot class
│   │   ├── calculator/
│   │   │   ├── health.ts         # Health factor calculation
│   │   │   └── economics.ts      # Reward & profitability
│   │   ├── manager/
│   │   │   ├── warning.ts        # Warning state machine
│   │   │   └── borrowers.ts      # Borrower tracking
│   │   ├── executor/
│   │   │   ├── warning.ts        # Warning issuance
│   │   │   ├── liquidation.ts    # Liquidation execution
│   │   │   └── transaction.ts    # TX building & submission
│   │   ├── notifier/
│   │   │   ├── events.ts         # On-chain event parsing
│   │   │   └── offchain.ts       # Email, SMS, push (optional)
│   │   ├── monitoring/
│   │   │   ├── metrics.ts        # Metrics collection
│   │   │   ├── logger.ts         # Logging
│   │   │   └── alerts.ts         # Alert system
│   │   ├── admin/
│   │   │   └── api.ts            # Admin REST API
│   │   └── config/
│   │       ├── network.ts        # Network config
│   │       ├── contracts.ts      # Contract addresses
│   │       └── thresholds.ts     # Warning thresholds
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── health.test.ts
│   │   │   ├── warning.test.ts
│   │   │   └── economics.test.ts
│   │   └── integration/
│   │       └── end-to-end.test.ts
│   ├── borrowers.json            # Shared with auto-repay-bot
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
```

### Main Bot Class

```typescript
// src/bot.ts
import { Logger } from './monitoring/logger';
import { MetricsCollector } from './monitoring/metrics';
import { HealthCalculator } from './calculator/health';
import { EconomicsCalculator } from './calculator/economics';
import { WarningManager } from './manager/warning';
import { BorrowerRegistry } from './manager/borrowers';
import { WarningExecutor } from './executor/warning';
import { LiquidationExecutor } from './executor/liquidation';
import { OracleClient } from './clients/oracle';
import { LendingPoolClient } from './clients/lending-pool';
import { NetworkConfig } from './config/network';

export class LiquidationBot {
  private logger: Logger;
  public metrics: MetricsCollector;
  private healthCalculator: HealthCalculator;
  private economicsCalculator: EconomicsCalculator;
  private warningManager: WarningManager;
  private borrowerRegistry: BorrowerRegistry;
  private warningExecutor: WarningExecutor;
  private liquidationExecutor: LiquidationExecutor;
  private oracle: OracleClient;
  private lendingPool: LendingPoolClient;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(private config: NetworkConfig) {
    this.logger = new Logger('LiquidationBot');
    this.metrics = new MetricsCollector();
    this.healthCalculator = new HealthCalculator();
    this.economicsCalculator = new EconomicsCalculator();
    this.warningManager = new WarningManager();
    this.borrowerRegistry = new BorrowerRegistry(config);
    this.warningExecutor = new WarningExecutor(config);
    this.liquidationExecutor = new LiquidationExecutor(config);
    this.oracle = new OracleClient(config);
    this.lendingPool = new LendingPoolClient(config);
  }

  async start(): Promise<void> {
    this.logger.info('Starting Liquidation Bot...');

    // Load borrowers
    await this.borrowerRegistry.load();

    // Start monitoring loop (every 15 seconds)
    this.startMonitoringLoop();

    // Start health monitoring
    this.startHealthCheck();

    this.logger.info('Liquidation Bot started successfully');
  }

  private startMonitoringLoop(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.monitorAllLoans();
    }, 15_000); // 15 seconds

    // Initial run
    this.monitorAllLoans();
  }

  private async monitorAllLoans(): Promise<void> {
    const startTime = Date.now();

    try {
      // 1. Get active borrowers
      const borrowers = await this.borrowerRegistry.getActiveBorrowers();

      this.logger.info('Monitoring loans', { count: borrowers.length });

      // 2. Get current oracle price
      const [price, priceTimestamp] = await this.oracle.getPrice(
        this.config.stRwaTokenAddress
      );

      // Check price freshness
      const now = Date.now() / 1000;
      if (now - priceTimestamp > 24 * 3600) {
        this.logger.error('Oracle price is stale, skipping cycle');
        return;
      }

      // 3. Check each loan
      const results: MonitoringResult[] = [];

      for (const borrower of borrowers) {
        try {
          const result = await this.monitorLoan(borrower, price);
          results.push(result);
        } catch (error: any) {
          this.logger.error('Failed to monitor loan', {
            borrower,
            error: error.message,
          });

          results.push({
            borrower,
            success: false,
            error: error.message,
          });
        }
      }

      // 4. Record metrics
      const processingTime = Date.now() - startTime;

      this.metrics.recordMonitoringCycle({
        borrowersChecked: borrowers.length,
        warningsIssued: results.filter(r => r.warningIssued).length,
        liquidationsExecuted: results.filter(r => r.liquidated).length,
        errors: results.filter(r => !r.success).length,
        processingTime,
      });

      // 5. Log summary
      this.logger.info('Monitoring cycle completed', {
        borrowers: borrowers.length,
        warnings: results.filter(r => r.warningIssued).length,
        liquidations: results.filter(r => r.liquidated).length,
        time: processingTime,
      });

    } catch (error: any) {
      this.logger.error('Monitoring cycle failed', {
        error: error.message,
      });
    }
  }

  private async monitorLoan(
    borrower: string,
    price: bigint
  ): Promise<MonitoringResult> {
    // 1. Get loan
    const loan = await this.lendingPool.getLoan(borrower);

    if (!loan) {
      return {
        borrower,
        success: true,
        healthy: true,
        healthFactor: Infinity,
      };
    }

    // 2. Calculate health
    const health = await this.healthCalculator.calculateHealth(
      borrower,
      loan,
      price
    );

    // Record health factor
    this.metrics.recordHealthFactor(borrower, health.healthFactor);

    // 3. Check if liquidation needed
    if (health.needsLiquidation) {
      // Check economics
      const economics = await this.economicsCalculator.analyzeLiquidation(
        health
      );

      if (!economics.isProfitable) {
        this.logger.warn('Liquidation not profitable, skipping', {
          borrower,
          reward: economics.liquidatorReward.toString(),
          gasCost: economics.gasCost.toString(),
        });

        return {
          borrower,
          success: true,
          healthy: false,
          healthFactor: health.healthFactor,
          skippedUnprofitable: true,
        };
      }

      this.logger.warn('Executing liquidation', {
        borrower,
        healthFactor: health.healthFactor,
        reward: economics.liquidatorReward.toString(),
        profit: economics.profit.toString(),
      });

      const liquidationResult = await this.liquidationExecutor.liquidateLoan(
        borrower
      );

      this.metrics.recordLiquidation(
        liquidationResult.success,
        liquidationResult.reward,
        economics.gasCost
      );

      return {
        borrower,
        success: true,
        healthy: false,
        healthFactor: health.healthFactor,
        liquidated: true,
        reward: liquidationResult.reward,
        txHash: liquidationResult.txHash,
      };
    }

    // 4. Check if warning needed
    const currentTime = Date.now() / 1000;
    const warningState = this.warningManager.determineWarningState(
      health,
      loan,
      currentTime
    );

    if (
      this.warningManager.shouldIssueWarning(warningState, loan, currentTime)
    ) {
      this.logger.warn('Issuing warning', {
        borrower,
        warningState,
        healthFactor: health.healthFactor,
        warningsIssued: loan.warningsIssued,
      });

      const txHash = await this.warningExecutor.issueWarning(borrower);

      this.metrics.recordWarning(loan.warningsIssued + 1);

      return {
        borrower,
        success: true,
        healthy: false,
        healthFactor: health.healthFactor,
        warningIssued: true,
        warningState,
        txHash,
      };
    }

    // 5. Loan is healthy
    return {
      borrower,
      success: true,
      healthy: true,
      healthFactor: health.healthFactor,
    };
  }

  private startHealthCheck(): void {
    setInterval(() => {
      this.metrics.checkHealth();
    }, 60_000); // Every minute
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping Liquidation Bot...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.logger.info('Liquidation Bot stopped');
  }
}
```

## Testing Strategy

### Unit Tests

**1. Health Calculator Tests**
```typescript
// tests/unit/health.test.ts
describe('HealthCalculator', () => {
  let calculator: HealthCalculator;

  beforeEach(() => {
    calculator = new HealthCalculator();
  });

  it('should calculate health factor correctly', async () => {
    const loan = {
      collateralAmount: 200_000000000000000000n, // 200 stRWA
      outstandingDebt: 100_000000n,              // 100 USDC
      penalties: 0n,
    };

    const price = 1_000000n; // 1 USDC per stRWA

    const health = await calculator.calculateHealth('GABC...', loan, price);

    expect(health.healthFactor).toBe(2.0); // 200 / 100 = 2.0
    expect(health.isHealthy).toBe(true);
    expect(health.needsLiquidation).toBe(false);
  });

  it('should identify unhealthy loan', async () => {
    const loan = {
      collateralAmount: 105_000000000000000000n, // 105 stRWA
      outstandingDebt: 100_000000n,              // 100 USDC
      penalties: 0n,
    };

    const price = 1_000000n;

    const health = await calculator.calculateHealth('GABC...', loan, price);

    expect(health.healthFactor).toBe(1.05); // 105 / 100 = 1.05
    expect(health.isHealthy).toBe(false);
    expect(health.needsLiquidation).toBe(true);
  });

  it('should include penalties in health calculation', async () => {
    const loan = {
      collateralAmount: 200_000000000000000000n,
      outstandingDebt: 100_000000n,
      penalties: 50_000000n, // 50 USDC penalty
    };

    const price = 1_000000n;

    const health = await calculator.calculateHealth('GABC...', loan, price);

    // Health = 200 / (100 + 50) = 1.33
    expect(health.healthFactor).toBeCloseTo(1.33, 2);
  });

  it('should handle zero debt', async () => {
    const loan = {
      collateralAmount: 200_000000000000000000n,
      outstandingDebt: 0n,
      penalties: 0n,
    };

    const price = 1_000000n;

    const health = await calculator.calculateHealth('GABC...', loan, price);

    expect(health.healthFactor).toBe(Infinity);
    expect(health.isHealthy).toBe(true);
  });
});
```

**2. Warning Manager Tests**
```typescript
// tests/unit/warning.test.ts
describe('WarningManager', () => {
  let manager: WarningManager;

  beforeEach(() => {
    manager = new WarningManager();
  });

  it('should determine warning state based on health', () => {
    const health = { healthFactor: 1.4 };
    const loan = { warningsIssued: 0 };
    const currentTime = Date.now() / 1000;

    const state = manager.determineWarningState(health, loan, currentTime);

    expect(state).toBe(WarningState.WARNING_1);
  });

  it('should determine liquidatable state', () => {
    const health = { healthFactor: 1.09 };
    const loan = { warningsIssued: 3 };
    const currentTime = Date.now() / 1000;

    const state = manager.determineWarningState(health, loan, currentTime);

    expect(state).toBe(WarningState.LIQUIDATABLE);
  });

  it('should issue warning when needed', () => {
    const state = WarningState.WARNING_1;
    const loan = {
      warningsIssued: 0,
      lastWarningTime: 0,
    };
    const currentTime = Date.now() / 1000;

    const should = manager.shouldIssueWarning(state, loan, currentTime);

    expect(should).toBe(true);
  });

  it('should not issue duplicate warnings', () => {
    const state = WarningState.WARNING_1;
    const loan = {
      warningsIssued: 1,
      lastWarningTime: Date.now() / 1000,
    };
    const currentTime = Date.now() / 1000;

    const should = manager.shouldIssueWarning(state, loan, currentTime);

    expect(should).toBe(false);
  });
});
```

**3. Economics Calculator Tests**
```typescript
// tests/unit/economics.test.ts
describe('EconomicsCalculator', () => {
  let calculator: EconomicsCalculator;

  beforeEach(() => {
    calculator = new EconomicsCalculator();
  });

  it('should calculate liquidation reward', async () => {
    const health = {
      collateralValue: 100_000000n, // 100 USDC collateral value
    };

    const economics = await calculator.analyzeLiquidation(health);

    expect(economics.liquidatorReward).toBe(10_000000n); // 10% = 10 USDC
  });

  it('should identify profitable liquidation', async () => {
    const health = {
      collateralValue: 100_000000n, // Reward: 10 USDC
    };

    const economics = await calculator.analyzeLiquidation(health);

    // Assuming gas cost ~5 USDC, profit = 5 USDC
    expect(economics.isProfitable).toBe(true);
  });

  it('should identify unprofitable liquidation', async () => {
    const health = {
      collateralValue: 10_000000n, // Reward: 1 USDC
    };

    const economics = await calculator.analyzeLiquidation(health);

    // Gas cost > reward, not profitable
    expect(economics.isProfitable).toBe(false);
  });
});
```

### Integration Tests

```typescript
// tests/integration/end-to-end.test.ts
describe('Liquidation Bot E2E', () => {
  it('should issue warning for unhealthy loan', async () => {
    // 1. Setup: Create loan with health = 1.4
    const borrower = await setupUnhealthyLoan(1.4);

    // 2. Run monitoring cycle
    await bot.monitorAllLoans();

    // 3. Verify: Check warning was issued
    const loan = await lendingPool.getLoan(borrower);
    expect(loan.warningsIssued).toBe(1);

    // 4. Verify: Check penalty was applied
    expect(loan.penalties).toBeGreaterThan(0);
  });

  it('should liquidate loan at threshold', async () => {
    // 1. Setup: Create loan with health = 1.05
    const borrower = await setupLiquidatableLoan();

    // 2. Run monitoring cycle
    await bot.monitorAllLoans();

    // 3. Verify: Check loan was liquidated
    const loan = await lendingPool.getLoan(borrower);
    expect(loan).toBeNull(); // Loan removed

    // 4. Verify: Check bot received reward
    const botBalance = await usdc.balanceOf(bot.address);
    expect(botBalance).toBeGreaterThan(0);
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
STRWA_TOKEN_ADDRESS=C...
ORACLE_CONTRACT_ID=C...
LENDING_POOL_CONTRACT_ID=C...

# Monitoring Configuration
MONITORING_INTERVAL_MS=15000        # 15 seconds
HEALTH_CHECK_INTERVAL_MS=60000      # 1 minute

# Warning Thresholds
WARNING_1_THRESHOLD=1.5
WARNING_2_THRESHOLD=1.2
WARNING_3_THRESHOLD=1.1
LIQUIDATION_THRESHOLD=1.1
TIME_BETWEEN_WARNINGS=1209600       # 2 weeks in seconds
PENALTY_PERCENT=2

# Economics
MIN_PROFIT_USDC=1000000            # 1 USDC minimum profit

# Server Configuration
PORT=3002
```

### Admin API

```typescript
// src/admin/api.ts
import express from 'express';

const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', bot: 'liquidation' });
});

app.get('/metrics', (req, res) => {
  const metrics = bot.getMetrics();
  res.json({
    ...metrics,
    totalRewardsEarned: metrics.totalRewardsEarned.toString(),
    totalGasSpent: metrics.totalGasSpent.toString(),
    totalProfit: metrics.totalProfit.toString(),
  });
});

app.get('/loan/:borrower/health', async (req, res) => {
  const { borrower } = req.params;

  try {
    const loan = await bot.lendingPool.getLoan(borrower);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const [price] = await bot.oracle.getPrice(bot.config.stRwaTokenAddress);
    const health = await bot.healthCalculator.calculateHealth(
      borrower,
      loan,
      price
    );

    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/admin/force-check/:borrower', async (req, res) => {
  const { borrower } = req.params;

  try {
    const [price] = await bot.oracle.getPrice(bot.config.stRwaTokenAddress);
    const result = await bot.monitorLoan(borrower, price);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3002, () => {
  console.log('Liquidation Admin API on port 3002');
});
```

## Key Technical Considerations

### 1. Decimal Precision

**Challenge**: stRWA has 18 decimals, USDC has 6 decimals

**Solution**:
```typescript
// Always normalize to same decimals for calculations
const collateralValue = (collateralAmount * price) / 10n ** 18n;

// Result is in USDC decimals (6)
```

### 2. Oracle Price Staleness

**Critical**: Never use stale prices for liquidations

**Check**:
```typescript
const MAX_PRICE_AGE = 24 * 3600; // 24 hours

if (currentTime - priceTimestamp > MAX_PRICE_AGE) {
  throw new Error('Oracle price too old');
}
```

### 3. Front-Running Protection

**Issue**: Liquidation transactions could be front-run

**Mitigation**:
- Submit transactions quickly after health check
- Use higher gas fees for priority
- Stellar's consensus makes this less of an issue than EVM chains

### 4. Gas Cost Management

**Strategy**:
```typescript
// Only liquidate if profitable
const MIN_PROFIT = 1_000000n; // 1 USDC

if (reward - estimatedGas < MIN_PROFIT) {
  skip(); // Wait for health to worsen
}
```

### 5. Warning Timing

**Important**: Respect 2-week intervals

```typescript
// Don't spam warnings
const TWO_WEEKS = 14 * 24 * 3600;

if (now - lastWarningTime < TWO_WEEKS) {
  return false; // Too soon
}
```

## Summary

The Liquidation Bot is a **critical risk management system** that:

✅ **Monitors** all loans every 15 seconds
✅ **Calculates** real-time health factors
✅ **Issues** progressive warnings (3 levels)
✅ **Executes** liquidations at 110% threshold
✅ **Earns** 10% reward per liquidation
✅ **Protects** lenders from bad debt
✅ **Tracks** comprehensive metrics

**Key Features**:
- Real-time health monitoring
- 3-warning progressive system
- Economic viability checks
- On-chain event notifications
- Profitability tracking
- Admin monitoring API

**For Hackathon**: Focus on simple health calculation and liquidation execution. Warning system can be simplified (single warning OK). Event notifications can be on-chain only.

**Estimated Implementation Time**: 8-10 hours for core functionality + tests
