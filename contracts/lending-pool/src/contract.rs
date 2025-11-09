use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, IntoVal, Symbol,
};
use stellar_access::access_control::{self as access_control, AccessControl};
use stellar_macros::{default_impl, only_role};

// ============================================================================
// Data Structures
// ============================================================================

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Loan {
    pub borrower: Address,
    pub collateral_amount: i128,
    pub principal: i128,
    pub outstanding_debt: i128,
    pub interest_rate: i128,        // Basis points (e.g., 700 = 7%, 1400 = 14%)
    pub start_time: u64,
    pub end_time: u64,
    pub last_interest_update: u64,
    pub warnings_issued: u32,
    pub last_warning_time: u64,
    pub penalties: i128,
    pub yield_share_percent: i128, // Basis points (e.g., 1000 = 10%, 2000 = 20%)
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LPDeposit {
    pub depositor: Address,
    pub total_deposited: i128,
    pub locked_amount: i128,
    pub available_amount: i128,
    pub total_interest_earned: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenRiskProfile {
    pub rwa_token_address: Address,
    pub token_yield_apr: i128,     // Basis points (e.g., 500 = 5%)
    pub token_expiry: u64,
    pub last_updated: u64,
}

// ============================================================================
// Storage Keys
// ============================================================================

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    VaultAddress,
    OracleAddress,
    UsdcAddress,
    StRwaAddress,
    RwaAddress,
    LiquidationBot,
    Loan(Address),              // borrower -> Loan
    LPDeposit(Address),         // depositor -> LPDeposit
    TokenRiskProfile(Address),  // rwa_token -> TokenRiskProfile
    TotalLiquidity,             // Total USDC in pool
    TotalLockedLiquidity,       // Total USDC locked in loans
}

// ============================================================================
// Manual Client Interfaces for Cross-Contract Calls
// ============================================================================

pub struct UsdcClient<'a> {
    env: &'a Env,
    address: &'a Address,
}

impl<'a> UsdcClient<'a> {
    pub fn new(env: &'a Env, address: &'a Address) -> Self {
        UsdcClient { env, address }
    }

    pub fn transfer(&self, from: &Address, to: &Address, amount: &i128) {
        self.env.invoke_contract(
            self.address,
            &Symbol::new(self.env, "transfer"),
            (from, to, amount).into_val(self.env),
        )
    }

    pub fn balance(&self, id: &Address) -> i128 {
        self.env.invoke_contract(
            self.address,
            &Symbol::new(self.env, "balance"),
            (id,).into_val(self.env),
        )
    }
}

pub struct StRwaClient<'a> {
    env: &'a Env,
    address: &'a Address,
}

impl<'a> StRwaClient<'a> {
    pub fn new(env: &'a Env, address: &'a Address) -> Self {
        StRwaClient { env, address }
    }

    pub fn transfer(&self, from: &Address, to: &Address, amount: &i128) {
        self.env.invoke_contract(
            self.address,
            &Symbol::new(self.env, "transfer"),
            (from, to, amount).into_val(self.env),
        )
    }

    pub fn balance(&self, id: &Address) -> i128 {
        self.env.invoke_contract(
            self.address,
            &Symbol::new(self.env, "balance"),
            (id,).into_val(self.env),
        )
    }

    pub fn burn(&self, from: &Address, amount: &i128) {
        self.env.invoke_contract(
            self.address,
            &Symbol::new(self.env, "burn"),
            (from, amount).into_val(self.env),
        )
    }
}

pub struct VaultClient<'a> {
    env: &'a Env,
    address: &'a Address,
}

impl<'a> VaultClient<'a> {
    pub fn new(env: &'a Env, address: &'a Address) -> Self {
        VaultClient { env, address }
    }

    pub fn mark_as_borrower(&self, user: &Address, borrowed_amount: &i128, loan_period: &u64) {
        self.env.invoke_contract(
            self.address,
            &Symbol::new(self.env, "mark_as_borrower"),
            (user, borrowed_amount, loan_period).into_val(self.env),
        )
    }

    pub fn pull_yield_for_repay(&self, user: &Address, amount: &i128) -> i128 {
        self.env.invoke_contract(
            self.address,
            &Symbol::new(self.env, "pull_yield_for_repay"),
            (user, amount).into_val(self.env),
        )
    }

