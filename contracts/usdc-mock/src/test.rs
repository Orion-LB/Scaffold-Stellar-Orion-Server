#![cfg(test)]
extern crate std;

use soroban_sdk::{
    testutils::Address as _,
    Address, Env, String,
};

use crate::contract::{UsdcMock, UsdcMockClient};

fn create_usdc_mock_contract<'a>(e: &Env, admin: &Address, initial_supply: &i128) -> UsdcMockClient<'a> {
    let address = e.register(UsdcMock, (admin, initial_supply));
    UsdcMockClient::new(e, &address)
}

#[test]
fn test_initialization() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let initial_supply = 1000_000_000_000_000;
    let client = create_usdc_mock_contract(&e, &admin, &initial_supply);

    assert_eq!(client.name(), String::from_str(&e, "USD Coin Mock"));
    assert_eq!(client.symbol(), String::from_str(&e, "USDC"));
    assert_eq!(client.decimals(), 7);
    assert_eq!(client.balance(&admin), initial_supply);
}

#[test]
fn test_transfer() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let user = Address::generate(&e);
    let initial_supply = 1000_000_000_000_000;
    let client = create_usdc_mock_contract(&e, &admin, &initial_supply);

    client.transfer(&admin, &user, &500_000_000_000_000);

    assert_eq!(client.balance(&admin), 500_000_000_000_000);
    assert_eq!(client.balance(&user), 500_000_000_000_000);
}

#[test]
fn test_mint() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let initial_supply = 1000_000_000_000_000;
    let client = create_usdc_mock_contract(&e, &admin, &initial_supply);

    client.mint(&admin, &admin, &100_000_000_000_000);
    assert_eq!(client.balance(&admin), 1100_000_000_000_000);
}
