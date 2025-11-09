// bots/orchestrator/src/index.ts
import { config } from 'dotenv';
import { BotOrchestrator } from './orchestrator';
import { MetricsAPI } from './metrics-api';

// Load environment variables
config();

async function main() {
  console.log('🚀 Orion RWA Lending - Bot Orchestrator\n');

  // Validate environment
  const requiredEnvVars = [
    'ORACLE_BOT_SECRET_KEY',
    'AUTO_REPAY_BOT_SECRET_KEY',
    'LIQUIDATION_BOT_SECRET_KEY',
  ];

  const missing = requiredEnvVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    process.exit(1);
  }

  try {
    // Create orchestrator
    const orchestrator = new BotOrchestrator();

    // Start metrics API
    const metricsAPI = new MetricsAPI(orchestrator);
    metricsAPI.start(Number(process.env.METRICS_PORT) || 9090);

    // Start all bots
    await orchestrator.startAll();

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n\n📡 Received ${signal}, shutting down gracefully...\n`);
      metricsAPI.stop();
      await orchestrator.stopAll();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error: any) {
    console.error('❌ Failed to start bot orchestrator:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { BotOrchestrator } from './orchestrator';
export { MetricsAPI } from './metrics-api';