    pub fn set_lp_liquidity_used(&self, user: &Address, amount: &i128) {
        self.env.invoke_contract(
            self.address,
            &Symbol::new(self.env, "set_lp_liquidity_used"),
            (user, amount).into_val(self.env),
        )
    }
}

pub struct OracleClient<'a> {
    env: &'a Env,
    address: &'a Address,
}

impl<'a> OracleClient<'a> {
    pub fn new(env: &'a Env, address: &'a Address) -> Self {
        OracleClient { env, address }
    }

    pub fn get_price(&self, asset: &Address) -> (i128, u64) {
        self.env.invoke_contract(
            self.address,
            &Symbol::new(self.env, "get_price"),
            (asset,).into_val(self.env),
        )
    }
}

// ============================================================================
// Contract Implementation
// ============================================================================

#[contract]
pub struct LendingPool;

#[contractimpl]
impl LendingPool {
    /// Initialize the lending pool contract
    pub fn initialize(
        e: Env,
        admin: Address,
        vault_address: Address,
        oracle_address: Address,
        usdc_address: Address,
        strwa_address: Address,
        rwa_address: Address,
    ) {
        // Set up access control
        access_control::set_admin(&e, &admin);

        // Grant admin role to the admin
        access_control::grant_role_no_auth(&e, &admin, &admin, &symbol_short!("admin"));

        // Store contract addresses
        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage()
            .instance()
            .set(&DataKey::VaultAddress, &vault_address);
        e.storage()
            .instance()
            .set(&DataKey::OracleAddress, &oracle_address);
        e.storage()
            .instance()
            .set(&DataKey::UsdcAddress, &usdc_address);
        e.storage()
            .instance()
            .set(&DataKey::StRwaAddress, &strwa_address);
        e.storage()
            .instance()
            .set(&DataKey::RwaAddress, &rwa_address);

        // Initialize liquidity counters
        e.storage().instance().set(&DataKey::TotalLiquidity, &0i128);
        e.storage()
            .instance()
            .set(&DataKey::TotalLockedLiquidity, &0i128);
    }

    /// Set the liquidation bot address (only admin)
    #[only_role(caller, "admin")]
    pub fn set_liquidation_bot(e: Env, caller: Address, bot_address: Address) {
        e.storage()
            .instance()
            .set(&DataKey::LiquidationBot, &bot_address);
    }

    /// Update token risk profile (only admin)
    #[only_role(caller, "admin")]
    pub fn update_token_risk_profile(
        e: Env,
        caller: Address,
        rwa_token_address: Address,
        token_yield_apr: i128,
        token_expiry: u64,
    ) {
        let profile = TokenRiskProfile {
            rwa_token_address: rwa_token_address.clone(),
            token_yield_apr,
            token_expiry,
            last_updated: e.ledger().timestamp(),
        };

        e.storage()
            .instance()
            .set(&DataKey::TokenRiskProfile(rwa_token_address), &profile);
    }

    // ========================================================================
    // LP Functions
    // ========================================================================

    /// LP deposits USDC to earn interest
    pub fn lp_deposit(e: Env, depositor: Address, amount: i128) {
        depositor.require_auth();

        if amount <= 0 {
            panic!("Amount must be positive");
        }

        let usdc_address: Address = e.storage().instance().get(&DataKey::UsdcAddress).unwrap();
        let usdc_client = UsdcClient::new(&e, &usdc_address);

        // Transfer USDC from depositor to contract
        usdc_client.transfer(&depositor, &e.current_contract_address(), &amount);

        // Update or create LP deposit record
        let mut deposit = e
            .storage()
            .instance()
            .get(&DataKey::LPDeposit(depositor.clone()))
            .unwrap_or(LPDeposit {
                depositor: depositor.clone(),
                total_deposited: 0,
                locked_amount: 0,
                available_amount: 0,
                total_interest_earned: 0,
            });

        deposit.total_deposited += amount;
        deposit.available_amount += amount;

        e.storage()
            .instance()
            .set(&DataKey::LPDeposit(depositor.clone()), &deposit);

        // Update total liquidity
        let mut total_liquidity: i128 = e
            .storage()
            .instance()
            .get(&DataKey::TotalLiquidity)
            .unwrap_or(0);
        total_liquidity += amount;
        e.storage()
            .instance()
            .set(&DataKey::TotalLiquidity, &total_liquidity);

        e.events()
            .publish((symbol_short!("lp_depo"),), (depositor, amount));
    }

