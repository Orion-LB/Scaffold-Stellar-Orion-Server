# **Orion Protocol — Application Plan**

---

<aside>
🎯

**Purpose**

Orion Protocol is a DeFi liquidity bridge for institutional‑grade tokenized Real‑World Assets (RWAs). It enables permissioned assets like tokenized T‑Bills, bonds, and real estate to interact with DeFi while respecting legal transfer restrictions and off‑chain yield distribution.

</aside>

### Problem Statement

- **Whitelist wall**: RWA tokens can only transfer between legally approved wallets, blocking permissionless DeFi.
- **Yield trap**: Off‑chain yields are paid to custodians and do not reach on‑chain holders.
- **Liquidity lock**: Institutions cannot access DeFi lending markets without selling yield‑bearing assets.

### Solution Overview

- **Layer 1 — Vault**: Converts permissioned RWA tokens into composable, yield‑bearing receipt tokens (stRWA) via a whitelisted custody vault.
- **Layer 2 — Lending Market**: Enables borrowing stablecoins against stRWA collateral with automated yield‑to‑debt routing (self‑liquidating credit lines).

<aside>
📌

**Hackathon fit**

- Market size: $10B+ tokenized RWAs currently illiquid
- Innovation: Makes permissioned assets DeFi‑native while remaining compliant
- Technical depth: Bridges TradFi compliance and DeFi composability
- Differentiator: Auto‑repay that routes asset yield to loans
</aside>

---

## Core Features

### Must‑Have for Demo

1. **Permissioned RWA token with whitelist enforcement**
    - What: MockRWA token with real transfer restrictions
    - Why: Demonstrates legal constraints and the baseline incompatibility
    - Demo value: Initial transfer/interaction attempts from non‑whitelisted wallets fail
2. **RWA Vault with stRWA receipt minting**
    - What: Custody contract accepts RWA and issues composable stRWA
    - Why: Transforms regulated assets into DeFi‑compatible tokens
    - Demo value: Visual transformation from locked RWA to liquid stRWA
3. **Yield capture and distribution**
    - What: Yield sent by institutions to the whitelisted vault becomes claimable by stakers
    
    <aside>
    💡
    
    Institutional yield flows directly to the approved Vault contract. No yield accrues to an "admin" externally. Evaluate automatic interest‑to‑debt routing options per user preference.
    
    </aside>
    
    - Why: Turns TradFi income into on‑chain cashflows
    - Demo value: Claimable amounts increase on‑screen
4. **LP funding via LP Portal(currently admin controlled)**
    - What: LPs deposit USDC in a dedicated LP portal and receive platform tokens as incentives
    - Why: Completes two‑sided market, sources borrow liquidity
    - Demo value: Establishes credible protocol economics
5. **Collateralized lending pool**
    - What: Deposit stRWA and borrow USDC up to 75% LTV
    - Why: Unlocks liquidity without selling collateral
    - Demo value: The “aha” moment where illiquid becomes liquid
6. **Oracle‑driven health and liquidation**
    - What: Adjustable price feed for underlying RWA that informs stRWA valuation
    
    <aside>
    💡
    
    Even if stRWA aims for 1:1 accounting, collateral risk must track underlying RWA price. Use an oracle on the underlying RWA NAV/price and derive stRWA value accordingly.
    
    </aside>
    
    - Why: Enables valuation, health, and liquidation scenarios
    - Demo value: Drives dynamic health bar and risk events
7. **Auto‑repay yield routing**
    - What: One‑time user opt‑in that automates routing of future claimable yield to reduce debt
    - Why: Signature differentiator — loans service themselves
    - Demo value: Debt and claimable yield drop together
8. **Liquidation automation (or admin fallback)**
    - What: Bot monitors health and triggers liquidation when below threshold. For demo, allow admin fallback.
    - Why: Demonstrates solvency controls and lifecycle completeness
    - Demo value: Clear end‑to‑end credit lifecycle
9. **Real‑time health factor visualization**
    - What: Dynamic bar with color coding and LTV slider
    - Why: Makes risk legible without math exposition
    - Demo value: Immediate visual feedback

### Contracts Requirements

### Must Implement (Core Demo Requirements)

1. **SEP-41 Tokens**
    - Use Soroban's built‑in token interface
    - Required for: MockRWA, stRWA, USDC interactions
