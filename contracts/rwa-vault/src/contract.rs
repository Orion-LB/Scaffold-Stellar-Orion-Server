use soroban_sdk::{contract, contractimpl, symbol_short, token, Address, Env, Map, Symbol, contracttype, IntoVal};

// StRWA token client interface - manually defined to avoid circular dependency
pub struct StRwaTokenClient<'a> {
    env: &'a Env,
    address: &'a Address,
}

impl<'a> StRwaTokenClient<'a> {
    pub fn new(env: &'a Env, address: &'a Address) -> Self {
        StRwaTokenClient { env, address }
    }

    pub fn mint(&self, to: &Address, amount: &i128) {
        self.env.invoke_contract(
            self.address,
            &symbol_short!("mint"),
            (to, amount).into_val(self.env),
        )
    }

    pub fn burn(&self, from: &Address, amount: &i128) {
        self.env.invoke_contract(
            self.address,
            &symbol_short!("burn"),
            (from, amount).into_val(self.env),
        )
    }

    pub fn balance(&self, id: &Address) -> i128 {
        self.env.invoke_contract(
            self.address,
            &symbol_short!("balance"),
            (id,).into_val(self.env),
        )
    }

    pub fn total_supply(&self) -> i128 {
        self.env.invoke_contract(
            self.address,
            &Symbol::new(self.env, "total_supply"),
            ().into_val(self.env),
        )
    }
}

/// User stake information
#[contracttype]
#[derive(Clone)]
pub struct StakeInfo {
    pub amount: i128,              // Amount of RWA staked
    pub timestamp: u64,            // When they staked
    pub is_borrower: bool,         // Are they using stRWA as collateral?
    pub borrowed_amount: i128,     // How much USDC borrowed (if borrower)
    pub loan_period: u64,          // Total loan duration in seconds
}

/// Storage Keys
const RWA_TOKEN_KEY: Symbol = symbol_short!("rwa");
const STRWA_TOKEN_KEY: Symbol = symbol_short!("strwa");
const USDC_TOKEN_KEY: Symbol = symbol_short!("usdc");
const LENDING_POOL_KEY: Symbol = symbol_short!("pool");
const ADMIN_KEY: Symbol = symbol_short!("admin");

const TOTAL_YIELD_POOL: Symbol = symbol_short!("yield");
const STAKE_INFO: Symbol = symbol_short!("stakes");      // Map<Address, StakeInfo>
const LP_LIQUIDITY_USED: Symbol = symbol_short!("lp_used"); // Map<Address, i128>

#[contract]
pub struct RwaVault;

#[contractimpl]
impl RwaVault {
    pub fn initialize(
        e: &Env,
        admin: Address,
        rwa_token: Address,
        strwa_token: Address
    ) {
        // Store addresses
        e.storage().instance().set(&ADMIN_KEY, &admin);
        e.storage().instance().set(&RWA_TOKEN_KEY, &rwa_token);
        e.storage().instance().set(&STRWA_TOKEN_KEY, &strwa_token);
        
        // Initialize yield pool to 0
        e.storage().instance().set(&TOTAL_YIELD_POOL, &0i128);
        
        // Initialize stake info map
        let stakes: Map<Address, StakeInfo> = Map::new(e);
        e.storage().instance().set(&STAKE_INFO, &stakes);
        
        // Initialize LP liquidity tracking
        let lp_used: Map<Address, i128> = Map::new(e);
        e.storage().instance().set(&LP_LIQUIDITY_USED, &lp_used);
    }

    /// Set USDC token address (one-time, after USDC deployment)
    pub fn set_usdc_address(e: &Env, usdc: Address) {
        let admin: Address = e.storage().instance().get(&ADMIN_KEY).unwrap();
        admin.require_auth();
        
        if e.storage().instance().has(&USDC_TOKEN_KEY) {
            panic!("USDC address already set");
        }
        
        e.storage().instance().set(&USDC_TOKEN_KEY, &usdc);
    }

    /// Set LendingPool address (one-time, after LendingPool deployment)
    pub fn set_lending_pool(e: &Env, lending_pool: Address) {
        let admin: Address = e.storage().instance().get(&ADMIN_KEY).unwrap();
        admin.require_auth();
        
        if e.storage().instance().has(&LENDING_POOL_KEY) {
            panic!("Lending pool already set");
        }
        
        e.storage().instance().set(&LENDING_POOL_KEY, &lending_pool);
    }