    /// LP withdraws USDC (only available amount, not locked in loans)
    pub fn lp_withdraw(e: Env, depositor: Address, amount: i128) {
        depositor.require_auth();

        if amount <= 0 {
            panic!("Amount must be positive");
        }

        let mut deposit: LPDeposit = e
            .storage()
            .instance()
            .get(&DataKey::LPDeposit(depositor.clone()))
            .expect("No deposit found");

        if amount > deposit.available_amount {
            panic!("Insufficient available balance");
        }

        deposit.available_amount -= amount;
        deposit.total_deposited -= amount;

        let usdc_address: Address = e.storage().instance().get(&DataKey::UsdcAddress).unwrap();
        let usdc_client = UsdcClient::new(&e, &usdc_address);

        // Transfer USDC back to depositor
        usdc_client.transfer(&e.current_contract_address(), &depositor, &amount);

        e.storage()
            .instance()
            .set(&DataKey::LPDeposit(depositor.clone()), &deposit);

        // Update total liquidity
        let mut total_liquidity: i128 = e
            .storage()
            .instance()
            .get(&DataKey::TotalLiquidity)
            .unwrap();
        total_liquidity -= amount;
        e.storage()
            .instance()
            .set(&DataKey::TotalLiquidity, &total_liquidity);

        e.events()
            .publish((symbol_short!("lp_withd"),), (depositor, amount));
    }

    /// Get LP deposit info
    pub fn get_lp_deposit(e: Env, depositor: Address) -> LPDeposit {
        e.storage()
            .instance()
            .get(&DataKey::LPDeposit(depositor.clone()))
            .unwrap_or(LPDeposit {
                depositor: depositor.clone(),
                total_deposited: 0,
                locked_amount: 0,
                available_amount: 0,
                total_interest_earned: 0,
            })
    }

    // ========================================================================
    // Loan Origination
    // ========================================================================