2. **Whitelist Logic (Partner‑managed)**
    - Add transfer restrictions to MockRWA
    - Implement address whitelist storage controlled by partnered institutions or registry
    - Enforce checks on transfers and critical contract entrypoints
3. **Vault Pattern (ERC‑4626 Concepts)**
    - Implement deposit and withdraw functions
    - Implement share conversion math
    - Track total assets and total shares
4. **Simplified Yield Distribution**
    - Linear pool model (easier than index‑based)
    - Yield received by the Vault becomes claimable by share owners

### Should Implement (For Completeness)

1. **ERC-1404 Error Codes**
    - Return specific error codes instead of generic reverts
2. **ERC-4626 Preview Functions**
    - Let users see conversion before executing

### Could Skip (Time Constraints)

1. **Full ERC-3643 Compliance Module**
    - For hackathon, whitelist‑only is sufficient
2. **ERC-2612 Permit**
    - Gasless approvals can be post‑hackathon

---

## Final User Flow

## **1. Landing Page**

The landing page is simple and acts as the entry point. It introduces the project and provides a button:

- **Launch App**

When the user clicks **Launch App**, they enter the main application dashboard.

---

## **2. Dashboard Layout**

The dashboard has **two main sections**:

### **Sidebar**

Contains the navigation options:

- **Stake**
- **Borrow**
- **Profile**

### **Main Content Area**

Displays the content of whichever option the user selects.

---

# **3. Stake Section**

When the user clicks **Stake** in the sidebar, they will see a **static rectangular modal/card** similar to the Uniswap swap interface.

### **Modal Structure:**

1. **Vault Selection (Top Input)**
    - A dropdown showing all available vaults on the platform.
    - For example: *alexVault*, *ethVault*, etc.
2. **Deposit Amount Input (User Pays In RWA)**
    - User enters how many **alexRWA** tokens they want to stake.
    - There will also be a **“Get Mock RWA”** button  at right most corner of the stake main content container to allow new testers to mint free dummy mockRWA tokens.
3. **Receive Token Preview (Reward Token Output)**
    - Automatically shows how many **OrionalexRWA** tokens the user will receive.
    - This token represents the user’s staked position and accumulates yield.

### **Action**

- **Stake** button confirms the action.
- The user deposits their **alexRWA**, and receives **OrionalexRWA** in their wallet.

### **Yield**

- Holding **OrionalexRWA** earns yield over time.

### **Unstake**

The same modal offers **Unstake** option:

- Burning **OrionalexRWA**
- Returns the original **alexRWA** to the user
- Stops the yield process

---

# **4. Borrow Section**

When the user selects **Borrow**, a similar static rectangular card is shown.

### **Borrow Modal Structure:**

1. **Select Borrow Asset (Top Input)**
    - Dropdown to choose which token the user wants to borrow.
    - Initially: **USDC** or **XLM**
2. **Set Borrow Amount**
    - User enters how much they want to borrow.
3. **Collateral Selection (Bottom Section)**
    - Shows user’s available collateral tokens (their **OrionalexRWA** balance).
    - If the user has multiple collateral assets, they can choose:
        - one or multiple
        - and specify how many tokens from each to use as collateral.

---

# **5. Auto-Repay System (Borrow Page Feature)**

There will be a toggle switch in the borrow page that allows users to **enable or disable automated loan repayment using their yield**.

Modal will pop up here here for auto repay when the pop modal will come for that particular borrow happen this will just popups when borrow button is clicked 

---

# **6. Liquidation Notifications**

If the user’s **LTV (Loan-to-Value)** rises to risky levels:

- A liquidation bot will send **3 warning notifications**, each becoming more urgent.

This ensures users are aware before liquidation occurs.

---

# **7. Profile Section**

The Profile page provides a complete overview of the user’s activity and status in the protocol.

### **Profile Displays:**

- Wallet balances (alexRWA, OrionalexRWA, borrowed assets)
- Current yield earnings
- Active loans
- Collateral amounts and LTV risk meter
- Auto-repay status (On/Off)

here this will specific for the particular assets shown here user can perform this toggle here 
**When the toggle is turned ON:**

- A modal pops up explaining:
    - How yield will automatically repay loan interest and principal.
    - How repayment calculations occur.
- The user confirms → Wallet interaction → Auto-repay feature activates.

### **When the toggle is turned OFF:**

- A modal pops up showing:
    - Total yield earned
    - Amount already used to repay loan
    - Remaining loan amount
