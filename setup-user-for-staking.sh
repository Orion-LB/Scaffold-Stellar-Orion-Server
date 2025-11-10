#!/bin/bash

# Setup User for Staking - Complete Workflow
set -e

USER_ADDRESS="GC4Z67Y6JUVZFNQMZ5RDMD55FSAAL4B4SEE5LRR27IBXB6ZIF77OWFER"
RWA_INVOICES="CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP"
VAULT_INVOICES="CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G"
DEPLOYER="GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D"
MINT_AMOUNT="10000000000000000000"  # 10 tokens with 18 decimals

echo "=================================================="
echo "Setting Up User for Staking - Invoices RWA"
echo "=================================================="
echo ""
echo "User: $USER_ADDRESS"
echo "RWA Token: $RWA_INVOICES"
echo "Vault: $VAULT_INVOICES"
echo ""

# Step 1: Verify user is whitelisted
echo "[1/5] Checking if user is whitelisted..."
USER_ALLOWED=$(stellar contract invoke \
  --id "$RWA_INVOICES" \
  --source-account testnet-deployer \
  --network testnet \
  -- allowed \
  --account "$USER_ADDRESS" 2>&1 | grep -E "true|false")

if [ "$USER_ALLOWED" = "true" ]; then
    echo "   ✅ User is whitelisted"
else
    echo "   ❌ User not whitelisted - whitelisting now..."
    stellar contract invoke \
      --id "$RWA_INVOICES" \
      --source-account testnet-deployer \
      --network testnet \
      -- allow_user \
      --user "$USER_ADDRESS" \
      --operator "$DEPLOYER"
    echo "   ✅ User whitelisted"
fi
echo ""

# Step 2: Verify vault is whitelisted
echo "[2/5] Checking if vault is whitelisted..."
VAULT_ALLOWED=$(stellar contract invoke \
  --id "$RWA_INVOICES" \
  --source-account testnet-deployer \
  --network testnet \
  -- allowed \
  --account "$VAULT_INVOICES" 2>&1 | grep -E "true|false")

if [ "$VAULT_ALLOWED" = "true" ]; then
    echo "   ✅ Vault is whitelisted"
else
    echo "   ❌ Vault not whitelisted - whitelisting now..."
    stellar contract invoke \
      --id "$RWA_INVOICES" \
      --source-account testnet-deployer \
      --network testnet \
      -- allow_user \
      --user "$VAULT_INVOICES" \
      --operator "$DEPLOYER"
    echo "   ✅ Vault whitelisted"
fi
echo ""

# Step 3: Mint RWA tokens to user (if they don't have any)
echo "[3/5] Minting RWA tokens to user..."
stellar contract invoke \
  --id "$RWA_INVOICES" \
  --source-account testnet-deployer \
  --network testnet \
  -- mint_rwa_tokens \
  --user "$USER_ADDRESS" \
  --amount "$MINT_AMOUNT"
echo "   ✅ Minted 10 RWA tokens to user"
echo ""

# Step 4: User needs to approve the vault (this must be done from user's wallet in frontend)
echo "[4/5] Approval Status:"
echo "   ⚠️  User must approve vault from their wallet"
echo "   ⚠️  This cannot be done from deployer account"
echo ""
echo "   Frontend should call:"
echo "   Contract: $RWA_INVOICES"
echo "   Function: approve"
echo "   Args:"
echo "     --from $USER_ADDRESS"
echo "     --spender $VAULT_INVOICES"
echo "     --amount $MINT_AMOUNT"
echo "     --expiration_ledger <current_ledger + 100000>"
echo ""

# Step 5: Summary
echo "[5/5] Setup Summary"
echo "=================================================="
echo ""
echo "✅ User whitelisted: $USER_ADDRESS"
echo "✅ Vault whitelisted: $VAULT_INVOICES"
echo "✅ RWA tokens minted: 10 tokens"
echo ""
echo "📝 Next Steps for User (from frontend):"
echo ""
echo "1. APPROVE: User must approve vault to spend RWA tokens"
echo "   - This requires user's signature"
echo "   - Amount: 10000000000000000000 (10 tokens)"
echo ""
echo "2. STAKE: User can then stake RWA tokens"
echo "   - This will transfer RWA tokens to vault"
echo "   - User will receive stRWA tokens in return"
echo ""
echo "=================================================="
