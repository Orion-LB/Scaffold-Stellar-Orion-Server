# Frontend Staking Integration Guide

## User Staking Workflow

This guide shows how to integrate the staking functionality into your frontend application.

### Prerequisites Completed ✅

The following setup has been completed on the blockchain:

1. **User Whitelisted**: `GC4Z67Y6JUVZFNQMZ5RDMD55FSAAL4B4SEE5LRR27IBXB6ZIF77OWFER`
2. **Vault Whitelisted**: `CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G`
3. **RWA Tokens Minted**: 10 tokens (10000000000000000000 with 18 decimals)

### Contract Addresses

```typescript
const CONTRACTS = {
  RWA_INVOICES: "CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP",
  VAULT_INVOICES: "CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G",
  STRWA_INVOICES: "CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL",
};

const USER_ADDRESS = "GC4Z67Y6JUVZFNQMZ5RDMD55FSAAL4B4SEE5LRR27IBXB6ZIF77OWFER";
```

---

## Step-by-Step Integration

### Step 1: Approve Vault to Spend RWA Tokens

The user must first approve the vault to spend their RWA tokens.

**Contract Call Details:**

- **Contract ID**: `CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP` (RWA Invoices)
- **Function**: `approve`
- **Required Signature**: User's wallet

**TypeScript/React Example:**

```typescript
import { Contract, SorobanRpc, TransactionBuilder } from "@stellar/stellar-sdk";

async function approveVault(amount: string = "10000000000000000000") {
  try {
    // Get current ledger to calculate expiration
    const server = new SorobanRpc.Server("https://soroban-testnet.stellar.org");
    const ledger = await server.getLatestLedger();
    const expirationLedger = ledger.sequence + 100000; // ~5.7 days from now

    // Build the approve transaction
    const contract = new Contract(CONTRACTS.RWA_INVOICES);

    const tx = new TransactionBuilder(account, {
      fee: "100000",
      networkPassphrase: "Test SDF Network ; September 2015",
    })
      .addOperation(
        contract.call(
          "approve",
          ...[
            new Address(USER_ADDRESS).toScVal(), // from
            new Address(CONTRACTS.VAULT_INVOICES).toScVal(), // spender
            nativeToScVal(amount, { type: "i128" }), // amount
            nativeToScVal(expirationLedger, { type: "u32" }), // expiration_ledger
          ],
        ),
      )
      .setTimeout(300)
      .build();

    // Sign with user's wallet (Freighter)
    const signedTx = await window.freighterApi.signTransaction(tx.toXDR(), {
      networkPassphrase: "Test SDF Network ; September 2015",
    });

    // Submit transaction
    const txResponse = await server.sendTransaction(signedTx);

    // Wait for confirmation
    let status = await server.getTransaction(txResponse.hash);
    while (status.status === "PENDING" || status.status === "NOT_FOUND") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      status = await server.getTransaction(txResponse.hash);
    }

    if (status.status === "SUCCESS") {
      console.log("✅ Vault approved to spend RWA tokens");
      return true;
    } else {
      throw new Error(`Approval failed: ${status.status}`);
    }
  } catch (error) {
    console.error("Approval error:", error);
    throw error;
  }
}
```

**CLI Test (for verification):**

```bash
# Note: This requires the user's secret key, so it should only be done from the user's wallet
stellar contract invoke \
  --id CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP \
  --source-account <user-identity> \
  --network testnet \
  -- approve \
  --from GC4Z67Y6JUVZFNQMZ5RDMD55FSAAL4B4SEE5LRR27IBXB6ZIF77OWFER \
  --spender CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G \
  --amount 10000000000000000000 \
  --expiration_ledger 1000000
```

---

### Step 2: Stake RWA Tokens

After approval, the user can stake their RWA tokens in the vault.

**Contract Call Details:**

- **Contract ID**: `CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G` (Vault Invoices)
- **Function**: `stake`
- **Required Signature**: User's wallet

**TypeScript/React Example:**

```typescript
async function stakeTokens(amount: string = "1000000000000000000") {
  try {
    const server = new SorobanRpc.Server("https://soroban-testnet.stellar.org");

    // Build the stake transaction
    const contract = new Contract(CONTRACTS.VAULT_INVOICES);

    const tx = new TransactionBuilder(account, {
      fee: "100000",
      networkPassphrase: "Test SDF Network ; September 2015",
    })
      .addOperation(
        contract.call(
          "stake",
          ...[
            new Address(USER_ADDRESS).toScVal(), // user
            nativeToScVal(amount, { type: "i128" }), // amount
          ],
        ),
      )
      .setTimeout(300)
      .build();

    // Simulate first to check for errors
    const simulated = await server.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }

    // Prepare and sign transaction
    const prepared = SorobanRpc.assembleTransaction(tx, simulated);
    const signedTx = await window.freighterApi.signTransaction(
      prepared.toXDR(),
      { networkPassphrase: "Test SDF Network ; September 2015" },
    );

    // Submit transaction
    const txResponse = await server.sendTransaction(signedTx);

    // Wait for confirmation
    let status = await server.getTransaction(txResponse.hash);
    while (status.status === "PENDING" || status.status === "NOT_FOUND") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      status = await server.getTransaction(txResponse.hash);
    }

    if (status.status === "SUCCESS") {
      console.log("✅ Successfully staked RWA tokens");
      console.log("✅ User received stRWA tokens 1:1");
      return true;
    } else {
      throw new Error(`Staking failed: ${status.status}`);
    }
  } catch (error) {
    console.error("Staking error:", error);
    throw error;
  }
}
```

