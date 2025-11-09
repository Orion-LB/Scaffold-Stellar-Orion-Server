#![cfg(test)]
extern crate std;

use soroban_sdk::{testutils::Address as _, Address, Env, String};

use crate::contract::{StRwaToken, StRwaTokenClient};

fn create_strwa_token_contract<'a>(e: &Env, admin: &Address) -> StRwaTokenClient<'a> {
    let address = e.register(StRwaToken, ());
    let client = StRwaTokenClient::new(e, &address);
    client.initialize(admin);
    client
}

#[test]
fn test_initialization() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let client = create_strwa_token_contract(&e, &admin);

    assert_eq!(client.name(), String::from_str(&e, "Staked Real World Asset"));
    assert_eq!(client.symbol(), String::from_str(&e, "stRWA"));
    assert_eq!(client.decimals(), 18);
    assert_eq!(client.total_supply(), 0);
}

#[test]
fn test_admin_can_set_vault_address() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let vault = Address::generate(&e);
    let client = create_strwa_token_contract(&e, &admin);

    client.set_vault_address(&vault);
    assert_eq!(client.get_vault(), vault);
}

#[test]
#[should_panic(expected = "Vault address already set")]
fn test_cannot_set_vault_twice() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let vault = Address::generate(&e);
    let client = create_strwa_token_contract(&e, &admin);

    client.set_vault_address(&vault);
    client.set_vault_address(&vault); // Should panic
}

#[test]
fn test_vault_can_mint() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let vault = Address::generate(&e);
    let user = Address::generate(&e);
    let client = create_strwa_token_contract(&e, &admin);

    client.set_vault_address(&vault);
    
    // With mock_all_auths, the vault.require_auth() call in mint() will succeed.
    client.mint(&user, &1000);
    assert_eq!(client.balance(&user), 1000);
}

#[test]
fn test_vault_can_burn() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let vault = Address::generate(&e);
    let user = Address::generate(&e);
    let client = create_strwa_token_contract(&e, &admin);

    client.set_vault_address(&vault);
    client.mint(&user, &1000);
    assert_eq!(client.balance(&user), 1000);

    client.burn(&user, &500);
    assert_eq!(client.balance(&user), 500);
}

#[test]
fn test_unrestricted_transfer() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let vault = Address::generate(&e);
    let user1 = Address::generate(&e);
    let user2 = Address::generate(&e);
    let client = create_strwa_token_contract(&e, &admin);

    client.set_vault_address(&vault);
    client.mint(&user1, &1000);

    client.transfer(&user1, &user2, &500);

    assert_eq!(client.balance(&user1), 500);
    assert_eq!(client.balance(&user2), 500);
}

#[test]
fn test_can_use_in_defi() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let vault = Address::generate(&e);
    let user = Address::generate(&e);
    let lending_pool = Address::generate(&e);
    let client = create_strwa_token_contract(&e, &admin);

    client.set_vault_address(&vault);
    client.mint(&user, &1000);

    // User approves LendingPool
    client.approve(&user, &lending_pool, &500, &100);

    // LendingPool transfers stRWA from user
    client.transfer_from(&lending_pool, &user, &lending_pool, &500);

    assert_eq!(client.balance(&user), 500);
    assert_eq!(client.balance(&lending_pool), 500);
}