    /// Originate a new loan
    pub fn originate_loan(
        e: Env,
        borrower: Address,
        collateral_amount: i128,
        loan_amount: i128,
        duration_months: u32,
    ) {
        borrower.require_auth();

        // Check: One loan per user
        if e.storage()
            .instance()
            .get::<DataKey, Loan>(&DataKey::Loan(borrower.clone()))
            .is_some()
        {
            panic!("User already has an active loan");
        }

        // Validate loan duration (3-24 months)
        if duration_months < 3 || duration_months > 24 {
            panic!("Loan duration must be between 3 and 24 months");
        }

        // Get token risk profile for RWA
        let rwa_address: Address = e.storage().instance().get(&DataKey::RwaAddress).unwrap();
        let risk_profile: TokenRiskProfile = e
            .storage()
            .instance()
            .get(&DataKey::TokenRiskProfile(rwa_address.clone()))
            .expect("Token risk profile not set");

        // Auto-calculate interest rate based on token yield
        // High risk (yield < 5%): 14% APR
        // Low risk (yield >= 5%): 7% APR
        let interest_rate = if risk_profile.token_yield_apr < 500 {
            1400 // 14%
        } else {
            700 // 7%
        };

        // Auto-calculate yield share percent
        // High risk: 20% to LPs
        // Low risk: 10% to LPs
        let yield_share_percent = if risk_profile.token_yield_apr < 500 {
            2000 // 20%
        } else {
            1000 // 10%
        };

        // Get oracle price for stRWA collateral
        let oracle_address: Address = e.storage().instance().get(&DataKey::OracleAddress).unwrap();
        let oracle_client = OracleClient::new(&e, &oracle_address);
        let strwa_address: Address = e.storage().instance().get(&DataKey::StRwaAddress).unwrap();
        let (strwa_price, price_timestamp) = oracle_client.get_price(&strwa_address);

        // Check oracle price staleness (must be < 24 hours old)
        let current_time = e.ledger().timestamp();
        if current_time - price_timestamp > 86400 {
            // 24 hours in seconds
            panic!("Oracle price is stale");
        }

        // Calculate collateral value in USDC
        let collateral_value = (collateral_amount * strwa_price) / 1_000_000; // Assuming 6 decimals

        // Check 140% collateral ratio (LTV)
        // collateral_value >= loan_amount * 1.4
        if collateral_value * 100 < loan_amount * 140 {
            panic!("Insufficient collateral (140% ratio required)");
        }

        // Check sufficient liquidity in pool
        let total_liquidity: i128 = e
            .storage()
            .instance()
            .get(&DataKey::TotalLiquidity)
            .unwrap_or(0);
        let total_locked: i128 = e
            .storage()
            .instance()
            .get(&DataKey::TotalLockedLiquidity)
            .unwrap_or(0);
        let available_liquidity = total_liquidity - total_locked;

        if loan_amount > available_liquidity {
            panic!("Insufficient pool liquidity");
        }

        // Transfer stRWA collateral from borrower to contract
        let strwa_client = StRwaClient::new(&e, &strwa_address);
        strwa_client.transfer(&borrower, &e.current_contract_address(), &collateral_amount);

        // Calculate loan end time
        let start_time = e.ledger().timestamp();
        let duration_seconds = (duration_months as u64) * 30 * 24 * 60 * 60; // Approximate
        let end_time = start_time + duration_seconds;

        // Create loan record
        let loan = Loan {
            borrower: borrower.clone(),
            collateral_amount,
            principal: loan_amount,
            outstanding_debt: loan_amount,
            interest_rate,
            start_time,
            end_time,
            last_interest_update: start_time,
            warnings_issued: 0,
            last_warning_time: 0,
            penalties: 0,
            yield_share_percent,
        };

        e.storage()
            .instance()
            .set(&DataKey::Loan(borrower.clone()), &loan);

        // Update locked liquidity
        let new_locked = total_locked + loan_amount;
        e.storage()
            .instance()
            .set(&DataKey::TotalLockedLiquidity, &new_locked);

        // Transfer USDC loan amount to borrower
        let usdc_address: Address = e.storage().instance().get(&DataKey::UsdcAddress).unwrap();
        let usdc_client = UsdcClient::new(&e, &usdc_address);
        usdc_client.transfer(&e.current_contract_address(), &borrower, &loan_amount);

        // Mark user as borrower in vault with loan details
        let vault_address: Address = e.storage().instance().get(&DataKey::VaultAddress).unwrap();
        let vault_client = VaultClient::new(&e, &vault_address);
        let loan_period = end_time - start_time;
        vault_client.mark_as_borrower(&borrower, &loan_amount, &loan_period);

        e.events()
            .publish((symbol_short!("loan_orig"),), (borrower, loan_amount));
    }

    // ========================================================================
    // Interest Calculation
    // ========================================================================

    /// Calculate compound interest for a loan
    /// Formula: A = P × (1 + r/12)^months
    fn calculate_compound_interest(
        principal: i128,
        annual_rate_bp: i128,
        months_elapsed: u64,
    ) -> i128 {
        if months_elapsed == 0 {
            return 0;
        }

        // Convert annual rate from basis points to monthly rate
        // annual_rate_bp / 10000 / 12
        let monthly_rate = annual_rate_bp * 1_000_000 / 10000 / 12; // Scale up for precision

        // Calculate (1 + r)^months using repeated multiplication
        let mut multiplier = 1_000_000; // Start with 1.0 scaled
        for _ in 0..months_elapsed {
            multiplier = (multiplier * (1_000_000 + monthly_rate)) / 1_000_000;
        }

        // A = P × multiplier
        let total_amount = (principal * multiplier) / 1_000_000;
        total_amount - principal // Return interest only
    }

    /// Update interest on a loan
    pub fn update_loan_interest(e: Env, borrower: Address) {
        let mut loan: Loan = e
            .storage()
            .instance()
            .get(&DataKey::Loan(borrower.clone()))
            .expect("Loan not found");

        let current_time = e.ledger().timestamp();
        let time_elapsed = current_time - loan.last_interest_update;
        let months_elapsed = time_elapsed / (30 * 24 * 60 * 60); // Approximate

        if months_elapsed == 0 {
            return; // No full month has passed
        }

        // Calculate compound interest
        let interest = Self::calculate_compound_interest(
            loan.outstanding_debt,
            loan.interest_rate,
            months_elapsed,
        );

        loan.outstanding_debt += interest;
        loan.last_interest_update = current_time;

        e.storage()
            .instance()
            .set(&DataKey::Loan(borrower.clone()), &loan);

        e.events()
            .publish((symbol_short!("int_upd"),), (borrower, interest));
    }

