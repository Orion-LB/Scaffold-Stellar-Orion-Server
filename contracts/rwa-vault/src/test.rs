#![cfg(test)]
extern crate std;

use soroban_sdk::{testutils::Address as _, Address, Env};

use crate::contract::{RwaVault, RwaVaultClient};
use mock_rwa_token::contract::{MockRwaToken, MockRwaTokenClient};
use strwa_token::contract::{StRwaToken, StRwaTokenClient};
use usdc_mock::contract::{UsdcMock, UsdcMockClient};

struct TestSetup<'a> {
    env: Env,
    admin: Address,
    user: Address,
    lending_pool: Address,
    rwa_token_client: MockRwaTokenClient<'a>,
    strwa_token_client: StRwaTokenClient<'a>,
    usdc_token_client: UsdcMockClient<'a>,
    vault_client: RwaVaultClient<'a>,
}

fn setup_test<'a>() -> TestSetup<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let lending_pool = Address::generate(&env);

    // Deploy token contracts
    // MockRwaToken and UsdcMock have __constructor, so use env.register
    let rwa_token_id = env.register(MockRwaToken, (&admin, &admin, 1_000_000_000i128));
    let rwa_token_client = MockRwaTokenClient::new(&env, &rwa_token_id);

    let usdc_token_id = env.register(UsdcMock, (&admin, 1_000_000_000i128));
    let usdc_token_client = UsdcMockClient::new(&env, &usdc_token_id);

    // StRwaToken uses initialize, so use register_contract
    let strwa_token_id = env.register_contract(None, StRwaToken{});
    let strwa_token_client = StRwaTokenClient::new(&env, &strwa_token_id);
    strwa_token_client.initialize(&admin);

    // Deploy vault contract (no constructor, use initialize instead)
    let vault_id = env.register_contract(None, RwaVault{});
    let vault_client = RwaVaultClient::new(&env, &vault_id);

    // Initialize vault
    vault_client.initialize(&admin, &rwa_token_id, &strwa_token_id);
    vault_client.set_usdc_address(&usdc_token_id);
    vault_client.set_lending_pool(&lending_pool);

    // Whitelist vault in MockRWA
    rwa_token_client.allow_user(&vault_id, &admin);
    
    // Set vault address in stRWA
    strwa_token_client.set_vault_address(&vault_id);

    TestSetup {
        env,
        admin,
        user,
        lending_pool,
        rwa_token_client,
        strwa_token_client,
        usdc_token_client,
        vault_client,
    }
}

#[test]
fn test_initialization() {
    let _ = setup_test();
}

#[test]
fn test_stake_success() {
    let setup = setup_test();

    // Transfer RWA from admin to user
    setup.rwa_token_client.allow_user(&setup.user, &setup.admin);
    setup.rwa_token_client.transfer(&setup.admin, &setup.user, &1000);

    // User approves vault and stakes
    setup.rwa_token_client.approve(&setup.user, &setup.vault_client.address, &500, &100);
    setup.vault_client.stake(&setup.user, &500);

    assert_eq!(setup.rwa_token_client.balance(&setup.user), 500);
    assert_eq!(setup.rwa_token_client.balance(&setup.vault_client.address), 500);
    assert_eq!(setup.strwa_token_client.balance(&setup.user), 500);
}

#[test]
#[should_panic(expected = "User has no stake")]
fn test_unstake_without_stake() {
    let setup = setup_test();
    setup.vault_client.unstake(&setup.user, &100);
}

#[test]
fn test_lp_unstake_success() {
    let setup = setup_test();

    // Transfer RWA from admin to user
    setup.rwa_token_client.allow_user(&setup.user, &setup.admin);
    setup.rwa_token_client.transfer(&setup.admin, &setup.user, &1000);

    setup.rwa_token_client.approve(&setup.user, &setup.vault_client.address, &1000, &100);
    setup.vault_client.stake(&setup.user, &1000);

    setup.vault_client.unstake(&setup.user, &500);
    assert_eq!(setup.strwa_token_client.balance(&setup.user), 500);
    assert_eq!(setup.rwa_token_client.balance(&setup.user), 500);
}

#[test]
#[should_panic(expected = "Cannot unstake: liquidity is being used for loans")]
fn test_lp_cannot_unstake_when_liquidity_used() {
    let setup = setup_test();

    // Transfer RWA from admin to user
    setup.rwa_token_client.allow_user(&setup.user, &setup.admin);
    setup.rwa_token_client.transfer(&setup.admin, &setup.user, &1000);

    setup.rwa_token_client.approve(&setup.user, &setup.vault_client.address, &1000, &100);
    setup.vault_client.stake(&setup.user, &1000);

    setup.vault_client.set_lp_liquidity_used(&setup.user, &600);

    setup.vault_client.unstake(&setup.user, &500);
}