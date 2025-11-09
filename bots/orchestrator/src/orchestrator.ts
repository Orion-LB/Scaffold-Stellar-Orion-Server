// bots/orchestrator/src/orchestrator.ts
import * as StellarSdk from '@stellar/stellar-sdk';
import { SharedConfig } from '../../shared/config';
import { OracleClient } from '../../shared/clients/oracle-client';
import { LendingPoolClient } from '../../shared/clients/lending-pool-client';
import { VaultClient } from '../../shared/clients/vault-client';

/**
 * Mock bot classes for demonstration
 * In production, these would be the actual bot implementations
 */
class OraclePriceBot {
  constructor(private config: any) {}
  async start() { console.log('  ✅ Oracle Price Bot started'); }
  async stop() { console.log('  ✅ Oracle Price Bot stopped'); }
  getMetrics() {
    return {
      totalUpdates: 0,
      successRate: 1.0,
      lastUpdate: Date.now() / 1000,
      avgPrice: '1.00',
    };
  }
}

class AutoRepayBot {
  constructor(private config: any) {}
  async start() { console.log('  ✅ Auto-Repay Bot started'); }
  async stop() { console.log('  ✅ Auto-Repay Bot stopped'); }
  getMetrics() {
    return {
      totalRepayments: 0,
      totalAmountRepaid: '0',
      activeBorrowers: 0,
    };
  }
}

class LiquidationBot {
  constructor(private config: any) {}
  async start() { console.log('  ✅ Liquidation Bot started'); }
  async stop() { console.log('  ✅ Liquidation Bot stopped'); }
  getMetrics() {
    return {
      totalLiquidations: 0,
      totalWarningsIssued: 0,
      totalProfit: '0',
    };
  }
}

export interface BotConfig {
  network: string;
  rpcUrl: string;
  networkPassphrase: string;
  keypair: StellarSdk.Keypair;
}

export class BotOrchestrator {
  private sharedConfig: SharedConfig;
  private oracleBot?: OraclePriceBot;
  private autoRepayBot?: AutoRepayBot;
  private liquidationBot?: LiquidationBot;

  // Shared clients
  public oracleClient: OracleClient;
  public lendingPoolClient: LendingPoolClient;
  public vaultClient: VaultClient;

  constructor() {
    // Load shared configuration
    this.sharedConfig = SharedConfig.getInstance();

    // Initialize shared clients (read-only)
    this.oracleClient = new OracleClient(this.sharedConfig);
    this.lendingPoolClient = new LendingPoolClient();
    this.vaultClient = new VaultClient(this.sharedConfig);

    console.log('📋 Configuration loaded:');
    console.log(`   Network: ${this.sharedConfig.getNetwork()}`);
    console.log(`   RPC URL: ${this.sharedConfig.getRpcUrl()}`);
    console.log(`   Contracts loaded: ${Object.keys(this.sharedConfig.getAllContracts()).length}`);
    console.log('');
  }

  /**
   * Start all bots in the correct order
   */
  async startAll(): Promise<void> {
    console.log('🚀 Starting all bots...\n');

    try {
      // 1. Start Oracle Bot first (other bots depend on prices)
      await this.startOracleBot();

      // Wait 10 seconds for first price update
      console.log('⏳ Waiting 10 seconds for initial price update...\n');
      await new Promise(resolve => setTimeout(resolve, 10000));

      // 2. Start Auto-Repay Bot
      await this.startAutoRepayBot();

      // 3. Start Liquidation Bot
      await this.startLiquidationBot();

      console.log('🎉 All bots running successfully!\n');
      console.log('📊 Admin APIs:');
      console.log('   - Auto-Repay Bot:   http://localhost:3001');
      console.log('   - Liquidation Bot:  http://localhost:3002');
      console.log('   - Metrics API:      http://localhost:9090');
      console.log('');
      console.log('Press Ctrl+C to stop all bots');
      console.log('');

    } catch (error: any) {
      console.error('❌ Failed to start bots:', error.message);
      throw error;
    }
  }

  /**
   * Stop all bots
   */
  async stopAll(): Promise<void> {
    console.log('🛑 Stopping all bots...\n');

    if (this.liquidationBot) {
      await this.liquidationBot.stop();
    }

    if (this.autoRepayBot) {
      await this.autoRepayBot.stop();
    }

    if (this.oracleBot) {
      await this.oracleBot.stop();
    }

    console.log('👋 All bots stopped\n');
  }

  /**
   * Get metrics from all bots
   */
  getMetrics() {
    return {
      oracle: this.oracleBot?.getMetrics() || {},
      autoRepay: this.autoRepayBot?.getMetrics() || {},
      liquidation: this.liquidationBot?.getMetrics() || {},
    };
  }

  /**
   * Start Oracle Price Bot
   */
  private async startOracleBot(): Promise<void> {
    console.log('🔮 Starting Oracle Price Bot...');

    const keypair = StellarSdk.Keypair.fromSecret(
      process.env.ORACLE_BOT_SECRET_KEY!
    );

    const config = {
      network: this.sharedConfig.getNetwork(),
      rpcUrl: this.sharedConfig.getRpcUrl(),
      networkPassphrase: this.sharedConfig.getNetworkPassphrase(),
      oracleContractId: this.sharedConfig.getContractId('oracle'),
      stRwaTokenAddress: this.sharedConfig.getContractId('strwa_token'),
      keypair,
    };

    this.oracleBot = new OraclePriceBot(config);
    await this.oracleBot.start();
    console.log('');
  }

  /**
   * Start Auto-Repay Bot
   */
  private async startAutoRepayBot(): Promise<void> {
    console.log('🔄 Starting Auto-Repay Bot...');

    const keypair = StellarSdk.Keypair.fromSecret(
      process.env.AUTO_REPAY_BOT_SECRET_KEY!
    );

    const config = {
      network: this.sharedConfig.getNetwork(),
      rpcUrl: this.sharedConfig.getRpcUrl(),
      networkPassphrase: this.sharedConfig.getNetworkPassphrase(),
      vaultContractId: this.sharedConfig.getContractId('rwa_vault'),
      lendingPoolContractId: this.sharedConfig.getContractId('lending_pool'),
      keypair,
    };

    this.autoRepayBot = new AutoRepayBot(config);
    await this.autoRepayBot.start();
    console.log('');
  }

  /**
   * Start Liquidation Bot
   */
  private async startLiquidationBot(): Promise<void> {
    console.log('🚨 Starting Liquidation Bot...');

    const keypair = StellarSdk.Keypair.fromSecret(
      process.env.LIQUIDATION_BOT_SECRET_KEY!
    );

    const config = {
      network: this.sharedConfig.getNetwork(),
      rpcUrl: this.sharedConfig.getRpcUrl(),
      networkPassphrase: this.sharedConfig.getNetworkPassphrase(),
      lendingPoolContractId: this.sharedConfig.getContractId('lending_pool'),
      oracleContractId: this.sharedConfig.getContractId('oracle'),
      stRwaTokenAddress: this.sharedConfig.getContractId('strwa_token'),
      keypair,
    };

    this.liquidationBot = new LiquidationBot(config);
    await this.liquidationBot.start();
    console.log('');
  }

  /**
   * Check health of all bots
   */
  async checkHealth(): Promise<{ [key: string]: string }> {
    return {
      oracle: this.oracleBot ? 'running' : 'stopped',
      autoRepay: this.autoRepayBot ? 'running' : 'stopped',
      liquidation: this.liquidationBot ? 'running' : 'stopped',
    };
  }
}
