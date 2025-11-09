#![cfg(test)]
extern crate std;

use soroban_sdk::{testutils::Address as _, Address, Env};

use crate::contract::{LendingPool, LendingPoolClient};
use mock_rwa_token::contract::{MockRwaToken, MockRwaTokenClient};
use rwa_vault::contract::{RwaVault, RwaVaultClient};
use strwa_token::contract::{StRwaToken, StRwaTokenClient};
use usdc_mock::contract::{UsdcMock, UsdcMockClient};

// Mock Oracle for testing
use soroban_sdk::{contract, contractimpl};

#[contract]
pub struct MockOracle;

#[contractimpl]
impl MockOracle {
    pub fn get_price(e: Env, _asset: Address) -> (i128, u64) {
        // Return price of 1 USDC per stRWA token and current ledger timestamp
        (1_000_000i128, e.ledger().timestamp()) // Price with 6 decimals, timestamp
    }

    pub fn set_price(_e: Env, _asset: Address, _price: i128, _timestamp: u64) {
        // For test manipulation if needed
    }
}

struct TestSetup<'a> {
    env: Env,
    admin: Address,
    lp_user: Address,
    borrower: Address,
    liquidation_bot: Address,
    usdc_client: UsdcMockClient<'a>,
    rwa_token_client: MockRwaTokenClient<'a>,
    strwa_token_client: StRwaTokenClient<'a>,
    vault_client: RwaVaultClient<'a>,
    lending_pool_client: LendingPoolClient<'a>,
    oracle_client: soroban_sdk::Address,
}

fn setup_test<'a>() -> TestSetup<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let lp_user = Address::generate(&env);
    let borrower = Address::generate(&env);
    let liquidation_bot = Address::generate(&env);

    // Deploy USDC mock
    let usdc_id = env.register(UsdcMock, (&admin, &10_000_000_000i128));
    let usdc_client = UsdcMockClient::new(&env, &usdc_id);

    // Deploy RWA token
    let rwa_token_id = env.register(MockRwaToken, (&admin, &admin, &10_000_000_000i128));
    let rwa_token_client = MockRwaTokenClient::new(&env, &rwa_token_id);

    // Deploy stRWA token
    let strwa_token_id = env.register(StRwaToken, ());
    let strwa_token_client = StRwaTokenClient::new(&env, &strwa_token_id);
    strwa_token_client.initialize(&admin);

    // Deploy vault
    let vault_id = env.register(RwaVault, ());
    let vault_client = RwaVaultClient::new(&env, &vault_id);
    vault_client.initialize(&admin, &rwa_token_id, &strwa_token_id);
    vault_client.set_usdc_address(&usdc_id);

    // Set vault address in stRWA
    strwa_token_client.set_vault_address(&vault_id);

    // Deploy mock oracle
    let oracle_id = env.register(MockOracle, ());

    // Deploy lending pool
    let lending_pool_id = env.register(LendingPool, ());
    let lending_pool_client = LendingPoolClient::new(&env, &lending_pool_id);

    lending_pool_client.initialize(
        &admin,
        &vault_id,
        &oracle_id,
        &usdc_id,
        &strwa_token_id,
        &rwa_token_id,
    );

    // Set liquidation bot
    lending_pool_client.set_liquidation_bot(&admin, &liquidation_bot);

    // Set token risk profile (low risk: 5% APR)
    lending_pool_client.update_token_risk_profile(&admin, &rwa_token_id, &500, &(365 * 24 * 60 * 60));

    // Whitelist vault in RWA token
    rwa_token_client.allow_user(&vault_id, &admin);
    rwa_token_client.allow_user(&borrower, &admin);
    rwa_token_client.allow_user(&lp_user, &admin);

    // Set lending pool as allowed in vault
    vault_client.set_lending_pool(&lending_pool_id);

    // Fund test users
    usdc_client.transfer(&admin, &lp_user, &1_000_000i128);
    usdc_client.transfer(&admin, &borrower, &100_000i128);
    rwa_token_client.transfer(&admin, &borrower, &1_000_000i128);

    TestSetup {
        env,
        admin,
        lp_user,
        borrower,
        liquidation_bot,
        usdc_client,
        rwa_token_client,
        strwa_token_client,
        vault_client,
        lending_pool_client,
        oracle_client: oracle_id,
    }
}

#[test]
fn test_initialization() {
    let _ = setup_test();
}

