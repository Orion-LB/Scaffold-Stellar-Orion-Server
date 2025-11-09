#!/bin/bash

# Orion RWA Lending - Testnet Deployment Script
# This script deploys all contracts to Stellar testnet

set -e

echo "🚀 Orion RWA Lending - Testnet Deployment"
echo "==========================================="
echo ""

# Configuration
NETWORK="testnet"
SOURCE_ACCOUNT="testnet-deployer"
DEPLOYER_ADDRESS=$(stellar keys address $SOURCE_ACCOUNT)

echo "📋 Configuration:"
echo "   Network: $NETWORK"
echo "   Deployer: $SOURCE_ACCOUNT"
echo "   Address: $DEPLOYER_ADDRESS"
echo ""

# Deploy contracts in dependency order
echo "📦 Step 1/6: Deploying USDC Mock Token..."
USDC_ID=$(stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/usdc_mock.wasm \
    --source $SOURCE_ACCOUNT \
    --network $NETWORK 2>&1 | grep -E '^C[A-Z0-9]{55}$' || echo "")

if [ -z "$USDC_ID" ]; then
    echo "❌ Failed to deploy USDC Mock"
    exit 1
fi

echo "✅ USDC Mock deployed: $USDC_ID"
echo ""

# Initialize USDC
echo "🔧 Initializing USDC Mock..."
stellar contract invoke \
    --id $USDC_ID \
    --source $SOURCE_ACCOUNT \
    --network $NETWORK \
    -- initialize \
    --admin $DEPLOYER_ADDRESS \
    --initial_supply 1000000000000000

echo "✅ USDC Mock initialized"
echo ""

echo "📦 Step 2/6: Deploying Mock RWA Token..."
RWA_TOKEN_ID=$(stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/mock_rwa_token.wasm \
    --source $SOURCE_ACCOUNT \
    --network $NETWORK 2>&1 | grep -E '^C[A-Z0-9]{55}$' || echo "")

if [ -z "$RWA_TOKEN_ID" ]; then
    echo "❌ Failed to deploy Mock RWA Token"
    exit 1
fi

echo "✅ Mock RWA Token deployed: $RWA_TOKEN_ID"
echo ""

# Initialize RWA Token
echo "🔧 Initializing Mock RWA Token..."
stellar contract invoke \
    --id $RWA_TOKEN_ID \
    --source $SOURCE_ACCOUNT \
    --network $NETWORK \
    -- initialize \
    --admin $DEPLOYER_ADDRESS \
    --manager $DEPLOYER_ADDRESS \
    --initial_supply 1000000000000000000

echo "✅ Mock RWA Token initialized"
echo ""

echo "📦 Step 3/6: Deploying stRWA Token..."
STRWA_TOKEN_ID=$(stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/strwa_token.wasm \
    --source $SOURCE_ACCOUNT \
    --network $NETWORK 2>&1 | grep -E '^C[A-Z0-9]{55}$' || echo "")

if [ -z "$STRWA_TOKEN_ID" ]; then
    echo "❌ Failed to deploy stRWA Token"
    exit 1
fi

echo "✅ stRWA Token deployed: $STRWA_TOKEN_ID"
echo ""

# Initialize stRWA Token
echo "🔧 Initializing stRWA Token..."
stellar contract invoke \
    --id $STRWA_TOKEN_ID \
    --source $SOURCE_ACCOUNT \
    --network $NETWORK \
    -- initialize \
    --admin $DEPLOYER_ADDRESS

echo "✅ stRWA Token initialized"
echo ""

echo "📦 Step 4/6: Deploying RWA Vault..."
VAULT_ID=$(stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/rwa_vault.wasm \
    --source $SOURCE_ACCOUNT \
    --network $NETWORK 2>&1 | grep -E '^C[A-Z0-9]{55}$' || echo "")

if [ -z "$VAULT_ID" ]; then
    echo "❌ Failed to deploy RWA Vault"
    exit 1
fi

echo "✅ RWA Vault deployed: $VAULT_ID"
echo ""

# Initialize Vault
echo "🔧 Initializing RWA Vault..."
stellar contract invoke \
    --id $VAULT_ID \
    --source $SOURCE_ACCOUNT \
    --network $NETWORK \
    -- initialize \
    --admin $DEPLOYER_ADDRESS \
    --rwa_token $RWA_TOKEN_ID \
    --strwa_token $STRWA_TOKEN_ID

echo "✅ RWA Vault initialized"
echo ""

echo "📦 Step 5/6: Deploying Mock Oracle..."
ORACLE_ID=$(stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/mock_oracle.wasm \
    --source $SOURCE_ACCOUNT \
    --network $NETWORK 2>&1 | grep -E '^C[A-Z0-9]{55}$' || echo "")

if [ -z "$ORACLE_ID" ]; then
    echo "❌ Failed to deploy Mock Oracle"
    exit 1
fi

echo "✅ Mock Oracle deployed: $ORACLE_ID"
echo ""

# Initialize Oracle
echo "🔧 Initializing Mock Oracle..."
stellar contract invoke \
    --id $ORACLE_ID \
    --source $SOURCE_ACCOUNT \
    --network $NETWORK \
    -- initialize \
    --bot_address $DEPLOYER_ADDRESS

echo "✅ Mock Oracle initialized"
echo ""

echo "📦 Step 6/6: Deploying Lending Pool..."
LENDING_POOL_ID=$(stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/lending_pool.wasm \
    --source $SOURCE_ACCOUNT \
    --network $NETWORK 2>&1 | grep -E '^C[A-Z0-9]{55}$' || echo "")

if [ -z "$LENDING_POOL_ID" ]; then
    echo "❌ Failed to deploy Lending Pool"
    exit 1
fi

echo "✅ Lending Pool deployed: $LENDING_POOL_ID"
echo ""

# Initialize Lending Pool
echo "🔧 Initializing Lending Pool..."
stellar contract invoke \
    --id $LENDING_POOL_ID \
    --source $SOURCE_ACCOUNT \
    --network $NETWORK \
    -- initialize \
    --admin $DEPLOYER_ADDRESS \
    --oracle $ORACLE_ID \
    --vault $VAULT_ID \
    --usdc $USDC_ID

echo "✅ Lending Pool initialized"
echo ""

# Create deployed-addresses.json
echo "📝 Creating deployed-addresses.json..."
cat > contracts/deployed-addresses.json <<EOF
{
  "network": "testnet",
  "contracts": {
    "rwa_vault": "$VAULT_ID",
    "lending_pool": "$LENDING_POOL_ID",
    "oracle": "$ORACLE_ID",
    "strwa_token": "$STRWA_TOKEN_ID",
    "usdc_token": "$USDC_ID",
    "mock_rwa_token": "$RWA_TOKEN_ID"
  },
  "rpc_url": "https://soroban-testnet.stellar.org",
  "network_passphrase": "Test SDF Network ; September 2015",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployed_by": "$DEPLOYER_ADDRESS"
}
EOF

echo "✅ Contract addresses saved to contracts/deployed-addresses.json"
echo ""

echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo "📋 Contract Addresses:"
echo "   USDC Mock:     $USDC_ID"
echo "   RWA Token:     $RWA_TOKEN_ID"
echo "   stRWA Token:   $STRWA_TOKEN_ID"
echo "   RWA Vault:     $VAULT_ID"
echo "   Mock Oracle:   $ORACLE_ID"
echo "   Lending Pool:  $LENDING_POOL_ID"
echo ""
echo "📄 Addresses saved to: contracts/deployed-addresses.json"
echo ""
echo "✅ All contracts deployed and initialized successfully!"