- After confirmation → Wallet interaction turns auto-repay off.
- Transaction history:
    - Stake / Unstake
    - Borrow / Repay
    - Yield changes

---

# **8. Admin Panel**

Initially accessible only to admin. Later can be permissioned or decentralized.

### **Admin Panel Capabilities:**

1. **Liquidity Pool Setup**
    - Admin currently manages initial liquidity pool funding
    - Later, external lenders can provide funds
2. **Vault Management**
    - Add new vaults
    - Update yield models or reward parameters
3. **Risk Controls**
    - Set liquidation thresholds
    - Configure warning levels for the bot
4. **Analytics Dashboard**
    - Shows global system metrics like:
        - Total Value Locked (TVL)
        - Total borrowed amount
        - Collateral health and utilization rates

---

## Page‑by‑Page Technical Breakdown

### 1) Landing (`/`)

- Purpose: Static marketing and navigation
- On‑chain write: None
- On‑chain read: None
- Frontend: Static content and routing

### 2) Connect Wallet (Modal)

- Purpose: Wallet connect and whitelist status
- On‑chain write: None
- On‑chain read: `WhitelistRegistry.isWhitelisted(user)` (through identity registry of partner)
- Frontend:
    - Integrate Freighter Wallet SDK
    - Direct read from `WhitelistRegistry`
    - Display states: Not Whitelisted → ✅ Whitelisted
    - Gate app sections based on status

### 3) Dashboard (`/dashboard`)

- Purpose: Read‑only portfolio and risk summary
- On‑chain write: None
- On‑chain read:
    - User balances: RWA, stRWA, USDC
    - Vault stats: total deposited, APY
    - Loan status: health factor, LTV, collateral and debt
    - Oracle price for valuation
- Frontend:
    - Aggregate reads and compute derived metrics: Net APY, Position Value, Health Factor gauge

### 4) Vault (`/app/vault`)

- Purpose: Stake RWA → mint stRWA, manage yield
- On‑chain write:
    - `MockRWA.approve()`
    - `RWA_Vault.stake()`
    - `RWA_Vault.claimYield()`
- On‑chain read:
    - `balanceOf()` for RWA and stRWA
    - `RWA_Vault.getClaimableYield(user)`
    - `WhitelistRegistry.isWhitelisted(user)` for gating
- Frontend:
    - Gate actions unless wallet is whitelisted
    - Two‑tx flow: Approve → Stake
    - Update balances and claimable yield on success

### 5) Lending (`/app/lending`)

- Purpose: Deposit stRWA collateral, borrow USDC, repay
- On‑chain write:
    - `LendingPool.depositCollateral()`
    - `LendingPool.borrow()`
    - `LendingPool.repay()`
    - `LendingPool.autoRepayFromYield()` (one‑time enable or toggle)
- On‑chain read:
    - `LendingPool.collateral[user]`
    - `LendingPool.borrowed[user]`
    - `LendingPool.usdcPoolBalance`
    - `Oracle.getUnderlyingPrice()` → derive stRWA value
    - `RWA_Vault.getClaimableYield(user)` for button state
- Frontend:
    - Health factor: `(Collateral * DerivedPrice) / Debt` with live updates
    - LTV slider synced with health
    - ⚡ Auto‑Repay states:
        - Disabled if `getClaimableYield(user) == 0` and not enabled for auto mode
        - Disabled if `borrowed[user] == 0`
        - Toggle or confirmation modal for exact USDC to apply

### 6) LP Portal (`/lp`) currently admin only

- Purpose: LPs deposit USDC and receive platform token incentives
- On‑chain write:
    - `LendingPool.lpDeposit(usdc)`
    - `LendingPool.lpWithdraw()`
- On‑chain read:
    - `LendingPool.totalLiquidity`
    - `LendingPool.utilization`
- Frontend:
    - Simple deposit/withdraw with rewards display

### 7) Admin Panel (`/admin`) — Demo‑only controls

- Purpose: Fallback controls for demo scenarios
- On‑chain write (onlyOwner):
    - `Oracle.setUnderlyingPrice()`
    - `LendingPool.adminTriggerLiquidation()`
- On‑chain read: Populate admin dashboard
- Frontend:
    - Gate by `connectedWallet == adminAddress`
    - Simple forms for each admin action

---

## Events to Emit

- Wallet/Access
    - `WalletConnected(address user)`
    - `WhitelistChecked(address user, bool isWhitelisted)`