    // ========================================================================
    // Loan Repayment
    // ========================================================================

    /// Make a loan payment
    pub fn repay_loan(e: Env, borrower: Address, amount: i128) {
        borrower.require_auth();

        if amount <= 0 {
            panic!("Amount must be positive");
        }

        // Update interest first
        Self::update_loan_interest(e.clone(), borrower.clone());

        let mut loan: Loan = e
            .storage()
            .instance()
            .get(&DataKey::Loan(borrower.clone()))
            .expect("Loan not found");

        // Try to pull yield from vault first
        let vault_address: Address = e.storage().instance().get(&DataKey::VaultAddress).unwrap();
        let vault_client = VaultClient::new(&e, &vault_address);

        let yield_pulled = vault_client.pull_yield_for_repay(&borrower, &amount);
        let remaining_payment = amount - yield_pulled;

        // If yield covers the full payment, process it
        // Otherwise, borrower needs to provide the remaining
        if remaining_payment > 0 {
            let usdc_address: Address = e.storage().instance().get(&DataKey::UsdcAddress).unwrap();
            let usdc_client = UsdcClient::new(&e, &usdc_address);
            usdc_client.transfer(&borrower, &e.current_contract_address(), &remaining_payment);
        }

        // Calculate LP share of the payment
        let lp_share = (amount * loan.yield_share_percent) / 10000;
        let principal_payment = amount - lp_share;

        // Deduct from outstanding debt
        loan.outstanding_debt -= principal_payment;

        // Distribute LP share proportionally to all LPs
        // (Simplified: In production, would iterate over all LPs)
        // For now, we'll add this to total liquidity

        let mut total_liquidity: i128 = e
            .storage()
            .instance()
            .get(&DataKey::TotalLiquidity)
            .unwrap();
        total_liquidity += lp_share;
        e.storage()
            .instance()
            .set(&DataKey::TotalLiquidity, &total_liquidity);

        // Reset warnings if significant payment made
        if principal_payment > loan.principal / 10 {
            // If payment > 10% of principal
            loan.warnings_issued = 0;
            loan.last_warning_time = 0;
        }

        e.storage()
            .instance()
            .set(&DataKey::Loan(borrower.clone()), &loan);

        e.events()
            .publish((symbol_short!("repay"),), (borrower.clone(), amount));

        // Check if loan is fully repaid
        if loan.outstanding_debt <= 0 {
            Self::close_loan(e, borrower);
        }
    }

    /// Close a fully repaid loan
    fn close_loan(e: Env, borrower: Address) {
        let loan: Loan = e
            .storage()
            .instance()
            .get(&DataKey::Loan(borrower.clone()))
            .expect("Loan not found");

        // Return collateral to borrower
        let strwa_address: Address = e.storage().instance().get(&DataKey::StRwaAddress).unwrap();
        let strwa_client = StRwaClient::new(&e, &strwa_address);
        strwa_client.transfer(
            &e.current_contract_address(),
            &borrower,
            &loan.collateral_amount,
        );

        // Update locked liquidity
        let mut total_locked: i128 = e
            .storage()
            .instance()
            .get(&DataKey::TotalLockedLiquidity)
            .unwrap();
        total_locked -= loan.principal;
        e.storage()
            .instance()
            .set(&DataKey::TotalLockedLiquidity, &total_locked);

        // Mark user as no longer a borrower in vault
        let vault_address: Address = e.storage().instance().get(&DataKey::VaultAddress).unwrap();
        let vault_client = VaultClient::new(&e, &vault_address);
        vault_client.mark_as_borrower(&borrower, &0, &0);
        vault_client.set_lp_liquidity_used(&borrower, &0);

        // Remove loan record
        e.storage().instance().remove(&DataKey::Loan(borrower.clone()));

        e.events()
            .publish((symbol_short!("loan_cls"),), borrower);
    }

