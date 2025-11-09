/**
 * Contract Integration Validation Script
 *
 * This script tests all contract service integrations
 * Run with: npm run validate:integration
 *
 * Your testnet address: GC4Z67Y6JUVZFNQMZ5RDMD55FSAAL4B4SEE5LRR27IBXB6ZIF77OWFER
 */

import {
  createVaultService,
  createLendingPoolService,
  createOracleService,
  createMockRWAService,
  createUSDCService,
  createStakedRWAService,
  CONTRACT_ADDRESSES,
} from '../src/services/contracts';

// Your testnet address
const TEST_ADDRESS = 'GC4Z67Y6JUVZFNQMZ5RDMD55FSAAL4B4SEE5LRR27IBXB6ZIF77OWFER';

async function validateIntegration() {
  console.log('🚀 Orion Contract Integration Validation\n');
  console.log('Testing address:', TEST_ADDRESS);
  console.log('Network: Testnet\n');

  let passed = 0;
  let failed = 0;

  // Initialize services (no wallet for read-only operations)
  const vaultService = createVaultService();
  const lendingPoolService = createLendingPoolService();
  const oracleService = createOracleService();
  const mockRWAService = createMockRWAService();
  const usdcService = createUSDCService();
  const stakedRWAService = createStakedRWAService();

  console.log('='.repeat(60));
  console.log('📖 READ OPERATIONS TEST');
  console.log('='.repeat(60) + '\n');

  // Test 1: RWA Token Balance
  try {
    console.log('Test 1: Get RWA Token Balance...');
    const balance = await mockRWAService.balance(TEST_ADDRESS);
    console.log(`✅ RWA Balance: ${mockRWAService.fromContractUnits(balance)} RWA`);
    passed++;
  } catch (error) {
    console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  // Test 2: stRWA Token Balance
  try {
    console.log('\nTest 2: Get stRWA Token Balance...');
    const balance = await stakedRWAService.balance(TEST_ADDRESS);
    console.log(`✅ stRWA Balance: ${stakedRWAService.fromContractUnits(balance)} stRWA`);
    passed++;
  } catch (error) {
    console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  // Test 3: USDC Balance
  try {
    console.log('\nTest 3: Get USDC Balance...');
    const balance = await usdcService.balance(TEST_ADDRESS);
    console.log(`✅ USDC Balance: ${usdcService.fromContractUnits(balance)} USDC`);
    passed++;
  } catch (error) {
    console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  // Test 4: Claimable Yield
  try {
    console.log('\nTest 4: Get Claimable Yield...');
    const yield_ = await vaultService.claimable_yield(TEST_ADDRESS);
    console.log(`✅ Claimable Yield: ${vaultService.usdcFromContractUnits(yield_)} USDC`);
    passed++;
  } catch (error) {
    console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  // Test 5: Get Loan
  try {
    console.log('\nTest 5: Get Active Loan...');
    const loan = await lendingPoolService.get_loan(TEST_ADDRESS);
    if (loan) {
      console.log(`✅ Active Loan Found:`);
      console.log(`   Collateral: ${lendingPoolService.strwaFromContractUnits(loan.collateral_amount)} stRWA`);
      console.log(`   Debt: ${lendingPoolService.usdcFromContractUnits(loan.outstanding_debt)} USDC`);
      console.log(`   Interest Rate: ${lendingPoolService.basisPointsToPercent(loan.interest_rate)}%`);
    } else {
      console.log(`✅ No Active Loan`);
    }
    passed++;
  } catch (error) {
    console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  // Test 6: Oracle Price
  try {
    console.log('\nTest 6: Get stRWA Price from Oracle...');
    const price = await oracleService.get_price(CONTRACT_ADDRESSES.STAKED_RWA_A);
    console.log(`✅ stRWA Price: $${oracleService.basisPointsToUSDC(price)}`);
    passed++;
  } catch (error) {
    console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  // Test 7: Whitelist Status
  try {
    console.log('\nTest 7: Check RWA Whitelist Status...');
    const isWhitelisted = await mockRWAService.allowed(TEST_ADDRESS);
    console.log(`✅ Whitelisted: ${isWhitelisted ? 'Yes' : 'No'}`);
    if (!isWhitelisted) {
      console.log('⚠️  Warning: Address not whitelisted. RWA transfers will fail.');
    }
    passed++;
  } catch (error) {
    console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  // Test 8: Pool Liquidity
  try {
    console.log('\nTest 8: Get Lending Pool Liquidity...');
    const totalLiq = await lendingPoolService.get_total_liquidity();
    const availableLiq = await lendingPoolService.get_available_liquidity();
    console.log(`✅ Total Liquidity: ${lendingPoolService.usdcFromContractUnits(totalLiq)} USDC`);
    console.log(`   Available: ${lendingPoolService.usdcFromContractUnits(availableLiq)} USDC`);
    passed++;
  } catch (error) {
    console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  // Test 9: LP Deposit Info
  try {
    console.log('\nTest 9: Get LP Deposit Info...');
    const deposit = await lendingPoolService.get_lp_deposit(TEST_ADDRESS);
    if (deposit) {
      console.log(`✅ LP Deposit Found:`);
      console.log(`   Total Deposited: ${lendingPoolService.usdcFromContractUnits(deposit.total_deposited)} USDC`);
      console.log(`   Available: ${lendingPoolService.usdcFromContractUnits(deposit.available_amount)} USDC`);
      console.log(`   Locked: ${lendingPoolService.usdcFromContractUnits(deposit.locked_amount)} USDC`);
      console.log(`   Interest Earned: ${lendingPoolService.usdcFromContractUnits(deposit.total_interest_earned)} USDC`);
    } else {
      console.log(`✅ No LP Deposit`);
    }
    passed++;
  } catch (error) {
    console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Contract integration is working correctly.');
    console.log('\n📝 Next Steps:');
    console.log('1. Connect Freighter wallet in the Dashboard');
    console.log('2. Test wallet transactions (stake, borrow, etc.)');
    console.log('3. Check transactions in Stellar explorer');
  } else {
    console.log('\n⚠️  Some tests failed. Please check:');
    console.log('1. Contract addresses are correct');
    console.log('2. Contracts are deployed on testnet');
    console.log('3. RPC endpoint is accessible');
  }

  console.log('\n' + '='.repeat(60));
  console.log('🔗 Useful Links:');
  console.log('Stellar Laboratory: https://laboratory.stellar.org/#explorer?network=test');
  console.log('Freighter Wallet: https://www.freighter.app/');
  console.log('='.repeat(60) + '\n');
}

// Run validation
validateIntegration().catch(error => {
  console.error('Validation failed with error:', error);
  process.exit(1);
});
