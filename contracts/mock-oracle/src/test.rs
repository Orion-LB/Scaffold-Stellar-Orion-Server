#![cfg(test)]
extern crate std;

use soroban_sdk::{testutils::Address as _, Address, Env};

use crate::contract::{MockOracle, MockOracleClient};

fn create_oracle_contract<'a>(e: &Env, bot: &Address) -> MockOracleClient<'a> {
    let address = e.register(MockOracle, (bot,));
    MockOracleClient::new(e, &address)
}

#[test]
fn test_initialization() {
    let e = Env::default();
    e.mock_all_auths();

    let bot = Address::generate(&e);
    let client = create_oracle_contract(&e, &bot);

    assert_eq!(client.get_bot(), bot);
}

#[test]
fn test_bot_can_submit_price() {
    let e = Env::default();
    e.mock_all_auths();

    let bot = Address::generate(&e);
    let asset = Address::generate(&e);
    let client = create_oracle_contract(&e, &bot);

    client.submit_price(&bot, &asset, &10000);

    let price_data = client.get_price_data(&asset);
    assert_eq!(price_data.0, 10000);
}

#[test]
#[should_panic(expected = "Unauthorized: only bot can submit prices")]
fn test_non_bot_cannot_submit_price() {
    let e = Env::default();
    e.mock_all_auths();

    let bot = Address::generate(&e);
    let non_bot = Address::generate(&e);
    let asset = Address::generate(&e);
    let client = create_oracle_contract(&e, &bot);

    client.submit_price(&non_bot, &asset, &10000);
}

#[test]
#[should_panic(expected = "Price must be positive")]
fn test_cannot_submit_negative_price() {
    let e = Env::default();
    e.mock_all_auths();

    let bot = Address::generate(&e);
    let asset = Address::generate(&e);
    let client = create_oracle_contract(&e, &bot);

    client.submit_price(&bot, &asset, &-100);
}

#[test]
#[should_panic(expected = "Price must be positive")]
fn test_cannot_submit_zero_price() {
    let e = Env::default();
    e.mock_all_auths();

    let bot = Address::generate(&e);
    let asset = Address::generate(&e);
    let client = create_oracle_contract(&e, &bot);

    client.submit_price(&bot, &asset, &0);
}

#[test]
fn test_get_price() {
    let e = Env::default();
    e.mock_all_auths();

    let bot = Address::generate(&e);
    let asset = Address::generate(&e);
    let client = create_oracle_contract(&e, &bot);

    client.submit_price(&bot, &asset, &12345);

    assert_eq!(client.get_price(&asset), 12345);
}

#[test]
fn test_get_price_data() {
    let e = Env::default();
    e.mock_all_auths();

    let bot = Address::generate(&e);
    let asset = Address::generate(&e);
    let client = create_oracle_contract(&e, &bot);

    client.submit_price(&bot, &asset, &50000);

    let price_data = client.get_price_data(&asset);
    assert_eq!(price_data.0, 50000);
    // We don't check the timestamp as it's unreliable in the test env.
}

#[test]
fn test_price_updates() {
    let e = Env::default();
    e.mock_all_auths();

    let bot = Address::generate(&e);
    let asset = Address::generate(&e);
    let client = create_oracle_contract(&e, &bot);

    client.submit_price(&bot, &asset, &10000);
    let price_data1 = client.get_price_data(&asset);
    assert_eq!(price_data1.0, 10000);

    client.submit_price(&bot, &asset, &10500);
    let price_data2 = client.get_price_data(&asset);
    assert_eq!(price_data2.0, 10500);
}

#[test]
fn test_multiple_assets() {
    let e = Env::default();
    e.mock_all_auths();

    let bot = Address::generate(&e);
    let asset_a = Address::generate(&e);
    let asset_b = Address::generate(&e);
    let client = create_oracle_contract(&e, &bot);

    client.submit_price(&bot, &asset_a, &100);
    client.submit_price(&bot, &asset_b, &200);

    assert_eq!(client.get_price(&asset_a), 100);
    assert_eq!(client.get_price(&asset_b), 200);
}

#[test]
#[should_panic(expected = "Price not found for asset")]
fn test_get_price_for_unknown_asset() {
    let e = Env::default();
    e.mock_all_auths();

    let bot = Address::generate(&e);
    let asset = Address::generate(&e);
    let client = create_oracle_contract(&e, &bot);

    client.get_price(&asset); // Should panic
}