    /// Early loan closure with 5% closure fee
    pub fn close_loan_early(e: Env, borrower: Address) {
        borrower.require_auth();

        // Update interest first
        Self::update_loan_interest(e.clone(), borrower.clone());

        let loan: Loan = e
            .storage()
            .instance()
            .get(&DataKey::Loan(borrower.clone()))
            .expect("Loan not found");

        // Calculate closure fee: 5% of remaining debt
        let closure_fee = (loan.outstanding_debt * 5) / 100;
        let total_payment = loan.outstanding_debt + closure_fee;

        // Try to pull yield first
        let vault_address: Address = e.storage().instance().get(&DataKey::VaultAddress).unwrap();
        let vault_client = VaultClient::new(&e, &vault_address);

        let yield_pulled = vault_client.pull_yield_for_repay(&borrower, &total_payment);
        let remaining_payment = total_payment - yield_pulled;

        if remaining_payment > 0 {
            let usdc_address: Address = e.storage().instance().get(&DataKey::UsdcAddress).unwrap();
            let usdc_client = UsdcClient::new(&e, &usdc_address);
            usdc_client.transfer(&borrower, &e.current_contract_address(), &remaining_payment);
        }

        // Add closure fee to total liquidity (benefits LPs)
        let mut total_liquidity: i128 = e
            .storage()
            .instance()
            .get(&DataKey::TotalLiquidity)
            .unwrap();
        total_liquidity += closure_fee;
        e.storage()
            .instance()
            .set(&DataKey::TotalLiquidity, &total_liquidity);

        e.events()
            .publish((symbol_short!("early_cl"),), (borrower.clone(), total_payment));

        // Close the loan
        Self::close_loan(e, borrower);
    }

    // ========================================================================
    // Warning & Penalty System
    // ========================================================================

    /// Issue warning to borrower (can be called by anyone to trigger check)
    pub fn check_and_issue_warning(e: Env, borrower: Address) {
        // Update interest first
        Self::update_loan_interest(e.clone(), borrower.clone());

        let mut loan: Loan = e
            .storage()
            .instance()
            .get(&DataKey::Loan(borrower.clone()))
            .expect("Loan not found");

        let current_time = e.ledger().timestamp();

        // Get current collateral value
        let oracle_address: Address = e.storage().instance().get(&DataKey::OracleAddress).unwrap();
        let oracle_client = OracleClient::new(&e, &oracle_address);
        let strwa_address: Address = e.storage().instance().get(&DataKey::StRwaAddress).unwrap();
        let (strwa_price, price_timestamp) = oracle_client.get_price(&strwa_address);

        if current_time - price_timestamp > 86400 {
            panic!("Oracle price is stale");
        }

        let collateral_value = (loan.collateral_amount * strwa_price) / 1_000_000;
        let total_debt = loan.outstanding_debt + loan.penalties;

        // Check if warning should be issued
        // Condition 1: 2 weeks since last payment/warning
        // Condition 2: Collateral ratio >= 110%
        let two_weeks = 14 * 24 * 60 * 60u64;
        let time_since_last_warning = if loan.last_warning_time == 0 {
            current_time - loan.start_time
        } else {
            current_time - loan.last_warning_time
        };

        let collateral_ratio = (total_debt * 100) / collateral_value;
        let should_warn = time_since_last_warning >= two_weeks || collateral_ratio >= 110;

        if should_warn && loan.warnings_issued < 2 {
            loan.warnings_issued += 1;
            loan.last_warning_time = current_time;

            // Apply 2% penalty on outstanding debt
            let penalty = (loan.outstanding_debt * 2) / 100;
            loan.penalties += penalty;

            e.storage()
                .instance()
                .set(&DataKey::Loan(borrower.clone()), &loan);

            e.events()
                .publish((symbol_short!("warning"),), (borrower.clone(), loan.warnings_issued));
        }

        // If 2 warnings issued or collateral >= 110%, trigger liquidation check
        if loan.warnings_issued >= 2 || collateral_ratio >= 110 {
            e.events()
                .publish((symbol_short!("liq_flag"),), borrower);
        }
    }

    // ========================================================================
    // Liquidation
    // ========================================================================