#[test]
fn test_lp_deposit() {
    let setup = setup_test();

    // LP deposits USDC
    setup.usdc_client.approve(
        &setup.lp_user,
        &setup.lending_pool_client.address,
        &500_000,
        &100,
    );
    setup.lending_pool_client.lp_deposit(&setup.lp_user, &500_000);

    // Verify deposit
    let deposit = setup.lending_pool_client.get_lp_deposit(&setup.lp_user);
    assert_eq!(deposit.total_deposited, 500_000);
    assert_eq!(deposit.available_amount, 500_000);
    assert_eq!(deposit.locked_amount, 0);

    // Verify total liquidity
    assert_eq!(setup.lending_pool_client.get_total_liquidity(), 500_000);
}

#[test]
fn test_lp_withdraw() {
    let setup = setup_test();

    // LP deposits
    setup.usdc_client.approve(
        &setup.lp_user,
        &setup.lending_pool_client.address,
        &500_000,
        &100,
    );
    setup.lending_pool_client.lp_deposit(&setup.lp_user, &500_000);

    // LP withdraws part
    setup.lending_pool_client.lp_withdraw(&setup.lp_user, &200_000);

    // Verify
    let deposit = setup.lending_pool_client.get_lp_deposit(&setup.lp_user);
    assert_eq!(deposit.total_deposited, 300_000);
    assert_eq!(deposit.available_amount, 300_000);
}

#[test]
#[should_panic(expected = "Insufficient available balance")]
fn test_lp_withdraw_more_than_available() {
    let setup = setup_test();

    setup.usdc_client.approve(
        &setup.lp_user,
        &setup.lending_pool_client.address,
        &500_000,
        &100,
    );
    setup.lending_pool_client.lp_deposit(&setup.lp_user, &500_000);

    // Try to withdraw more than deposited
    setup.lending_pool_client.lp_withdraw(&setup.lp_user, &600_000);
}

#[test]
fn test_originate_loan_low_risk() {
    let setup = setup_test();

    // LP provides liquidity
    setup.usdc_client.approve(
        &setup.lp_user,
        &setup.lending_pool_client.address,
        &1_000_000,
        &100,
    );
    setup.lending_pool_client.lp_deposit(&setup.lp_user, &1_000_000);

    // Borrower stakes RWA to get stRWA collateral
    setup.rwa_token_client.approve(
        &setup.borrower,
        &setup.vault_client.address,
        &200_000,
        &100,
    );
    setup.vault_client.stake(&setup.borrower, &200_000);

    // Borrower originates loan (need 140% collateral)
    // With 200_000 stRWA at 1:1 price, can borrow max ~142_857 USDC
    // Let's borrow 100_000 USDC
    setup.strwa_token_client.approve(
        &setup.borrower,
        &setup.lending_pool_client.address,
        &200_000,
        &100,
    );

    let borrower_usdc_before = setup.usdc_client.balance(&setup.borrower);

    setup.lending_pool_client.originate_loan(
        &setup.borrower,
        &200_000, // collateral
        &100_000, // loan amount
        &12,      // 12 months
    );

    // Verify loan created
    let loan = setup
        .lending_pool_client
        .get_loan(&setup.borrower)
        .expect("Loan should exist");
    assert_eq!(loan.principal, 100_000);
    assert_eq!(loan.collateral_amount, 200_000);
    assert_eq!(loan.interest_rate, 700); // 7% for low risk
    assert_eq!(loan.yield_share_percent, 1000); // 10% for low risk

    // Verify USDC transferred to borrower
    let borrower_usdc_after = setup.usdc_client.balance(&setup.borrower);
    assert_eq!(borrower_usdc_after - borrower_usdc_before, 100_000);

    // Verify stRWA collateral locked
    assert_eq!(
        setup.strwa_token_client.balance(&setup.lending_pool_client.address),
        200_000
    );
}