- Vault
    - `Stake(address user, uint256 amountRWA, uint256 sharesMinted)`
    - `Unstake(address user, uint256 sharesBurned, uint256 amountRWA)`
    - `YieldAccrued(uint256 amount)`
    - `YieldClaimed(address user, uint256 amount)`
- Lending
    - `CollateralDeposited(address user, uint256 amountShares)`
    - `Borrowed(address user, uint256 amountUSDC)`
    - `Repaid(address user, uint256 amountUSDC)`
    - `AutoRepayEnabled(address user, bool enabled)`
    - `AutoRepaid(address user, uint256 yieldUsed, uint256 debtReduced)`
    - `LiquidationTriggered(address user, uint256 collateralSeized)`
- LP(admin only)
    - `LPDeposited(address lp, uint256 amountUSDC)`
    - `LPWithdrawn(address lp, uint256 amountUSDC)`

---

## Toast Notifications and UX States

Use deterministic, stepwise toasts with status coloring. All toasts auto‑dismiss in 4–6s, with a "View Tx" link when applicable.

- Connect Wallet
    - Success: "Wallet connected"
    - Info: "Checking whitelist…"
    - Error: "Wallet not whitelisted. Contact your partner institution to onboard."
- Vault
    - Approve
        - Pending: "Approval in progress…"
        - Success: "Token approved"
        - Error: "Approval failed"
    - Stake
        - Pending: "Staking…"
        - Success: "stRWA minted"
        - Error: "Stake failed"
    - Claim Yield
        - Pending: "Claiming yield…"
        - Success: "Yield claimed"
        - Error: "Claim failed"
- Lending
    - Deposit Collateral
        - Pending: "Depositing collateral…"
        - Success: "Collateral deposited"
        - Error: "Deposit failed"
    - Borrow
        - Pending: "Borrowing…"
        - Success: "USDC borrowed"
        - Error: "Borrow failed"
    - Repay
        - Pending: "Repaying…"
        - Success: "Loan repaid"
        - Error: "Repay failed"
    - Auto‑Repay
        - Toggle On: "Auto‑repay enabled"
        - Toggle Off: "Auto‑repay disabled"
        - Apply Now: "Applying yield to debt…" → "Debt reduced"
- LP Portal(admin only currently for demo)
    - Deposit: "LP deposit successful"
    - Withdraw: "LP withdrawal successful"
- Liquidations
    - Warning Banner: "Health at risk. Add collateral or repay."
    - Liquidated: "Position liquidated"

---

## Interfaces and Contracts Summary

This section wires each Soroban contract function and keeper job to the current UI pages, reads/writes, events, and state updates.

### Contracts and Functions

- MockRWA_A (Token)
    - Storage: whitelist: Map<Address, bool>
    - Functions:
        - admin_add_whitelist(addr)
        - transfer(from, to, amount) with require(whitelist[from] && whitelist[to])
        - transfer_from(spender, from, to, amount) with same require
    - Frontend usage:
        - Connect modal: read WhitelistRegistry.isWhitelisted(user) before enabling any actions
        - Vault page: approve + stake flow; failed transfers from non‑whitelisted show gated error toast
    - Events to surface:
        - WhitelistUpdated(addr, isWhitelisted)
- stRWA_A (Token)/ this side whitlisitng should be done
    - Mint/Burn restricted to RWA_Vault_A
    - Functions: mint(to, amount) onlyVault, burn(from, amount) onlyVault
    - Frontend usage:
        - Vault: post‑stake balance updates for stRWA
        - Lending: balanceOf for deposit capacity and health factor
- RWA_Vault_A (Vault)
    - Functions:
        - stake(user, amountRWA)
        - unstake(user, amountShares)
        - admin_fund_yield(amountUSDC)
        - claimable_yield(user) = total_yield_pool * user_balance / total_shares
        - pull_yield_for_repay(user, amount) onlyLendingPool
    - Frontend wiring:
        - /app/vault writes: stake, unstake, claimYield
        - /app/vault reads: claimable_yield, total_shares, balances
        - /app/lending reads: claimable_yield for auto‑repay state
    - Events:
        - Stake(user, amountRWA, sharesMinted)
        - Unstake(user, sharesBurned, amountRWA)
        - YieldFunded(amount)
        - YieldClaimed(user, amount)
