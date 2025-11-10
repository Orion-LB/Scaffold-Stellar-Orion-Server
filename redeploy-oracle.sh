#!/bin/bash

# Redeploy Oracle Contract with Fixed set_price Function
set -e

DEPLOYER="GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D"
SOURCE_ACCOUNT="testnet-deployer"
NETWORK="testnet"
BOT_ADDRESS="GDHXKFGQP6M6FMZ4MGCY5O2CX62YQNQNXZAVHYLWXO6FSNBZNBPNGP7H"

echo "🔄 Redeploying Oracle Contract with Fixed Functions"
echo "Deployer: $DEPLOYER"
echo "Bot Address: $BOT_ADDRESS"
echo ""

# Build the contract first
echo "🔨 Building Oracle contract..."
stellar contract build --package mock-oracle
echo "✅ Build complete"
echo ""

# Deploy new Oracle contract
echo "📦 Deploying updated Oracle..."
NEW_ORACLE=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/mock_oracle.wasm \
  --source $SOURCE_ACCOUNT \
  --network $NETWORK \
  -- \
  --bot_address $BOT_ADDRESS \
  2>&1 | grep -E '^C[A-Z0-9]{55}$')

echo "✅ Oracle deployed: $NEW_ORACLE"
echo ""

# Verify functions are available
echo "🔍 Verifying contract functions..."
stellar contract inspect --id $NEW_ORACLE --network $NETWORK

echo ""
echo "✅ Oracle redeployment complete!"
echo ""
echo "📝 Update the following:"
echo "1. Update contracts/deployed-addresses.json:"
echo "   \"mock_oracle\": \"$NEW_ORACLE\""
echo ""
echo "2. Update bot .env files:"
echo "   ORACLE_CONTRACT_ID=$NEW_ORACLE"
echo ""
echo "3. Restart all bots"
