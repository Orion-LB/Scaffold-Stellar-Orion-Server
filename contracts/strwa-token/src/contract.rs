use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, String};
use stellar_tokens::fungible::{Base, FungibleToken};
use stellar_macros::default_impl;

#[contract]
pub struct StRwaToken;

#[contractimpl]
impl StRwaToken {
    pub fn initialize(e: &Env, admin: Address) {
        // Set token metadata
        Base::set_metadata(
            e,
            18,  // Match RWA decimals for 1:1 parity
            String::from_str(e, "Staked Real World Asset"),
            String::from_str(e, "stRWA"),
        );
        
        // Store admin address to be used for setting the vault address
        e.storage().instance().set(&symbol_short!("admin"), &admin);
    }
    
    /// Admin sets the vault address (one-time operation after vault is deployed)
    pub fn set_vault_address(e: &Env, vault: Address) {
        // Verify caller is admin
        let admin: Address = e.storage().instance().get(&symbol_short!("admin")).expect("Admin not set");
        admin.require_auth();
        
        // Check vault address is not already set (one-time only)
        if e.storage().instance().has(&symbol_short!("vault")) {
            panic!("Vault address already set");
        }
        
        // Store vault address
        e.storage().instance().set(&symbol_short!("vault"), &vault);
    }
    
    /// Mint stRWA (only callable by vault)
    pub fn mint(e: &Env, to: Address, amount: i128) {
        // Get vault address
        let vault: Address = e.storage().instance().get(&symbol_short!("vault")).expect("Vault not set");
        
        // Only vault can mint
        vault.require_auth();
        
        // Mint tokens
        Base::mint(e, &to, amount);
    }
    
    /// Burn stRWA (only callable by vault)
    pub fn burn(e: &Env, from: Address, amount: i128) {
        // Get vault address
        let vault: Address = e.storage().instance().get(&symbol_short!("vault")).expect("Vault not set");
        
        // Only vault can burn
        vault.require_auth();
        
        // Burn tokens
        Base::burn(e, &from, amount);
    }
}

#[cfg(test)]
#[contractimpl]
impl StRwaToken {
    pub fn get_vault(e: &Env) -> Address {
        e.storage().instance().get(&symbol_short!("vault")).unwrap()
    }
}

// Use OpenZeppelin's default fungible token implementation
#[default_impl]
#[contractimpl]
impl FungibleToken for StRwaToken {
    type ContractType = Base;  // No restrictions on transfers
}