- MockOracle (Price Feed)
    - Storage: prices: Map<Address, i128>
    - Functions:
        - submit_price(asset, price) onlyBot
        - get_price(asset) view
    - Frontend wiring:
        - Dashboard + Lending: poll or subscribe to get_price(MockRWA_A) → derive stRWA valuation
    - Events:
        - PriceUpdated(asset, price)
- LendingPool (Engine)
    - Storage per user: collateral, borrow_balance, interest_owed, last_interest_update_time; global: interest_rate, liquidity
    - Internal: _update_interest(user)
    - Admin: admin_fund_lending_pool(amountUSDC)
    - User:
        - supply_collateral(user, amountShares)
        - withdraw_collateral(user, amountShares)
        - borrow(user, amountUSDC)
        - repay(user, amountUSDC)
    - Automation:
        - trigger_auto_repay(user)
        - trigger_liquidation(user) requires get_health_factor(user) < 1.0
    - View helpers:
        - get_health_factor(user)
        - get_borrowers() or paginated iterator for keeper
    - Frontend wiring:
        - /app/lending writes: depositCollateral→supply_collateral, borrow, repay
        - /lp writes (admin for demo): admin_fund_lending_pool
        - /app/lending reads: collateral[user], borrow_balance[user], interest_owed[user], get_health_factor(user), pool liquidity
    - Events:
        - CollateralDeposited(user, amountShares)
        - CollateralWithdrawn(user, amountShares)
        - Borrowed(user, amountUSDC)
        - Repaid(user, amountUSDC)
        - AutoRepaid(user, yieldUsed, debtReduced)
        - LiquidationTriggered(user, collateralSeized)

### UI Page Bindings

- Connect Wallet
    - Read: WhitelistRegistry.isWhitelisted(user)
    - Toasts: Wallet connected, Checking whitelist…, Not whitelisted
- Dashboard
    - Read: balances (RWA, stRWA, USDC), Vault totals, Oracle price, Lending health
    - Derived: Position Value, Net APY, Health Factor
- Vault (/app/vault)
    - Write: MockRWA.approve → RWA_Vault_A.stake
    - Read: claimable_yield(user), balances
    - Toasts and Events: Stake, YieldClaimed
- Lending (/app/lending)
    - Write: supply_collateral, borrow, repay
    - Read: get_health_factor(user), claimable_yield(user), pool balances
    - Toggle: Auto‑repay (keeper‑driven via trigger_auto_repay)
- LP Portal (admin for demo)
    - Write: admin_fund_lending_pool
    - Read: totalLiquidity, utilization
- Admin (/admin)
    - Write: MockOracle.submit_price (fallback),  bot trigger_liquidation (fallback)

### Keeper Bots (Off‑Chain)

- Job 1: Oracle Bot
    - Every 60s: new_price = 100 + rand() → submit_price(MockRWA_A, new_price)
    - Triggers UI: PriceUpdated → health factor re‑compute
- Job 2: Auto‑Repay Bot
    - On YieldFunded or every 5m fallback:
        - borrowers = LendingPool.get_borrowers()
        - for each b: trigger_auto_repay(b)
    - UI effect: Debt ticks down, AutoRepaid events captured in activity feed
- Job 3: Liquidation Bot
    - Every 15s:
        - borrowers = get_borrowers()
        - if get_health_factor(b) < 1.0 → trigger_liquidation(b)
    - UI effect: Position Liquidated overlay, balances refresh

### Health Factor and Pricing

- Health = (collateral_shares * derived_price_per_share) / (borrow_balance + interest_owed)
- derived_price_per_share = Oracle.get_price(MockRWA_A) * vault_exchange_rate
- Update cadence: on any PriceUpdated, deposit/borrow/repay, and keeper actions

### Minimal TypeScript SDK Shapes (frontend integration)

```tsx
export interface VaultApi {
	stake(amountRwa: string): Promise<TxHash>
	unstake(amountShares: string): Promise<TxHash>
	claimableYield(user: string): Promise<string>
	claimYield(): Promise<TxHash>
}
export interface LendingApi {
	supplyCollateral(amountShares: string): Promise<TxHash>
	withdrawCollateral(amountShares: string): Promise<TxHash>
	borrow(amountUsdc: string): Promise<TxHash>
	repay(amountUsdc: string): Promise<TxHash>
	getHealthFactor(user: string): Promise<string>
	getBorrowers(): Promise<string[]>
}
export interface OracleApi { getPrice(asset: string): Promise<string> }
```

### Event → Toast Mapping