**CLI Test:**

```bash
stellar contract invoke \
  --id CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G \
  --source-account <user-identity> \
  --network testnet \
  -- stake \
  --user GC4Z67Y6JUVZFNQMZ5RDMD55FSAAL4B4SEE5LRR27IBXB6ZIF77OWFER \
  --amount 1000000000000000000
```

---

### Step 3: Verify Staking Success

After staking, verify the user received stRWA tokens.

**TypeScript/React Example:**

```typescript
async function checkStakedBalance() {
  try {
    const server = new SorobanRpc.Server("https://soroban-testnet.stellar.org");
    const contract = new Contract(CONTRACTS.STRWA_INVOICES);

    const tx = new TransactionBuilder(account, {
      fee: "100000",
      networkPassphrase: "Test SDF Network ; September 2015",
    })
      .addOperation(
        contract.call("balance", ...[new Address(USER_ADDRESS).toScVal()]),
      )
      .setTimeout(300)
      .build();

    const simulated = await server.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationSuccess(simulated)) {
      const balance = simulated.result?.retval;
      console.log("stRWA Balance:", balance);
      return balance;
    }
  } catch (error) {
    console.error("Balance check error:", error);
  }
}
```

---

## Complete React Component Example

```typescript
import React, { useState } from 'react';
import { Contract, SorobanRpc, TransactionBuilder, Address, nativeToScVal } from '@stellar/stellar-sdk';

const CONTRACTS = {
  RWA_INVOICES: "CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP",
  VAULT_INVOICES: "CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G",
  STRWA_INVOICES: "CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL"
};

export function StakingComponent() {
  const [amount, setAmount] = useState("1");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleStake = async () => {
    try {
      setIsLoading(true);
      setStatus("Step 1/2: Approving vault...");

      // Step 1: Approve
      const amountWithDecimals = (parseFloat(amount) * 1e18).toString();
      await approveVault(amountWithDecimals);

      setStatus("Step 2/2: Staking tokens...");

      // Step 2: Stake
      await stakeTokens(amountWithDecimals);

      setStatus("✅ Successfully staked! Check your stRWA balance.");

    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="staking-section">
      <h2>Stake Invoices RWA Tokens</h2>

      <div>
        <label>Amount to Stake:</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0.000000000000000001"
          step="0.1"
          disabled={isLoading}
        />
        <span>RWA tokens</span>
      </div>

      <button onClick={handleStake} disabled={isLoading}>
        {isLoading ? "Processing..." : "Stake Tokens"}
      </button>

      {status && <p className="status">{status}</p>}

      <div className="info">
        <p><strong>Exchange Rate:</strong> 1 RWA = 1 stRWA</p>
        <p><strong>Your RWA Balance:</strong> 10 tokens</p>
        <p><strong>Available to Stake:</strong> 10 tokens</p>
      </div>
    </div>
  );
}
```

---

## Troubleshooting

### Error: "Simulation failed: HostError: Error(WasmVm, InvalidAction)"

**Cause**: Vault not whitelisted on RWA token contract
**Solution**: ✅ Already fixed - vault has been whitelisted

### Error: "Contract error #102"

**Cause**: User not whitelisted on RWA token contract
**Solution**: ✅ Already fixed - user has been whitelisted

### Error: "Insufficient allowance"

**Cause**: User hasn't approved vault to spend tokens, or approval expired
**Solution**: Call the `approve` function again with a future expiration ledger

### Error: "Insufficient balance"

**Cause**: User doesn't have enough RWA tokens
**Solution**: ✅ Already fixed - 10 tokens minted to user

---

## Important Notes

1. **Token Decimals**: RWA and stRWA tokens use 18 decimals
   - 1 token = 1,000,000,000,000,000,000 (1e18)
   - Always multiply user input by 1e18 before sending to contract

2. **Approval Expiration**: The `expiration_ledger` parameter should be set to current ledger + 100000 (approximately 5.7 days)

3. **Transaction Fees**: Each transaction requires XLM for fees (~0.01 XLM)

4. **Wallet Signature**: Both approve and stake require the user's wallet signature (cannot be done by deployer)

5. **Atomic Operations**: If approve succeeds but stake fails, the approval is still valid and can be reused

---

## Summary

**Setup Complete** ✅

- User whitelisted
- Vault whitelisted
- 10 RWA tokens minted to user

**User Actions Required** 📝

1. Approve vault (requires wallet signature)
2. Stake tokens (requires wallet signature)

**Expected Result** 🎯

- RWA tokens transferred to vault
- stRWA tokens minted to user 1:1
- User can use stRWA as collateral for borrowing
