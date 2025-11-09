#!/bin/bash
set -e

# Contract Initialization Script
# Usage: ./scripts/initialize.sh [testnet|futurenet|mainnet]

NETWORK=${1:-testnet}
IDENTITY="admin"

echo "🔧 Initializing contracts on $NETWORK..."

# Load contract addresses
ADDRESSES_FILE=".soroban/contract-addresses-$NETWORK.json"

if [ ! -f "$ADDRESSES_FILE" ]; then
    echo "❌ Contract addresses file not found: $ADDRESSES_FILE"
    echo "   Run deployment first: ./scripts/deploy.sh $NETWORK"
    exit 1
fi

# Extract contract addresses using grep and sed
USDC_ID=$(grep '"usdc"' $ADDRESSES_FILE | sed 's/.*: "\(.*\)".*/\1/')
RWA_ID=$(grep '"rwaToken"' $ADDRESSES_FILE | sed 's/.*: "\(.*\)".*/\1/')
STRWA_ID=$(grep '"stRwaToken"' $ADDRESSES_FILE | sed 's/.*: "\(.*\)".*/\1/')
VAULT_ID=$(grep '"vault"' $ADDRESSES_FILE | sed 's/.*: "\(.*\)".*/\1/')
ORACLE_ID=$(grep '"oracle"' $ADDRESSES_FILE | sed 's/.*: "\(.*\)".*/\1/')
LENDING_POOL_ID=$(grep '"lendingPool"' $ADDRESSES_FILE | sed 's/.*: "\(.*\)".*/\1/')

# Get admin address
ADMIN=$(stellar keys address $IDENTITY)

echo "📍 Using admin address: $ADMIN"
echo ""

# Initialize stRWA Token
echo "1/7 Initializing stRWA Token..."
stellar contract invoke \
  --id $STRWA_ID \
  --source $IDENTITY \
  --network $NETWORK \
  -- initialize \
  --admin $ADMIN
echo "   ✅ stRWA initialized"

# Set vault address in stRWA
echo "2/7 Setting vault address in stRWA..."
stellar contract invoke \
  --id $STRWA_ID \
  --source $IDENTITY \
  --network $NETWORK \
  -- set_vault_address \
  --vault $VAULT_ID
echo "   ✅ Vault address set in stRWA"

# Initialize Vault
echo "3/7 Initializing Vault..."
stellar contract invoke \
  --id $VAULT_ID \
  --source $IDENTITY \
  --network $NETWORK \
  -- initialize \
  --admin $ADMIN \
  --rwa_token_address $RWA_ID \
  --strwa_token_address $STRWA_ID
echo "   ✅ Vault initialized"

# Set USDC address in Vault
echo "4/7 Setting USDC address in Vault..."
stellar contract invoke \
  --id $VAULT_ID \
  --source $IDENTITY \
  --network $NETWORK \
  -- set_usdc_address \
  --usdc_address $USDC_ID
echo "   ✅ USDC address set in Vault"

# Set lending pool in Vault
echo "5/7 Setting lending pool in Vault..."
stellar contract invoke \
  --id $VAULT_ID \
  --source $IDENTITY \
  --network $NETWORK \
  -- set_lending_pool \
  --pool_address $LENDING_POOL_ID
echo "   ✅ Lending pool set in Vault"

# Initialize Oracle
echo "6/7 Initializing Oracle..."
stellar contract invoke \
  --id $ORACLE_ID \
  --source $IDENTITY \
  --network $NETWORK \
  -- initialize \
  --admin $ADMIN
echo "   ✅ Oracle initialized"

# Set initial price for stRWA in Oracle
echo "   Setting initial stRWA price (1 USDC)..."
stellar contract invoke \
  --id $ORACLE_ID \
  --source $IDENTITY \
  --network $NETWORK \
  -- set_price \
  --asset $STRWA_ID \
  --price 1000000 \
  --bot $ADMIN
echo "   ✅ Initial price set"

# Initialize Lending Pool
echo "7/7 Initializing Lending Pool..."
stellar contract invoke \
  --id $LENDING_POOL_ID \
  --source $IDENTITY \
  --network $NETWORK \
  -- initialize \
  --admin $ADMIN \
  --vault_address $VAULT_ID \
  --oracle_address $ORACLE_ID \
  --usdc_address $USDC_ID \
  --strwa_address $STRWA_ID \
  --rwa_address $RWA_ID
echo "   ✅ Lending Pool initialized"

# Set liquidation bot
echo "   Setting liquidation bot..."
stellar contract invoke \
  --id $LENDING_POOL_ID \
  --source $IDENTITY \
  --network $NETWORK \
  -- set_liquidation_bot \
  --caller $ADMIN \
  --bot_address $ADMIN
echo "   ✅ Liquidation bot set"

# Set token risk profile (5% APR = low risk, 7% interest rate)
echo "   Setting token risk profile (5% APR)..."
stellar contract invoke \
  --id $LENDING_POOL_ID \
  --source $IDENTITY \
  --network $NETWORK \
  -- update_token_risk_profile \
  --caller $ADMIN \
  --rwa_token_address $RWA_ID \
  --token_yield_apr 500 \
  --token_expiry 31536000
echo "   ✅ Risk profile set (7% interest, 10% LP share)"

# Whitelist vault in RWA token
echo "   Whitelisting vault in RWA token..."
stellar contract invoke \
  --id $RWA_ID \
  --source $IDENTITY \
  --network $NETWORK \
  -- allow_user \
  --user $VAULT_ID \
  --operator $ADMIN
echo "   ✅ Vault whitelisted"

echo ""
echo "✅ All contracts initialized successfully!"
echo ""
echo "📊 System Status:"
echo "   stRWA Token:   Initialized ✓"
echo "   Vault:         Initialized ✓"
echo "   Oracle:        Initialized ✓ (stRWA = 1 USDC)"
echo "   Lending Pool:  Initialized ✓"
echo "   Interest Rate: 7% APR (low risk token)"
echo "   LP Share:      10% of interest"
echo ""
echo "🎉 Your DeFi protocol is ready to use!"
echo ""
echo "📝 Next steps:"
echo "   1. Update your frontend config with contract addresses from:"
echo "      $ADDRESSES_FILE"
echo "   2. Test the integration using the example in FRONTEND_INTEGRATION.md"
echo "   3. Fund test accounts and start testing transactions"
