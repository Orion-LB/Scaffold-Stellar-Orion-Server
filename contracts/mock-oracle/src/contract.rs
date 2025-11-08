use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, Map, contracttype};

/// Price data structure
#[contracttype]
#[derive(Clone)]
pub struct PriceData {
    pub price: i128,       // Price in basis points (e.g., 10500 = 105.00 USDC)
    pub timestamp: u64,    // Unix timestamp of last update
}

#[contract]
pub struct MockOracle;

#[contractimpl]
impl MockOracle {
    /// Constructor
    /// Sets the authorized bot address that can submit prices
    pub fn __constructor(e: &Env, bot_address: Address) {
        // Store the bot address
        e.storage().instance().set(&symbol_short!("bot"), &bot_address);
        
        // Initialize empty price map
        let prices: Map<Address, PriceData> = Map::new(e);
        e.storage().instance().set(&symbol_short!("prices"), &prices);
    }
    
    /// Submit a new price for an asset (bot-only)
    pub fn submit_price(e: &Env, bot: Address, asset: Address, price: i128) {
        // Verify caller is the authorized bot
        let authorized_bot: Address = e.storage().instance()
            .get(&symbol_short!("bot"))
            .expect("Bot address not set");
        
        // Require authentication from the bot
        bot.require_auth();
        
        // Verify the caller is the authorized bot
        if bot != authorized_bot {
            panic!("Unauthorized: only bot can submit prices");
        }
        
        // Validate price is positive
        if price <= 0 {
            panic!("Price must be positive");
        }
        
        // Get current timestamp
        let timestamp = e.ledger().timestamp();
        
        // Create price data
        let price_data = PriceData {
            price,
            timestamp,
        };
        
        // Load prices map
        let mut prices: Map<Address, PriceData> = e.storage().instance()
            .get(&symbol_short!("prices"))
            .unwrap_or(Map::new(e));
        
        // Update price for asset
        prices.set(asset.clone(), price_data);
        
        // Save updated prices map
        e.storage().instance().set(&symbol_short!("prices"), &prices);
        
        // Emit event (for off-chain monitoring)
        e.events().publish(
            (symbol_short!("price_upd"), asset),
            (price, timestamp)
        );
    }
    
    /// Get the latest price for an asset (public, read-only)
    pub fn get_price(e: &Env, asset: Address) -> i128 {
        // Load prices map
        let prices: Map<Address, PriceData> = e.storage().instance()
            .get(&symbol_short!("prices"))
            .expect("Prices not initialized");
        
        // Get price data for asset
        let price_data = prices.get(asset.clone())
            .expect("Price not found for asset");
        
        price_data.price
    }
    
    /// Get the full price data for an asset (price + timestamp)
    pub fn get_price_data(e: &Env, asset: Address) -> (i128, u64) {
        // Load prices map
        let prices: Map<Address, PriceData> = e.storage().instance()
            .get(&symbol_short!("prices"))
            .expect("Prices not initialized");
        
        // Get price data for asset
        let price_data = prices.get(asset)
            .expect("Price not found for asset");
        
        (price_data.price, price_data.timestamp)
    }
    
    /// Test helper: Get bot address
    #[cfg(test)]
    pub fn get_bot(e: &Env) -> Address {
        e.storage().instance().get(&symbol_short!("bot")).unwrap()
    }
}