#[test]
fn test_originate_loan_high_risk() {
    let setup = setup_test();

    // Update token risk profile to high risk (< 5% APR)
    setup
        .lending_pool_client
        .update_token_risk_profile(&setup.admin, &setup.rwa_token_client.address, &400, &(365 * 24 * 60 * 60));

    // LP provides liquidity
    setup.usdc_client.approve(
        &setup.lp_user,
        &setup.lending_pool_client.address,
        &1_000_000,
        &100,
    );
    setup.lending_pool_client.lp_deposit(&setup.lp_user, &1_000_000);

    // Borrower gets collateral
    setup.rwa_token_client.approve(
        &setup.borrower,
        &setup.vault_client.address,
        &200_000,
        &100,
    );
    setup.vault_client.stake(&setup.borrower, &200_000);

    setup.strwa_token_client.approve(
        &setup.borrower,
        &setup.lending_pool_client.address,
        &200_000,
        &100,
    );

    setup.lending_pool_client.originate_loan(
        &setup.borrower,
        &200_000,
        &100_000,
        &12,
    );

    let loan = setup.lending_pool_client.get_loan(&setup.borrower).unwrap();
    assert_eq!(loan.interest_rate, 1400); // 14% for high risk
    assert_eq!(loan.yield_share_percent, 2000); // 20% for high risk
}

#[test]
#[should_panic(expected = "Insufficient collateral")]
fn test_originate_loan_insufficient_collateral() {
    let setup = setup_test();

    setup.usdc_client.approve(
        &setup.lp_user,
        &setup.lending_pool_client.address,
        &1_000_000,
        &100,
    );
    setup.lending_pool_client.lp_deposit(&setup.lp_user, &1_000_000);

    setup.rwa_token_client.approve(
        &setup.borrower,
        &setup.vault_client.address,
        &100_000,
        &100,
    );
    setup.vault_client.stake(&setup.borrower, &100_000);

    setup.strwa_token_client.approve(
        &setup.borrower,
        &setup.lending_pool_client.address,
        &100_000,
        &100,
    );

    // Try to borrow too much (need 140% collateral)
    // With 100k collateral, max borrow is ~71k
    setup.lending_pool_client.originate_loan(
        &setup.borrower,
        &100_000,
        &100_000, // Too much!
        &12,
    );
}

#[test]
#[should_panic(expected = "User already has an active loan")]
fn test_one_loan_per_user() {
    let setup = setup_test();

    setup.usdc_client.approve(
        &setup.lp_user,
        &setup.lending_pool_client.address,
        &1_000_000,
        &100,
    );
    setup.lending_pool_client.lp_deposit(&setup.lp_user, &1_000_000);

    setup.rwa_token_client.approve(
        &setup.borrower,
        &setup.vault_client.address,
        &400_000,
        &100,
    );
    setup.vault_client.stake(&setup.borrower, &400_000);

    setup.strwa_token_client.approve(
        &setup.borrower,
        &setup.lending_pool_client.address,
        &400_000,
        &100,
    );

    // First loan
    setup.lending_pool_client.originate_loan(
        &setup.borrower,
        &200_000,
        &100_000,
        &12,
    );

    // Try second loan - should fail
    setup.lending_pool_client.originate_loan(
        &setup.borrower,
        &200_000,
        &100_000,
        &12,
    );
}

#[test]
#[should_panic(expected = "Loan duration must be between 3 and 24 months")]
fn test_loan_duration_too_short() {
    let setup = setup_test();

    setup.usdc_client.approve(
        &setup.lp_user,
        &setup.lending_pool_client.address,
        &1_000_000,
        &100,
    );
    setup.lending_pool_client.lp_deposit(&setup.lp_user, &1_000_000);

    setup.rwa_token_client.approve(
        &setup.borrower,
        &setup.vault_client.address,
        &200_000,
        &100,
    );
    setup.vault_client.stake(&setup.borrower, &200_000);

    setup.strwa_token_client.approve(
        &setup.borrower,
        &setup.lending_pool_client.address,
        &200_000,
        &100,
    );

    // 2 months - too short
    setup.lending_pool_client.originate_loan(
        &setup.borrower,
        &200_000,
        &100_000,
        &2,
    );
}

#[test]
fn test_repay_loan() {
    let setup = setup_test();

    // Setup loan
    setup.usdc_client.approve(
        &setup.lp_user,
        &setup.lending_pool_client.address,
        &1_000_000,
        &100,
    );
    setup.lending_pool_client.lp_deposit(&setup.lp_user, &1_000_000);

    setup.rwa_token_client.approve(
        &setup.borrower,
        &setup.vault_client.address,
        &200_000,
        &100,
    );
    setup.vault_client.stake(&setup.borrower, &200_000);

    setup.strwa_token_client.approve(
        &setup.borrower,
        &setup.lending_pool_client.address,
        &200_000,
        &100,
    );

    setup.lending_pool_client.originate_loan(
        &setup.borrower,
        &200_000,
        &100_000,
        &12,
    );

    // Repay part of loan
    setup.usdc_client.approve(
        &setup.borrower,
        &setup.lending_pool_client.address,
        &50_000,
        &100,
    );
    setup.lending_pool_client.repay_loan(&setup.borrower, &50_000);

    // Verify debt reduced (accounting for LP share)
    let loan = setup.lending_pool_client.get_loan(&setup.borrower).unwrap();
    // 50k payment with 10% LP share = 45k principal payment
    assert_eq!(loan.outstanding_debt, 100_000 - 45_000);
}