    /// Liquidate a loan (only by liquidation bot)
    pub fn liquidate_loan(e: Env, caller: Address, borrower: Address) {
        caller.require_auth();

        // Verify caller is liquidation bot
        let bot_address: Address = e
            .storage()
            .instance()
            .get(&DataKey::LiquidationBot)
            .expect("Liquidation bot not set");

        if caller != bot_address {
            panic!("Only liquidation bot can liquidate");
        }

        // Update interest first
        Self::update_loan_interest(e.clone(), borrower.clone());

        let loan: Loan = e
            .storage()
            .instance()
            .get(&DataKey::Loan(borrower.clone()))
            .expect("Loan not found");

        // Get current collateral value
        let oracle_address: Address = e.storage().instance().get(&DataKey::OracleAddress).unwrap();
        let oracle_client = OracleClient::new(&e, &oracle_address);
        let strwa_address: Address = e.storage().instance().get(&DataKey::StRwaAddress).unwrap();
        let (strwa_price, price_timestamp) = oracle_client.get_price(&strwa_address);

        let current_time = e.ledger().timestamp();
        if current_time - price_timestamp > 86400 {
            panic!("Oracle price is stale");
        }

        let collateral_value = (loan.collateral_amount * strwa_price) / 1_000_000;
        let total_debt = loan.outstanding_debt + loan.penalties;

        // Check liquidation threshold: debt >= collateral_value × 110%
        if total_debt * 100 < collateral_value * 110 {
            panic!("Liquidation threshold not met");
        }

        // Calculate 10% bot reward
        let bot_reward = (collateral_value * 10) / 100;
        let remaining_collateral = collateral_value - bot_reward;

        // Burn stRWA collateral (convert to USDC via liquidation)
        let strwa_client = StRwaClient::new(&e, &strwa_address);
        strwa_client.burn(&e.current_contract_address(), &loan.collateral_amount);

        // Transfer bot reward in USDC
        let usdc_address: Address = e.storage().instance().get(&DataKey::UsdcAddress).unwrap();
        let usdc_client = UsdcClient::new(&e, &usdc_address);
        usdc_client.transfer(&e.current_contract_address(), &caller, &bot_reward);

        // Repay debt to pool from remaining collateral
        let _debt_repayment = if remaining_collateral > total_debt {
            total_debt
        } else {
            remaining_collateral
        };

        // Update locked liquidity
        let mut total_locked: i128 = e
            .storage()
            .instance()
            .get(&DataKey::TotalLockedLiquidity)
            .unwrap();
        total_locked -= loan.principal;
        e.storage()
            .instance()
            .set(&DataKey::TotalLockedLiquidity, &total_locked);

        // Mark user as no longer a borrower
        let vault_address: Address = e.storage().instance().get(&DataKey::VaultAddress).unwrap();
        let vault_client = VaultClient::new(&e, &vault_address);
        vault_client.mark_as_borrower(&borrower, &0, &0);
        vault_client.set_lp_liquidity_used(&borrower, &0);

        // Remove loan record
        e.storage().instance().remove(&DataKey::Loan(borrower.clone()));

        e.events()
            .publish((symbol_short!("liquidat"),), (borrower, total_debt));
    }

    // ========================================================================
    // View Functions
    // ========================================================================

    pub fn get_loan(e: Env, borrower: Address) -> Option<Loan> {
        e.storage().instance().get(&DataKey::Loan(borrower))
    }

    pub fn get_token_risk_profile(e: Env, rwa_token: Address) -> Option<TokenRiskProfile> {
        e.storage()
            .instance()
            .get(&DataKey::TokenRiskProfile(rwa_token))
    }

    pub fn get_total_liquidity(e: Env) -> i128 {
        e.storage()
            .instance()
            .get(&DataKey::TotalLiquidity)
            .unwrap_or(0)
    }

    pub fn get_available_liquidity(e: Env) -> i128 {
        let total: i128 = e
            .storage()
            .instance()
            .get(&DataKey::TotalLiquidity)
            .unwrap_or(0);
        let locked: i128 = e
            .storage()
            .instance()
            .get(&DataKey::TotalLockedLiquidity)
            .unwrap_or(0);
        total - locked
    }
}

// ============================================================================
// Access Control Implementation
// ============================================================================

#[default_impl]
#[contractimpl]
impl AccessControl for LendingPool {}
