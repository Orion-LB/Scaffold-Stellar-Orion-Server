# 🚀 Deployment & Frontend Integration Quickstart

This guide will get your Stellar RWA Lending Protocol deployed and integrated with your frontend in minutes.

## Prerequisites Checklist

- [ ] Rust and Cargo installed
- [ ] Stellar CLI installed: `cargo install --locked soroban-cli --features opt`
- [ ] Node.js and npm/yarn installed
- [ ] Freighter wallet or similar Stellar wallet

## Step 1: Setup Stellar Identity (2 minutes)

```bash
# Generate new identity
stellar keys generate admin --network testnet

# Fund your testnet account (free testnet XLM)
stellar keys fund admin --network testnet

# Verify balance
stellar keys address admin
```

## Step 2: Deploy Contracts (5 minutes)

```bash
# Make scripts executable (first time only)
chmod +x scripts/*.sh

# Deploy all contracts to testnet
./scripts/deploy.sh testnet

# Initialize all contracts
./scripts/initialize.sh testnet
```

**That's it!** Your contracts are now deployed and ready to use.

Contract addresses will be saved in: `.soroban/contract-addresses-testnet.json`

## Step 3: Frontend Integration (10 minutes)

### Option A: Use the TypeScript SDK (Recommended)

1. **Install SDK**
   ```bash
   cd frontend-sdk
   npm install
   npm run build

   # In your frontend project
   npm install ../path/to/frontend-sdk
   ```

2. **Use in your app**
   ```typescript
   import StellarLendingSDK from '@your-org/stellar-lending-sdk';

   // Load contract addresses from deployment
   import addresses from '../.soroban/contract-addresses-testnet.json';

   const sdk = new StellarLendingSDK('testnet', addresses.contracts);

   // LP deposits USDC
   await sdk.lpDeposit(userAddress, amount, signFunction);

   // Borrow USDC
   await sdk.originateLoan(userAddress, collateral, loanAmount, 12, signFunction);
   ```

   See [frontend-sdk/README.md](frontend-sdk/README.md) for full API docs.

### Option B: Direct Integration

Follow the comprehensive guide in [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md)

## Step 4: Test Your Integration (5 minutes)

### Test Sequence

```typescript
// 1. Get testnet tokens (admin already funded)
const adminAddr = await stellar keys address admin;

// 2. Whitelist user in RWA token
stellar contract invoke --id $RWA_ID --source admin --network testnet \
  -- allow_user --user YOUR_USER_ADDRESS --operator $ADMIN

// 3. Test LP deposit
await sdk.lpDeposit(userAddress, BigInt(100_000000), signFn);

// 4. Test staking
await sdk.stake(userAddress, BigInt(10_000000000000000000), signFn);

// 5. Test borrowing
await sdk.originateLoan(
  userAddress,
  BigInt(200_000000000000000000), // 200 stRWA collateral
  BigInt(100_000000),              // 100 USDC loan
  12,                              // 12 months
  signFn
);

// 6. Check loan
const loan = await sdk.getLoan(userAddress);
console.log('Your loan:', loan);
```

## Quick Reference

### Contract Addresses
After deployment, find in `.soroban/contract-addresses-testnet.json`:
```json
{
  "contracts": {
    "usdc": "CAAAA...",
    "rwaToken": "CBBBB...",
    "stRwaToken": "CCCCC...",
    "vault": "CDDDD...",
    "oracle": "CEEEE...",
    "lendingPool": "CFFFF..."
  }
}
```

### Key Amounts & Decimals
```typescript
// USDC (6 decimals)
const usdc_100 = BigInt(100_000000);

// RWA/stRWA (18 decimals)
const rwa_100 = BigInt(100_000000000000000000);
```

### Interest Rates (Auto-Calculated)
- **High Risk Token** (yield < 5%): 14% APR, 20% to LPs
- **Low Risk Token** (yield ≥ 5%): 7% APR, 10% to LPs

### Collateral Requirements
- **Loan-to-Value**: 140% (need $140 collateral for $100 loan)
- **Warning**: 110% ratio or 2 weeks no payment
- **Liquidation**: 110% ratio

## Wallet Integration Examples

### Freighter Wallet
```typescript
async function signWithFreighter(tx) {
  const signedTxXDR = await window.freighter.signTransaction(
    tx.toXDR(),
    { network: 'testnet' }
  );
  return StellarSdk.TransactionBuilder.fromXDR(
    signedTxXDR,
    'Test SDF Network ; September 2015'
  );
}
```

### Albedo Wallet
```typescript
import albedo from '@albedo-link/intent';

async function signWithAlbedo(tx) {
  const result = await albedo.tx({
    xdr: tx.toXDR(),
    network: 'testnet',
  });
  return StellarSdk.TransactionBuilder.fromXDR(
    result.signed_envelope_xdr,
    'Test SDF Network ; September 2015'
  );
}
```

## Common Issues & Solutions

### ❌ "Insufficient balance"
**Solution**: Fund testnet account: `stellar keys fund admin --network testnet`

### ❌ "Transaction simulation failed"
**Solution**:
1. Check contract is initialized: `./scripts/initialize.sh testnet`
2. Verify token approvals before transfers
3. Check collateral ratio for loans (need 140%)

### ❌ "User not whitelisted" (RWA token)
**Solution**: Whitelist user address:
```bash
stellar contract invoke --id $RWA_ID --source admin --network testnet \
  -- allow_user --user $USER_ADDRESS --operator $ADMIN
```

### ❌ "One loan per user"
**Solution**: Repay existing loan before taking new one

## Production Deployment

When ready for mainnet:

```bash
# Deploy to mainnet
./scripts/deploy.sh mainnet

# Initialize on mainnet
./scripts/initialize.sh mainnet

# Update frontend config to use mainnet addresses
```

**Important**: Test thoroughly on testnet first!

## Resources

- 📖 [Full Integration Guide](FRONTEND_INTEGRATION.md)
- 📦 [TypeScript SDK Docs](frontend-sdk/README.md)
- 🧪 [Contract Tests](contracts/lending-pool/src/test.rs)
- 🌐 [Stellar Docs](https://developers.stellar.org/)
- 🔗 [Soroban Docs](https://soroban.stellar.org/)

## Support

For issues or questions:
1. Check [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md) for detailed docs
2. Review contract tests for usage examples
3. Check Stellar Discord/Forum for Soroban help

## Next Steps

1. ✅ Deploy contracts (done!)
2. ✅ Initialize contracts (done!)
3. 🔨 Build your frontend UI
4. 🧪 Test thoroughly on testnet
5. 🚀 Deploy to mainnet

Happy building! 🎉