#[test]
fn test_early_loan_closure() {
    let setup = setup_test();

    // Setup loan
    setup.usdc_client.approve(
        &setup.lp_user,
        &setup.lending_pool_client.address,
        &1_000_000,
        &100,
    );
    setup.lending_pool_client.lp_deposit(&setup.lp_user, &1_000_000);

    setup.rwa_token_client.approve(
        &setup.borrower,
        &setup.vault_client.address,
        &200_000,
        &100,
    );
    setup.vault_client.stake(&setup.borrower, &200_000);

    setup.strwa_token_client.approve(
        &setup.borrower,
        &setup.lending_pool_client.address,
        &200_000,
        &100,
    );

    setup.lending_pool_client.originate_loan(
        &setup.borrower,
        &200_000,
        &100_000,
        &12,
    );

    // Early closure with 5% fee
    // Total payment = 100_000 + 5_000 = 105_000
    setup.usdc_client.approve(
        &setup.borrower,
        &setup.lending_pool_client.address,
        &105_000,
        &100,
    );
    setup.lending_pool_client.close_loan_early(&setup.borrower);

    // Verify loan closed
    assert!(setup.lending_pool_client.get_loan(&setup.borrower).is_none());

    // Verify collateral returned
    assert_eq!(setup.strwa_token_client.balance(&setup.borrower), 200_000);
}

#[test]
fn test_check_and_issue_warning() {
    let setup = setup_test();

    // Setup loan
    setup.usdc_client.approve(
        &setup.lp_user,
        &setup.lending_pool_client.address,
        &1_000_000,
        &100,
    );
    setup.lending_pool_client.lp_deposit(&setup.lp_user, &1_000_000);

    setup.rwa_token_client.approve(
        &setup.borrower,
        &setup.vault_client.address,
        &200_000,
        &100,
    );
    setup.vault_client.stake(&setup.borrower, &200_000);

    setup.strwa_token_client.approve(
        &setup.borrower,
        &setup.lending_pool_client.address,
        &200_000,
        &100,
    );

    setup.lending_pool_client.originate_loan(
        &setup.borrower,
        &200_000,
        &100_000,
        &12,
    );

    // Fast forward time 2 weeks (simulated)
    // In real test, would need ledger timestamp manipulation
    // For now, just call the function
    setup
        .lending_pool_client
        .check_and_issue_warning(&setup.borrower);

    // Note: In production tests, would verify warning issued and penalty applied
    // This requires ledger timestamp manipulation which depends on test utils
}

#[test]
fn test_get_available_liquidity() {
    let setup = setup_test();

    // LP deposits
    setup.usdc_client.approve(
        &setup.lp_user,
        &setup.lending_pool_client.address,
        &1_000_000,
        &100,
    );
    setup.lending_pool_client.lp_deposit(&setup.lp_user, &1_000_000);

    assert_eq!(setup.lending_pool_client.get_available_liquidity(), 1_000_000);

    // Create loan
    setup.rwa_token_client.approve(
        &setup.borrower,
        &setup.vault_client.address,
        &200_000,
        &100,
    );
    setup.vault_client.stake(&setup.borrower, &200_000);

    setup.strwa_token_client.approve(
        &setup.borrower,
        &setup.lending_pool_client.address,
        &200_000,
        &100,
    );

    setup.lending_pool_client.originate_loan(
        &setup.borrower,
        &200_000,
        &100_000,
        &12,
    );

    // Available should be reduced
    assert_eq!(setup.lending_pool_client.get_available_liquidity(), 900_000);
}

#[test]
fn test_token_risk_profile() {
    let setup = setup_test();

    let profile = setup
        .lending_pool_client
        .get_token_risk_profile(&setup.rwa_token_client.address)
        .expect("Profile should exist");

    assert_eq!(profile.token_yield_apr, 500); // 5% set in setup
    assert_eq!(profile.rwa_token_address, setup.rwa_token_client.address);
}