- YieldFunded → Info banner on Lending page: "New yield available"
- AutoRepaid → Success: "Debt reduced by X USDC"
- LiquidationTriggered → Error: "Position liquidated"

---

### Implementation Notes for Soroban

- Ensure all user‑facing functions call _update_interest(user) first in LendingPool
- Mark pull_yield_for_repay as onlyLendingPool; use an allowlist of caller contract ID
- Emit events listed above for observability and frontend state machines
- Use Freighter for transaction signing; batch reads with simulated RPC where possible

| Component | Key Methods | Notes |
| --- | --- | --- |
| WhitelistRegistry | `isWhitelisted(address)` | Single source of truth for access. Set by partner institutions. |
| MockRWA | `transfer`, `approve`, `balanceOf` | Whitelist‑enforced transfers |
| RWA_Vault | `stake`, `unstake`, `getClaimableYield`, `claimYield` | Issues stRWA receipts. Receives institutional yield. |
| LendingPool | `depositCollateral`, `borrow`, `repay`, `autoRepayFromYield`, `lpDeposit`, `lpWithdraw`, `adminTriggerLiquidation` | Enforces LTV; integrates yield routing; LP portal |
| Oracle | `setUnderlyingPrice`, `getUnderlyingPrice` | Prices the underlying RWA; stRWA value derived in frontend/contracts |

---

## Non‑Functional Requirements

- **Security**: Gate critical user actions by `WhitelistRegistry`. Admin actions `onlyOwner`.
- **Observability**: Emit comprehensive events; index in UI activity feed.
- **UX**: Deterministic demo with explicit success and failure states. Clear gating when not whitelisted.
- **Performance**: Minimize RPC calls by batching reads and caching where safe.
- **Compliance**: Respect whitelist constraints end‑to‑end.

---

## Demo Flow

- [ ]  Landing → Launch App
- [ ]  Connect wallet → Whitelist check
    - [ ]  If not whitelisted → show guidance and lock app sections
    - [ ]  If whitelisted → proceed
- [ ]  Vault: Approve → Stake → stRWA minted
- [ ]  LP Portal (currently admin only): LP deposit USDC

- [ ]  Lending: Deposit collateral → Borrow → Health bar green
- [ ]  ⚡ Auto‑Repay (enable once) → ongoing yield auto‑applied to debt
- [ ]  bot triggers price change according to real asst simulated price→ Health bar red
- [ ]  bot: Trigger liquidation → Position liquidated → Dashboard updated

---

## Current Flow — Research Highlights

### 1) T+2 Settlement Gap

- Risk: Liquidations are instant; RWA redemptions settle in ~2–3 days.
- Impact: Lenders need immediate USDC while collateral cash arrives later.
- Market practice: Maple (delegate‑staked insurance), OpenEden (5–10% USDC buffer), Ondo (credit line).
- Our path: Demo simulates instant payout. Mainnet adds an Insurance Fund that fronts payouts and refills on redemption.

### 2) Pricing and Oracle Integrity

- Risk: stRWA is a receipt; underlying price can move.
- Impact: Mispricing inflates LTV and creates insolvency risk.
- Market practice: Aave uses Chainlink; OpenEden uses attestations; BUIDL publishes on‑chain prices.
- Our path: Demo uses a mock oracle to drive scenarios. Mainnet integrates a third‑party oracle without admin override.

### 3) Compliance Guardrails

- Risk: stRWA reaching non‑approved addresses.
- Impact: Regulatory exposure and secondary leakage.
- Our path: Apply whitelist‑enforced transfers and contract gates aligned to ERC‑3643 principles.

### 4) Tax Exposure

- Risk: Each conversion step may be a taxable event.
- Impact: Heavy user burden and uncertainty.
- Our path: Acknowledge out of scope for demo. Mainnet to include formal legal and tax opinions and optimized flow design.

### 5) Yield Gap (Business Model)

- Risk: RWA yields ~5% while competing credit markets advertise 10–20%.
- Impact: Hard to attract USDC lenders purely on rate.
- Our path: Demo focuses on auto‑repay from yield. Mainnet explores incentives, tranching, duration, and credit enhancement.

UI Inspirations :-

Landing pages →
1) https://pulsefy.framer.website
2) https://spark-template.framer.website
3) https://orion8.framer.website (created one)

ok so the final conslusion m getting 

assumption s: token is fully complaint , and here our dapp vaults are fully