    pub fn stake(e: &Env, user: Address, amount: i128) {
        user.require_auth();
        
        if amount <= 0 {
            panic!("Amount must be positive");
        }
        
        let rwa_addr: Address = e.storage().instance().get(&RWA_TOKEN_KEY).unwrap();
        let strwa_addr: Address = e.storage().instance().get(&STRWA_TOKEN_KEY).unwrap();
        
        let rwa_token = token::Client::new(e, &rwa_addr);
        rwa_token.transfer_from(
            &e.current_contract_address(),
            &user,
            &e.current_contract_address(),
            &amount
        );

        let strwa_client = StRwaTokenClient::new(e, &strwa_addr);
        strwa_client.mint(&user, &amount);
        
        let mut stakes: Map<Address, StakeInfo> = e.storage().instance()
            .get(&STAKE_INFO)
            .unwrap_or(Map::new(e));
        
        let existing_stake = stakes.get(user.clone()).unwrap_or(StakeInfo {
            amount: 0,
            timestamp: 0,
            is_borrower: false,
            borrowed_amount: 0,
            loan_period: 0,
        });
        
        stakes.set(user.clone(), StakeInfo {
            amount: existing_stake.amount + amount,
            timestamp: e.ledger().timestamp(),
            is_borrower: existing_stake.is_borrower,
            borrowed_amount: existing_stake.borrowed_amount,
            loan_period: existing_stake.loan_period,
        });
        
        e.storage().instance().set(&STAKE_INFO, &stakes);
        
        e.events().publish((symbol_short!("stake"), user.clone()), amount);
    }

    pub fn unstake(e: &Env, user: Address, amount: i128) {
        user.require_auth();
        
        if amount <= 0 {
            panic!("Amount must be positive");
        }
        
        let mut stakes: Map<Address, StakeInfo> = e.storage().instance()
            .get(&STAKE_INFO)
            .unwrap();
        
        let stake_info = stakes.get(user.clone())
            .expect("User has no stake");
        
        if amount > stake_info.amount {
            panic!("Insufficient staked amount");
        }
        
        let strwa_addr: Address = e.storage().instance().get(&STRWA_TOKEN_KEY).unwrap();

        if stake_info.is_borrower {
            let current_time = e.ledger().timestamp();
            let time_elapsed = current_time - stake_info.timestamp;
            let lockup_period = (stake_info.loan_period * 20) / 100;
            
            if time_elapsed < lockup_period {
                panic!("Cannot unstake during lockup period (first 20% of loan)");
            }
            
            if stake_info.borrowed_amount > 0 {
                let foreclosure_fee = (amount * 5) / 100;

                let strwa_client = StRwaTokenClient::new(e, &strwa_addr);
                strwa_client.burn(&user, &foreclosure_fee);

                e.events().publish(
                    (symbol_short!("forclose"), user.clone()),
                    foreclosure_fee
                );
            }
        } else {
            let lp_used: Map<Address, i128> = e.storage().instance()
                .get(&LP_LIQUIDITY_USED)
                .unwrap_or(Map::new(e));
            
            let liquidity_in_use = lp_used.get(user.clone()).unwrap_or(0);
            
            if liquidity_in_use > 0 && amount > (stake_info.amount - liquidity_in_use) {
                panic!("Cannot unstake: liquidity is being used for loans");
            }
        }

        let strwa_client = StRwaTokenClient::new(e, &strwa_addr);
        strwa_client.burn(&user, &amount);

        let rwa_addr: Address = e.storage().instance().get(&RWA_TOKEN_KEY).unwrap();
        let rwa_token = token::Client::new(e, &rwa_addr);
        rwa_token.transfer(
            &e.current_contract_address(),
            &user,
            &amount
        );
        
        stakes.set(user.clone(), StakeInfo {
            amount: stake_info.amount - amount,
            timestamp: stake_info.timestamp,
            is_borrower: stake_info.is_borrower,
            borrowed_amount: stake_info.borrowed_amount,
            loan_period: stake_info.loan_period,
        });
        
        e.storage().instance().set(&STAKE_INFO, &stakes);
        
        e.events().publish((symbol_short!("unstake"), user.clone()), amount);
    }

    pub fn admin_fund_yield(e: &Env, amount: i128) {
        let admin: Address = e.storage().instance().get(&ADMIN_KEY).unwrap();
        admin.require_auth();
        
        if amount <= 0 {
            panic!("Amount must be positive");
        }
        
        let usdc_addr: Address = e.storage().instance().get(&USDC_TOKEN_KEY).unwrap();
        let usdc_token = token::Client::new(e, &usdc_addr);
        usdc_token.transfer_from(
            &e.current_contract_address(),
            &admin,
            &e.current_contract_address(),
            &amount
        );
        
        let current_yield: i128 = e.storage().instance().get(&TOTAL_YIELD_POOL).unwrap_or(0);
        e.storage().instance().set(&TOTAL_YIELD_POOL, &(current_yield + amount));
        
        e.events().publish((symbol_short!("yieldfund"), admin), amount);
    }

