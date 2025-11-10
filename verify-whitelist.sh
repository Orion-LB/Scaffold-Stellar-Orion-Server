#!/bin/bash

# Verify Whitelist Status for User
set -e

USER_ADDRESS="GC4Z67Y6JUVZFNQMZ5RDMD55FSAAL4B4SEE5LRR27IBXB6ZIF77OWFER"
RWA_INVOICES="CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP"
VAULT_INVOICES="CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G"

echo "=================================================="
echo "Whitelist Verification"
echo "=================================================="
echo ""
echo "User Address: $USER_ADDRESS"
echo "Contract: Invoices RWA Token"
echo ""

# Check if user is whitelisted
echo "Checking whitelist status..."
ALLOWED=$(stellar contract invoke \
  --id "$RWA_INVOICES" \
  --source-account testnet-deployer \
  --network testnet \
  -- allowed \
  --account "$USER_ADDRESS")

echo "Whitelist Status: $ALLOWED"
echo ""

if [ "$ALLOWED" = "true" ]; then
    echo "✅ User is whitelisted and can now:"
    echo "   - Approve the vault to spend RWA tokens"
    echo "   - Transfer RWA tokens"
    echo "   - Stake RWA tokens in the vault"
    echo ""
    echo "Next steps for the user:"
    echo "1. Approve the vault to spend your RWA tokens:"
    echo "   Contract: $RWA_INVOICES"
    echo "   Spender: $VAULT_INVOICES"
    echo "   Amount: 10000000000000000000 (10 tokens)"
    echo ""
    echo "2. Stake your RWA tokens:"
    echo "   Call stake() on vault: $VAULT_INVOICES"
else
    echo "❌ User is NOT whitelisted"
    echo "   Cannot approve or transfer tokens"
fi

echo ""
echo "=================================================="
