# Contract API Reference

**Network**: Stellar Testnet
**Last Updated**: 2025-11-10
**RPC URL**: https://soroban-testnet.stellar.org

---

## Table of Contents

1. [Core Infrastructure Contracts](#core-infrastructure-contracts)
   - [Mock Oracle](#1-mock-oracle)
   - [Lending Pool](#2-lending-pool)
   - [USDC Mock](#3-usdc-mock)
2. [RWA Token Contracts](#rwa-token-contracts)
   - [Invoices RWA](#4-invoices-rwa-token)
   - [TBills RWA](#5-tbills-rwa-token)
   - [Real Estate RWA](#6-real-estate-rwa-token)
3. [stRWA Token Contracts](#strwa-token-contracts)
   - [Invoices stRWA](#7-invoices-strwa-token)
   - [TBills stRWA](#8-tbills-strwa-token)
   - [Real Estate stRWA](#9-real-estate-strwa-token)
4. [Vault Contracts](#vault-contracts)
   - [Invoices Vault](#10-invoices-vault)
   - [TBills Vault](#11-tbills-vault)
   - [Real Estate Vault](#12-real-estate-vault)

---

## Core Infrastructure Contracts

### 1. Mock Oracle

**Contract Address**: `CDQ3C3T477QZFH6KQMQEA4HTIVIHOMN5YKDWHBDQT4EBO4MNXI5ZXKVX`

**Purpose**: Provides price feeds for stRWA tokens used by the lending pool for collateral valuation.

#### Functions

##### `__constructor`

Initialize the oracle contract with authorized bot address.

**Arguments**:

- `bot: Address` - Address authorized to submit price updates

**Returns**: `void`

**Example**:

```bash
stellar contract invoke \
  --id CDQ3C3T477QZFH6KQMQEA4HTIVIHOMN5YKDWHBDQT4EBO4MNXI5ZXKVX \
  --source-account testnet-deployer \
  --network testnet \
  -- __constructor \
    --bot GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D
```

---

##### `get_price`

Get the current price for a specific asset (read-only).

**Arguments**:

- `asset: Address` - stRWA token contract address

**Returns**: `i128` - Price in 6 decimals (e.g., 1050000 = $1.05), returns 0 if no price set

**Example**:

```bash
stellar contract invoke \
  --id CDQ3C3T477QZFH6KQMQEA4HTIVIHOMN5YKDWHBDQT4EBO4MNXI5ZXKVX \
  --source-account testnet-deployer \
  --network testnet \
  -- get_price \
    --asset CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL
```

**Output**: `"1050000"` (represents $1.05)

---

##### `get_price_data`

Get price and timestamp for a specific asset (read-only).

**Arguments**:

- `asset: Address` - stRWA token contract address

**Returns**: `(i128, u64)` - Tuple of (price, timestamp), returns (0, 0) if no price set

**Example**:

```bash
stellar contract invoke \
  --id CDQ3C3T477QZFH6KQMQEA4HTIVIHOMN5YKDWHBDQT4EBO4MNXI5ZXKVX \
  --source-account testnet-deployer \
  --network testnet \
  -- get_price_data \
    --asset CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL
```

**Output**: `["1050000", "1699632000"]`

---

##### `set_price`

Set a new price for an asset (bot-only, requires authorization).

**Arguments**:

- `asset_address: Address` - stRWA token contract address
- `price: i128` - New price in 6 decimals
- `timestamp: u64` - Unix timestamp (use 0 for current ledger time)
- `source: Address` - Bot address (must match authorized bot)

**Returns**: `void`

**Events Emitted**:

- `price_upd` - Contains asset address and new price

**Example**:

```bash
stellar contract invoke \
  --id CDQ3C3T477QZFH6KQMQEA4HTIVIHOMN5YKDWHBDQT4EBO4MNXI5ZXKVX \
  --source-account testnet-deployer \
  --network testnet \
  -- set_price \
    --asset_address CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL \
    --price 1050000 \
    --timestamp 0 \
    --source GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D
```

---

##### `submit_price`

Submit a new price for an asset (bot-only, alternative to set_price).

**Arguments**:

- `bot: Address` - Bot address (requires authentication)
- `asset: Address` - stRWA token contract address
- `price: i128` - New price in 6 decimals

**Returns**: `void`

**Events Emitted**:

- `price_upd` - Contains asset address and new price

---

### 2. Lending Pool

**Contract Address**: `CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ`

**Purpose**: Multi-collateral lending pool allowing users to borrow USDC against stRWA tokens.

#### Functions

##### `initialize`

Initialize the lending pool with configuration parameters.

**Arguments**:

- `admin: Address` - Admin address
- `usdc_token: Address` - USDC token contract address
- `oracle: Address` - Oracle contract address
- `collateralization_ratio: u32` - Minimum ratio (e.g., 140 = 140%)
- `liquidation_threshold: u32` - Threshold for liquidation (e.g., 110 = 110%)

**Returns**: `void`

**Example**:

```bash
stellar contract invoke \
  --id CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ \
  --source-account testnet-deployer \
  --network testnet \
  -- initialize \
    --admin GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --usdc_token CAXHQJ6IHN2TPAJ4NEOXJJLRRAO74BEAWA3RXHD6NSOWRBQCTVZA3ZGS \
    --oracle CDQ3C3T477QZFH6KQMQEA4HTIVIHOMN5YKDWHBDQT4EBO4MNXI5ZXKVX \
    --collateralization_ratio 140 \
    --liquidation_threshold 110
```

---

##### `originate_loan`

Create a new loan with multi-collateral support.

**Arguments**:

- `borrower: Address` - Borrower's address
- `collaterals: Vec<(Address, i128)>` - Vector of (stRWA token address, amount) tuples
- `loan_amount: i128` - USDC amount to borrow (6 decimals)
- `duration_months: u32` - Loan duration in months

**Returns**: `u64` - Loan ID

**Events Emitted**:

- `loan_originated` - Contains borrower, loan amount, and collateral details

**Example**:

```bash
stellar contract invoke \
  --id CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ \
  --source-account testnet-deployer \
  --network testnet \
  -- originate_loan \
    --borrower GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --collaterals '[["CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL", "1000000000000000000"]]' \
    --loan_amount 100000000 \
    --duration_months 12
```

**Output**: `"1"` (loan ID)

---

##### `repay_loan`

Repay part or all of a loan.

**Arguments**:

- `borrower: Address` - Borrower's address
- `loan_id: u64` - Loan ID to repay
- `amount: i128` - USDC amount to repay (6 decimals)

**Returns**: `void`

**Events Emitted**:

- `loan_repaid` - Contains borrower, loan ID, and repayment amount

**Example**:

```bash
stellar contract invoke \
  --id CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ \
  --source-account testnet-deployer \
  --network testnet \
  -- repay_loan \
    --borrower GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --loan_id 1 \
    --amount 50000000
```

---

##### `get_loan`

Get loan details by loan ID (read-only).

**Arguments**:

- `borrower: Address` - Borrower's address
- `loan_id: u64` - Loan ID

**Returns**: Loan struct containing:

- `borrower: Address`
- `collaterals: Vec<(Address, i128)>`
- `loan_amount: i128`
- `outstanding_amount: i128`
- `interest_rate: u32`
- `origination_date: u64`
- `duration_months: u32`
- `status: u32` (0 = Active, 1 = Repaid, 2 = Liquidated)

**Example**:

```bash
stellar contract invoke \
  --id CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ \
  --source-account testnet-deployer \
  --network testnet \
  -- get_loan \
    --borrower GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --loan_id 1
```

---

##### `get_health_factor`

Calculate the health factor for a loan (read-only).

**Arguments**:

- `borrower: Address` - Borrower's address
- `loan_id: u64` - Loan ID

**Returns**: `u32` - Health factor percentage (e.g., 150 = 150%)

**Example**:

```bash
stellar contract invoke \
  --id CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ \
  --source-account testnet-deployer \
  --network testnet \
  -- get_health_factor \
    --borrower GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --loan_id 1
```

**Output**: `"150"` (represents 150% collateralization)

---

##### `get_all_borrowers`

Get list of all borrowers (read-only).

**Arguments**: None

**Returns**: `Vec<Address>` - Vector of borrower addresses

**Example**:

```bash
stellar contract invoke \
  --id CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ \
  --source-account testnet-deployer \
  --network testnet \
  -- get_all_borrowers
```

---

##### `liquidate_loan`

Liquidate an undercollateralized loan (anyone can call).

**Arguments**:

- `borrower: Address` - Borrower's address
- `loan_id: u64` - Loan ID to liquidate
- `liquidator: Address` - Liquidator's address

**Returns**: `void`

**Events Emitted**:

- `loan_liquidated` - Contains borrower, loan ID, and liquidation details

**Example**:

```bash
stellar contract invoke \
  --id CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ \
  --source-account testnet-deployer \
  --network testnet \
  -- liquidate_loan \
    --borrower GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --loan_id 1 \
    --liquidator GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D
```

---

### 3. USDC Mock

**Contract Address**: `CAXHQJ6IHN2TPAJ4NEOXJJLRRAO74BEAWA3RXHD6NSOWRBQCTVZA3ZGS`

**Purpose**: Mock USDC token for testing purposes (follows Stellar Asset Contract standard).

#### Functions

##### `balance`

Get balance for an address (read-only).

**Arguments**:

- `id: Address` - Account address

**Returns**: `i128` - Balance in 6 decimals (1 USDC = 1,000,000)

**Example**:

```bash
stellar contract invoke \
  --id CAXHQJ6IHN2TPAJ4NEOXJJLRRAO74BEAWA3RXHD6NSOWRBQCTVZA3ZGS \
  --source-account testnet-deployer \
  --network testnet \
  -- balance \
    --id GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D
```

**Output**: `"1000000000"` (represents 1,000 USDC)

---

##### `mint`

Mint USDC tokens (admin-only).

**Arguments**:

- `to: Address` - Recipient address
- `amount: i128` - Amount to mint (6 decimals)

**Returns**: `void`

**Events Emitted**:

- `mint` - Contains recipient and amount

**Example**:

```bash
stellar contract invoke \
  --id CAXHQJ6IHN2TPAJ4NEOXJJLRRAO74BEAWA3RXHD6NSOWRBQCTVZA3ZGS \
  --source-account testnet-deployer \
  --network testnet \
  -- mint \
    --to GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --amount 1000000000
```

---

##### `transfer`

Transfer USDC tokens.

**Arguments**:

- `from: Address` - Sender address
- `to: Address` - Recipient address
- `amount: i128` - Amount to transfer (6 decimals)

**Returns**: `void`

**Events Emitted**:

- `transfer` - Contains from, to, and amount

**Example**:

```bash
stellar contract invoke \
  --id CAXHQJ6IHN2TPAJ4NEOXJJLRRAO74BEAWA3RXHD6NSOWRBQCTVZA3ZGS \
  --source-account testnet-deployer \
  --network testnet \
  -- transfer \
    --from GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --to GBXXX... \
    --amount 100000000
```

---

##### `approve`

Approve spender to transfer tokens on behalf of owner.

**Arguments**:

- `from: Address` - Token owner address
- `spender: Address` - Spender address
- `amount: i128` - Amount to approve (6 decimals)
- `expiration_ledger: u32` - Approval expiration ledger

**Returns**: `void`

**Example**:

```bash
stellar contract invoke \
  --id CAXHQJ6IHN2TPAJ4NEOXJJLRRAO74BEAWA3RXHD6NSOWRBQCTVZA3ZGS \
  --source-account testnet-deployer \
  --network testnet \
  -- approve \
    --from GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --spender CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ \
    --amount 1000000000 \
    --expiration_ledger 1000000
```

---

## RWA Token Contracts

All three RWA token contracts share the same interface with different addresses:

### 4. Invoices RWA Token

**Contract Address**: `CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP`

**Purpose**: Tokenized invoice assets with whitelist enforcement.

### 5. TBills RWA Token

**Contract Address**: `CD3ZKDA3VG4PQAPXCPJV6VZJ65ACA2N7ISPUF4FN73ITMCNHKCEGMZAW`

**Purpose**: Tokenized treasury bill assets with whitelist enforcement.

### 6. Real Estate RWA Token

**Contract Address**: `CCSCN4NNINMSENMRRFYHW7M6D3NBMK33NE3BA5XCCT26CSCJT5ZKYF46`

**Purpose**: Tokenized real estate assets with whitelist enforcement.

#### Shared RWA Token Functions

##### `initialize`

Initialize the RWA token contract.

**Arguments**:

- `admin: Address` - Admin address
- `name: String` - Token name
- `symbol: String` - Token symbol
- `decimals: u32` - Token decimals (18)

**Returns**: `void`

**Example**:

```bash
stellar contract invoke \
  --id CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP \
  --source-account testnet-deployer \
  --network testnet \
  -- initialize \
    --admin GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --name "Invoices RWA" \
    --symbol "RWAI" \
    --decimals 18
```

---

##### `mint_rwa_tokens`

Mint RWA tokens to a whitelisted user (admin-only).

**Arguments**:

- `user: Address` - Recipient address (must be whitelisted)
- `amount: i128` - Amount to mint (18 decimals)

**Returns**: `void`

**Events Emitted**:

- `mint` - Contains recipient and amount
- `rwa_mint` - Contains amount

**Example**:

```bash
stellar contract invoke \
  --id CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP \
  --source-account testnet-deployer \
  --network testnet \
  -- mint_rwa_tokens \
    --user GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --amount 10000000000000000000
```

**Output**: Success with events emitted

---

##### `balance`

Get RWA token balance (read-only).

**Arguments**:

- `id: Address` - Account address

**Returns**: `i128` - Balance in 18 decimals (1 token = 1,000,000,000,000,000,000)

**Example**:

```bash
stellar contract invoke \
  --id CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP \
  --source-account testnet-deployer \
  --network testnet \
  -- balance \
    --id GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D
```

**Output**: `"10000000000000000000"` (represents 10 tokens)

---

##### `transfer`

Transfer RWA tokens (both parties must be whitelisted).

**Arguments**:

- `from: Address` - Sender address
- `to: Address` - Recipient address (must be whitelisted)
- `amount: i128` - Amount to transfer (18 decimals)

**Returns**: `void`

**Events Emitted**:

- `transfer` - Contains from, to, and amount

**Example**:

```bash
stellar contract invoke \
  --id CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP \
  --source-account testnet-deployer \
  --network testnet \
  -- transfer \
    --from GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --to CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G \
    --amount 5000000000000000000
```

---

##### `allow_user`

Add user to whitelist (admin-only).

**Arguments**:

- `user: Address` - User address to whitelist

**Returns**: `void`

**Events Emitted**:

- `user_allowed` - Contains user address

**Example**:

```bash
stellar contract invoke \
  --id CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP \
  --source-account testnet-deployer \
  --network testnet \
  -- allow_user \
    --user GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D
```

---

##### `is_allowed`

Check if user is whitelisted (read-only).

**Arguments**:

- `user: Address` - User address to check

**Returns**: `bool` - true if whitelisted, false otherwise

**Example**:

```bash
stellar contract invoke \
  --id CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP \
  --source-account testnet-deployer \
  --network testnet \
  -- is_allowed \
    --user GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D
```

**Output**: `true`

---

## stRWA Token Contracts

All three stRWA token contracts share the same interface (Stellar Asset Contract standard):

### 7. Invoices stRWA Token

**Contract Address**: `CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL`

**Purpose**: Receipt token for staked Invoices RWA tokens (1:1 ratio).

### 8. TBills stRWA Token

**Contract Address**: `CDGL6V3VT6HAIWNDQLYTLWFXF4O7L3TNWYD3OUEE4JNCLX3EXHH2HSEA`

**Purpose**: Receipt token for staked TBills RWA tokens (1:1 ratio).

### 9. Real Estate stRWA Token

**Contract Address**: `CD5WDVFPWBLERKA3RYQT6L7V5J5NLHL3HP64WYJUVZMNUQLAGPLEYOZR`

**Purpose**: Receipt token for staked Real Estate RWA tokens (1:1 ratio).

#### Shared stRWA Token Functions

##### `balance`

Get stRWA token balance (read-only).

**Arguments**:

- `id: Address` - Account address

**Returns**: `i128` - Balance in 18 decimals

**Example**:

```bash
stellar contract invoke \
  --id CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL \
  --source-account testnet-deployer \
  --network testnet \
  -- balance \
    --id GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D
```

**Output**: `"5000000000000000000"` (represents 5 tokens)

---

##### `transfer`

Transfer stRWA tokens (freely transferable).

**Arguments**:

- `from: Address` - Sender address
- `to: Address` - Recipient address
- `amount: i128` - Amount to transfer (18 decimals)

**Returns**: `void`

**Events Emitted**:

- `transfer` - Contains from, to, and amount

**Example**:

```bash
stellar contract invoke \
  --id CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL \
  --source-account testnet-deployer \
  --network testnet \
  -- transfer \
    --from GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --to CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ \
    --amount 1000000000000000000
```

---

##### `approve`

Approve spender to transfer tokens on behalf of owner.

**Arguments**:

- `from: Address` - Token owner address
- `spender: Address` - Spender address
- `amount: i128` - Amount to approve (18 decimals)
- `expiration_ledger: u32` - Approval expiration ledger

**Returns**: `void`

**Example**:

```bash
stellar contract invoke \
  --id CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL \
  --source-account testnet-deployer \
  --network testnet \
  -- approve \
    --from GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --spender CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ \
    --amount 10000000000000000000 \
    --expiration_ledger 1000000
```

---

## Vault Contracts

All three vault contracts share the same interface:

### 10. Invoices Vault

**Contract Address**: `CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G`

**Purpose**: Staking vault for Invoices RWA tokens, mints stRWA Invoices 1:1.

**Linked Tokens**:

- RWA Token: `CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP`
- stRWA Token: `CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL`

### 11. TBills Vault

**Contract Address**: `CAFQWK3D3QLMGSW2OL6HE3VTCLCKZKPWNTCTKBM5MFLKKZWIKTA6Z7DP`

**Purpose**: Staking vault for TBills RWA tokens, mints stRWA TBills 1:1.

**Linked Tokens**:

- RWA Token: `CD3ZKDA3VG4PQAPXCPJV6VZJ65ACA2N7ISPUF4FN73ITMCNHKCEGMZAW`
- stRWA Token: `CDGL6V3VT6HAIWNDQLYTLWFXF4O7L3TNWYD3OUEE4JNCLX3EXHH2HSEA`

### 12. Real Estate Vault

**Contract Address**: `CAGUJJGFK7N5WC4CEYS3CS6QH7RIAWBPZIMB6ELVHGBJ5KBA3R3WMWLI`

**Purpose**: Staking vault for Real Estate RWA tokens, mints stRWA Real Estate 1:1.

**Linked Tokens**:

- RWA Token: `CCSCN4NNINMSENMRRFYHW7M6D3NBMK33NE3BA5XCCT26CSCJT5ZKYF46`
- stRWA Token: `CD5WDVFPWBLERKA3RYQT6L7V5J5NLHL3HP64WYJUVZMNUQLAGPLEYOZR`

#### Shared Vault Functions

##### `initialize`

Initialize the vault contract.

**Arguments**:

- `admin: Address` - Admin address
- `rwa_token: Address` - RWA token contract address
- `strwa_token: Address` - stRWA receipt token contract address

**Returns**: `void`

**Example**:

```bash
stellar contract invoke \
  --id CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G \
  --source-account testnet-deployer \
  --network testnet \
  -- initialize \
    --admin GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --rwa_token CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP \
    --strwa_token CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL
```

---

##### `stake`

Stake RWA tokens and receive stRWA tokens 1:1.

**Arguments**:

- `user: Address` - User address
- `amount: i128` - Amount to stake (18 decimals)

**Returns**: `void`

**Events Emitted**:

- `staked` - Contains user and amount

**Example**:

```bash
stellar contract invoke \
  --id CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G \
  --source-account testnet-deployer \
  --network testnet \
  -- stake \
    --user GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --amount 5000000000000000000
```

---

##### `unstake`

Unstake RWA tokens by burning stRWA tokens.

**Arguments**:

- `user: Address` - User address
- `amount: i128` - Amount to unstake (18 decimals)

**Returns**: `void`

**Events Emitted**:

- `unstaked` - Contains user and amount

**Example**:

```bash
stellar contract invoke \
  --id CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G \
  --source-account testnet-deployer \
  --network testnet \
  -- unstake \
    --user GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --amount 2000000000000000000
```

---

##### `fund_yield_pool`

Fund the yield pool for auto-repayment (admin-only).

**Arguments**:

- `amount: i128` - USDC amount to fund (6 decimals)

**Returns**: `void`

**Events Emitted**:

- `yield_funded` - Contains amount

**Example**:

```bash
stellar contract invoke \
  --id CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G \
  --source-account testnet-deployer \
  --network testnet \
  -- fund_yield_pool \
    --amount 1000000000
```

---

##### `get_user_balance`

Get user's staked balance (read-only).

**Arguments**:

- `user: Address` - User address

**Returns**: `i128` - Staked balance in 18 decimals

**Example**:

```bash
stellar contract invoke \
  --id CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G \
  --source-account testnet-deployer \
  --network testnet \
  -- get_user_balance \
    --user GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D
```

**Output**: `"5000000000000000000"` (represents 5 tokens staked)

---

##### `get_total_deposits`

Get total amount deposited in vault (read-only).

**Arguments**: None

**Returns**: `i128` - Total deposits in 18 decimals

**Example**:

```bash
stellar contract invoke \
  --id CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G \
  --source-account testnet-deployer \
  --network testnet \
  -- get_total_deposits
```

**Output**: `"50000000000000000000"` (represents 50 tokens total)

---

##### `get_yield_balance`

Get available yield balance for a user (read-only).

**Arguments**:

- `user: Address` - User address

**Returns**: `i128` - Yield balance in 6 decimals (USDC)

**Example**:

```bash
stellar contract invoke \
  --id CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G \
  --source-account testnet-deployer \
  --network testnet \
  -- get_yield_balance \
    --user GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D
```

**Output**: `"100000000"` (represents 100 USDC yield available)

---

##### `claim_yield`

Claim accumulated yield (user callable).

**Arguments**:

- `user: Address` - User address
- `amount: i128` - Amount to claim (6 decimals, USDC)

**Returns**: `void`

**Events Emitted**:

- `yield_claimed` - Contains user and amount

**Example**:

```bash
stellar contract invoke \
  --id CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G \
  --source-account testnet-deployer \
  --network testnet \
  -- claim_yield \
    --user GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --amount 50000000
```

---

## Token Decimals Reference

| Token Type   | Decimals | Example Amount       | Human Readable |
| ------------ | -------- | -------------------- | -------------- |
| USDC         | 6        | 1000000              | 1 USDC         |
| USDC         | 6        | 100000000            | 100 USDC       |
| RWA Tokens   | 18       | 1000000000000000000  | 1 Token        |
| RWA Tokens   | 18       | 10000000000000000000 | 10 Tokens      |
| stRWA Tokens | 18       | 1000000000000000000  | 1 Token        |
| stRWA Tokens | 18       | 5000000000000000000  | 5 Tokens       |
| Oracle Price | 6        | 1050000              | $1.05          |
| Oracle Price | 6        | 1000000              | $1.00          |

---

## Common Integration Patterns

### Pattern 1: Mint and Stake RWA Tokens

```bash
# Step 1: Whitelist user
stellar contract invoke \
  --id CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP \
  --source-account testnet-deployer \
  --network testnet \
  -- allow_user \
    --user GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D

# Step 2: Mint RWA tokens
stellar contract invoke \
  --id CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP \
  --source-account testnet-deployer \
  --network testnet \
  -- mint_rwa_tokens \
    --user GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --amount 10000000000000000000

# Step 3: Approve vault to spend RWA tokens
stellar contract invoke \
  --id CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP \
  --source-account testnet-deployer \
  --network testnet \
  -- approve \
    --from GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --spender CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G \
    --amount 10000000000000000000 \
    --expiration_ledger 1000000

# Step 4: Stake in vault
stellar contract invoke \
  --id CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G \
  --source-account testnet-deployer \
  --network testnet \
  -- stake \
    --user GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --amount 10000000000000000000
```

### Pattern 2: Borrow Against stRWA Collateral

```bash
# Step 1: Set Oracle price for stRWA token
stellar contract invoke \
  --id CDQ3C3T477QZFH6KQMQEA4HTIVIHOMN5YKDWHBDQT4EBO4MNXI5ZXKVX \
  --source-account testnet-deployer \
  --network testnet \
  -- set_price \
    --asset_address CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL \
    --price 1000000 \
    --timestamp 0 \
    --source GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D

# Step 2: Approve lending pool to spend stRWA tokens
stellar contract invoke \
  --id CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL \
  --source-account testnet-deployer \
  --network testnet \
  -- approve \
    --from GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --spender CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ \
    --amount 10000000000000000000 \
    --expiration_ledger 1000000

# Step 3: Originate loan
stellar contract invoke \
  --id CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ \
  --source-account testnet-deployer \
  --network testnet \
  -- originate_loan \
    --borrower GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --collaterals '[["CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL", "10000000000000000000"]]' \
    --loan_amount 7000000000 \
    --duration_months 12
```

### Pattern 3: Monitor and Repay Loan

```bash
# Step 1: Check loan health factor
stellar contract invoke \
  --id CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ \
  --source-account testnet-deployer \
  --network testnet \
  -- get_health_factor \
    --borrower GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --loan_id 1

# Step 2: Approve lending pool to spend USDC
stellar contract invoke \
  --id CAXHQJ6IHN2TPAJ4NEOXJJLRRAO74BEAWA3RXHD6NSOWRBQCTVZA3ZGS \
  --source-account testnet-deployer \
  --network testnet \
  -- approve \
    --from GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --spender CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ \
    --amount 1000000000 \
    --expiration_ledger 1000000

# Step 3: Repay loan
stellar contract invoke \
  --id CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ \
  --source-account testnet-deployer \
  --network testnet \
  -- repay_loan \
    --borrower GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D \
    --loan_id 1 \
    --amount 1000000000
```

---

## Error Handling

Common error messages you may encounter:

| Error Message            | Cause                                     | Solution                                 |
| ------------------------ | ----------------------------------------- | ---------------------------------------- |
| "Unauthorized"           | Caller not authorized for function        | Use correct admin/bot account            |
| "User not whitelisted"   | Attempting RWA transfer without whitelist | Call `allow_user` first                  |
| "Insufficient balance"   | Not enough tokens for operation           | Check balance with `balance` function    |
| "Insufficient allowance" | Spender not approved                      | Call `approve` function first            |
| "Health factor too low"  | Loan undercollateralized                  | Add more collateral or repay loan        |
| "Price not found"        | Oracle has no price for asset             | Set price with `set_price` function      |
| "Bad union switch: 4"    | TypeScript SDK encoding issue             | Use Stellar CLI instead (contract works) |

---

## Frontend Integration Tips

### TypeScript/JavaScript Example

```typescript
import * as StellarSdk from "@stellar/stellar-sdk";

// Initialize SDK
const server = new StellarSdk.SorobanRpc.Server(
  "https://soroban-testnet.stellar.org",
);
const networkPassphrase = "Test SDF Network ; September 2015";

// Contract addresses
const ORACLE_ADDRESS =
  "CDQ3C3T477QZFH6KQMQEA4HTIVIHOMN5YKDWHBDQT4EBO4MNXI5ZXKVX";
const LENDING_POOL_ADDRESS =
  "CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ";

// Get price from Oracle
async function getPrice(assetAddress: string) {
  const contract = new StellarSdk.Contract(ORACLE_ADDRESS);

  const result = await server.getContractData(
    contract.address(),
    StellarSdk.xdr.ScVal.scvVec([
      StellarSdk.xdr.ScVal.scvSymbol("get_price"),
      new StellarSdk.Address(assetAddress).toScVal(),
    ]),
  );

  return result.val;
}

// Get loan details
async function getLoan(borrower: string, loanId: number) {
  const contract = new StellarSdk.Contract(LENDING_POOL_ADDRESS);

  // Build and submit transaction
  // ... (see Stellar SDK docs for full implementation)
}
```

### React Example

```tsx
import { useMemo } from "react";
import * as StellarSdk from "@stellar/stellar-sdk";

export function useOrion() {
  const contracts = useMemo(
    () => ({
      oracle: "CDQ3C3T477QZFH6KQMQEA4HTIVIHOMN5YKDWHBDQT4EBO4MNXI5ZXKVX",
      lendingPool: "CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ",
      usdc: "CAXHQJ6IHN2TPAJ4NEOXJJLRRAO74BEAWA3RXHD6NSOWRBQCTVZA3ZGS",
      rwaInvoices: "CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP",
      strwaInvoices: "CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL",
      vaultInvoices: "CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G",
    }),
    [],
  );

  return { contracts };
}
```

---

**End of Contract API Reference**

For questions or issues, please refer to:

- [README.md](README.md) - Project overview
- [MULTI_ASSET_VERIFICATION.md](MULTI_ASSET_VERIFICATION.md) - Deployment verification
- [ORACLE_FIX_COMPLETE.md](ORACLE_FIX_COMPLETE.md) - Oracle contract details
