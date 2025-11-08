#![cfg(test)]
extern crate std;

use soroban_sdk::{
    testutils::{Address as _},
    Address, Env,
};

use crate::contract::{MockRwaToken, MockRwaTokenClient};

fn create_rwa_token_contract<'a>(
    e: &Env,
    admin: &Address,
    manager: &Address,
    initial_supply: &i128
) -> MockRwaTokenClient<'a> {
    let address = e.register(MockRwaToken, (admin, manager, initial_supply));
    MockRwaTokenClient::new(e, &address)
}

#[test]
#[should_panic(expected = "Error(Contract, #113)")]
fn test_transfer_to_non_whitelisted_fails() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let manager = Address::generate(&e);
    let user = Address::generate(&e);
    let initial_supply = 1_000_000_000_000_000_000_000;

    let client = create_rwa_token_contract(&e, &admin, &manager, &initial_supply);

    // Admin is whitelisted by default, user is not
    client.transfer(&admin, &user, &500);
}

#[test]
fn test_transfer_to_whitelisted_succeeds() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let manager = Address::generate(&e);
    let user = Address::generate(&e);
    let initial_supply = 1_000_000_000_000_000_000_000;

    let client = create_rwa_token_contract(&e, &admin, &manager, &initial_supply);

    // Whitelist the user
    client.allow_user(&user, &manager);

    client.transfer(&admin, &user, &500);
    assert_eq!(client.balance(&user), 500);
}

#[test]
fn test_manager_can_whitelist() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let manager = Address::generate(&e);
    let user = Address::generate(&e);
    let initial_supply = 1_000_000_000_000_000_000_000;

    let client = create_rwa_token_contract(&e, &admin, &manager, &initial_supply);

    assert!(!client.allowed(&user));

    client.allow_user(&user, &manager);

    assert!(client.allowed(&user));
}

#[test]
fn test_manager_can_remove_from_whitelist() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let manager = Address::generate(&e);
    let user = Address::generate(&e);
    let initial_supply = 1_000_000_000_000_000_000_000;

    let client = create_rwa_token_contract(&e, &admin, &manager, &initial_supply);

    client.allow_user(&user, &manager);
    assert!(client.allowed(&user));

    client.disallow_user(&user, &manager);
    assert!(!client.allowed(&user));
}

#[test]
#[should_panic(expected = "Error(Contract, #113)")]
fn test_vault_must_be_whitelisted() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let manager = Address::generate(&e);
    let vault = Address::generate(&e);
    let initial_supply = 1_000_000_000_000_000_000_000;

    let client = create_rwa_token_contract(&e, &admin, &manager, &initial_supply);

    // This should fail because vault is not whitelisted
    client.transfer(&admin, &vault, &1000);
}