    pub fn claimable_yield(e: &Env, user: Address) -> i128 {
        let strwa_addr: Address = e.storage().instance().get(&STRWA_TOKEN_KEY).unwrap();
        let strwa_client = StRwaTokenClient::new(e, &strwa_addr);

        let user_balance = strwa_client.balance(&user);

        if user_balance == 0 {
            return 0;
        }

        let total_shares = strwa_client.total_supply();

        if total_shares == 0 {
            return 0;
        }
        
        let total_yield: i128 = e.storage().instance().get(&TOTAL_YIELD_POOL).unwrap_or(0);
        
        (total_yield * user_balance) / total_shares
    }

    pub fn claim_yield(e: &Env, user: Address) -> i128 {
        user.require_auth();
        
        let claimable = Self::claimable_yield(e, user.clone());
        
        if claimable == 0 {
            panic!("No yield to claim");
        }
        
        let usdc_addr: Address = e.storage().instance().get(&USDC_TOKEN_KEY).unwrap();
        let usdc_token = token::Client::new(e, &usdc_addr);
        usdc_token.transfer(
            &e.current_contract_address(),
            &user,
            &claimable
        );
        
        let current_yield: i128 = e.storage().instance().get(&TOTAL_YIELD_POOL).unwrap();
        e.storage().instance().set(&TOTAL_YIELD_POOL, &(current_yield - claimable));
        
        e.events().publish((symbol_short!("claim"), user.clone()), claimable);
        
        claimable
    }

    pub fn mark_as_borrower(
        e: &Env,
        user: Address,
        borrowed_amount: i128,
        loan_period: u64
    ) {
        let lending_pool: Address = e.storage().instance()
            .get(&LENDING_POOL_KEY)
            .expect("Lending pool not set");
        lending_pool.require_auth();
        
        let mut stakes: Map<Address, StakeInfo> = e.storage().instance()
            .get(&STAKE_INFO)
            .unwrap();
        
        let mut stake_info = stakes.get(user.clone())
            .expect("User has no stake");
        
        stake_info.is_borrower = true;
        stake_info.borrowed_amount = borrowed_amount;
        stake_info.loan_period = loan_period;
        stake_info.timestamp = e.ledger().timestamp();
        
        stakes.set(user.clone(), stake_info);
        e.storage().instance().set(&STAKE_INFO, &stakes);
    }

    pub fn pull_yield_for_repay(e: &Env, user: Address, amount: i128) -> i128 {
        let lending_pool: Address = e.storage().instance()
            .get(&LENDING_POOL_KEY)
            .expect("Lending pool not set");
        lending_pool.require_auth();
        
        let claimable = Self::claimable_yield(e, user.clone());
        let amount_to_pull = if amount > claimable { claimable } else { amount };
        
        if amount_to_pull == 0 {
            return 0;
        }
        
        let usdc_addr: Address = e.storage().instance().get(&USDC_TOKEN_KEY).unwrap();
        let usdc_token = token::Client::new(e, &usdc_addr);
        usdc_token.transfer(
            &e.current_contract_address(),
            &lending_pool,
            &amount_to_pull
        );
        
        let current_yield: i128 = e.storage().instance().get(&TOTAL_YIELD_POOL).unwrap();
        e.storage().instance().set(&TOTAL_YIELD_POOL, &(current_yield - amount_to_pull));
        
        amount_to_pull
    }

    pub fn update_borrowed_amount(e: &Env, user: Address, new_amount: i128) {
        let lending_pool: Address = e.storage().instance()
            .get(&LENDING_POOL_KEY)
            .expect("Lending pool not set");
        lending_pool.require_auth();
        
        let mut stakes: Map<Address, StakeInfo> = e.storage().instance()
            .get(&STAKE_INFO)
            .unwrap();
        
        let mut stake_info = stakes.get(user.clone())
            .expect("User has no stake");
        
        stake_info.borrowed_amount = new_amount;
        
        if new_amount == 0 {
            stake_info.is_borrower = false;
        }
        
        stakes.set(user.clone(), stake_info);
        e.storage().instance().set(&STAKE_INFO, &stakes);
    }

    pub fn set_lp_liquidity_used(e: &Env, lp: Address, amount_used: i128) {
        let lending_pool: Address = e.storage().instance()
            .get(&LENDING_POOL_KEY)
            .expect("Lending pool not set");
        lending_pool.require_auth();
        
        let mut lp_used: Map<Address, i128> = e.storage().instance()
            .get(&LP_LIQUIDITY_USED)
            .unwrap_or(Map::new(e));
        
        lp_used.set(lp, amount_used);
        e.storage().instance().set(&LP_LIQUIDITY_USED, &lp_used);
    }
}
