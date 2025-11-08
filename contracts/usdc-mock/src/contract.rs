use soroban_sdk::{contract, contractimpl, Address, Env, String};
use stellar_tokens::fungible::{Base, FungibleToken};
use stellar_macros::default_impl;

#[contract]
pub struct UsdcMock;

#[contractimpl]
impl UsdcMock {
    pub fn __constructor(e: &Env, admin: Address, initial_supply: i128) {
        // Set token metadata
        Base::set_metadata(
            e,
            7,  // decimals (Stellar standard)
            String::from_str(e, "USD Coin Mock"),
            String::from_str(e, "USDC"),
        );
        
        // Mint initial supply to admin
        Base::mint(e, &admin, initial_supply);
    }

    pub fn mint(e: &Env, admin: Address, to: Address, amount: i128) {
        admin.require_auth(); // Ensure only admin can mint
        Base::mint(e, &to, amount);
    }
}

// Use OpenZeppelin's default fungible token implementation
#[default_impl]
#[contractimpl]
impl FungibleToken for UsdcMock {
    type ContractType = Base;
}
