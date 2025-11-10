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

    /// Alias for submit_price (for bot compatibility)
    pub fn set_price(e: &Env, asset_address: Address, price: i128, timestamp: u64, source: Address) {
        // Verify caller is the authorized bot
        let authorized_bot: Address = e.storage().instance()
            .get(&symbol_short!("bot"))
            .expect("Bot address not set");

        // Require authentication from the source (bot)
        source.require_auth();

        // Verify the caller is the authorized bot
        if source != authorized_bot {
            panic!("Unauthorized: only bot can set prices");
        }

        // Validate price is positive
        if price <= 0 {
            panic!("Price must be positive");
        }

        // Create price data (use provided timestamp or current ledger time)
        let price_data = PriceData {
            price,
            timestamp: if timestamp > 0 { timestamp } else { e.ledger().timestamp() },
        };

        // Load prices map
        let mut prices: Map<Address, PriceData> = e.storage().instance()
            .get(&symbol_short!("prices"))
            .unwrap_or(Map::new(e));

        // Update price for asset
        prices.set(asset_address.clone(), price_data);

        // Save updated prices map
        e.storage().instance().set(&symbol_short!("prices"), &prices);

        // Emit event (for off-chain monitoring)
        e.events().publish(
            (symbol_short!("price_upd"), asset_address),
            (price, timestamp)
        );
    }
    
    /// Get the latest price for an asset (public, read-only)
    pub fn get_price(e: &Env, asset: Address) -> i128 {
        // Load prices map - return 0 if not initialized yet
        let prices: Map<Address, PriceData> = e.storage().instance()
            .get(&symbol_short!("prices"))
            .unwrap_or(Map::new(e));

        // Get price data for asset - return 0 if not found
        match prices.get(asset) {
            Some(price_data) => price_data.price,
            None => 0, // Return 0 if no price set yet
        }
    }
    
    /// Get the full price data for an asset (price + timestamp)
    pub fn get_price_data(e: &Env, asset: Address) -> (i128, u64) {
        // Load prices map - return (0, 0) if not initialized yet
        let prices: Map<Address, PriceData> = e.storage().instance()
            .get(&symbol_short!("prices"))
            .unwrap_or(Map::new(e));

        // Get price data for asset - return (0, 0) if not found
        match prices.get(asset) {
            Some(price_data) => (price_data.price, price_data.timestamp),
            None => (0, 0), // Return (0, 0) if no price set yet
        }
    }
    
    /// Test helper: Get bot address
    #[cfg(test)]
    pub fn get_bot(e: &Env) -> Address {
        e.storage().instance().get(&symbol_short!("bot")).unwrap()
    }
}
