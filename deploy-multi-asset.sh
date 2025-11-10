#!/bin/bash

# Multi-Asset Deployment Script
set -e

DEPLOYER="GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D"
SOURCE_ACCOUNT="testnet-deployer"
NETWORK="testnet"

echo "🚀 Starting Multi-Asset Deployment"
echo "Deployer: $DEPLOYER"
echo ""

# Deploy RWA Tokens
echo "📦 Deploying RWA Tokens..."

echo "  → RWA Invoices..."
RWA_INVOICES=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/mock_rwa_token.wasm \
  --source $SOURCE_ACCOUNT \
  --network $NETWORK \
  -- \
  --admin $DEPLOYER \
  --manager $DEPLOYER \
  --initial_supply 1000000000000000000 \
  2>&1 | grep -E '^C[A-Z0-9]{55}$')
echo "    ✅ $RWA_INVOICES"

echo "  → RWA TBills..."
RWA_TBILLS=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/mock_rwa_token.wasm \
  --source $SOURCE_ACCOUNT \
  --network $NETWORK \
  -- \
  --admin $DEPLOYER \
  --manager $DEPLOYER \
  --initial_supply 1000000000000000000 \
  2>&1 | grep -E '^C[A-Z0-9]{55}$')
echo "    ✅ $RWA_TBILLS"

echo "  → RWA Real Estate..."
RWA_REALESTATE=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/mock_rwa_token.wasm \
  --source $SOURCE_ACCOUNT \
  --network $NETWORK \
  -- \
  --admin $DEPLOYER \
  --manager $DEPLOYER \
  --initial_supply 1000000000000000000 \
  2>&1 | grep -E '^C[A-Z0-9]{55}$')
echo "    ✅ $RWA_REALESTATE"

# Deploy stRWA Tokens
echo ""
echo "📦 Deploying stRWA Tokens..."

echo "  → stRWA Invoices..."
STRWA_INVOICES=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/strwa_token.wasm \
  --source $SOURCE_ACCOUNT \
  --network $NETWORK \
  -- \
  --admin $DEPLOYER \
  2>&1 | grep -E '^C[A-Z0-9]{55}$')
echo "    ✅ $STRWA_INVOICES"

echo "  → stRWA TBills..."
STRWA_TBILLS=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/strwa_token.wasm \
  --source $SOURCE_ACCOUNT \
  --network $NETWORK \
  -- \
  --admin $DEPLOYER \
  2>&1 | grep -E '^C[A-Z0-9]{55}$')
echo "    ✅ $STRWA_TBILLS"

echo "  → stRWA Real Estate..."
STRWA_REALESTATE=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/strwa_token.wasm \
  --source $SOURCE_ACCOUNT \
  --network $NETWORK \
  -- \
  --admin $DEPLOYER \
  2>&1 | grep -E '^C[A-Z0-9]{55}$')
echo "    ✅ $STRWA_REALESTATE"

# Deploy Vaults
echo ""
echo "📦 Deploying Vaults..."

echo "  → Vault Invoices..."
VAULT_INVOICES=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/rwa_vault.wasm \
  --source $SOURCE_ACCOUNT \
  --network $NETWORK \
  -- \
  --admin $DEPLOYER \
  --rwa_token $RWA_INVOICES \
  --strwa_token $STRWA_INVOICES \
  2>&1 | grep -E '^C[A-Z0-9]{55}$')
echo "    ✅ $VAULT_INVOICES"

echo "  → Vault TBills..."
VAULT_TBILLS=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/rwa_vault.wasm \
  --source $SOURCE_ACCOUNT \
  --network $NETWORK \
  -- \
  --admin $DEPLOYER \
  --rwa_token $RWA_TBILLS \
  --strwa_token $STRWA_TBILLS \
  2>&1 | grep -E '^C[A-Z0-9]{55}$')
echo "    ✅ $VAULT_TBILLS"

echo "  → Vault Real Estate..."
VAULT_REALESTATE=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/rwa_vault.wasm \
  --source $SOURCE_ACCOUNT \
  --network $NETWORK \
  -- \
  --admin $DEPLOYER \
  --rwa_token $RWA_REALESTATE \
  --strwa_token $STRWA_REALESTATE \
  2>&1 | grep -E '^C[A-Z0-9]{55}$')
echo "    ✅ $VAULT_REALESTATE"

# Deploy Lending Pool
echo ""
echo "📦 Deploying Lending Pool..."
ORACLE="CD5XYT6WXOB567JC3QZGJ7RWHWP4N3C4GJ5LX75WDWUGL7NPXFJJC6AZ"
USDC="CAXHQJ6IHN2TPAJ4NEOXJJLRRAO74BEAWA3RXHD6NSOWRBQCTVZA3ZGS"

LENDING_POOL=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/lending_pool.wasm \
  --source $SOURCE_ACCOUNT \
  --network $NETWORK \
  -- \
  --admin $DEPLOYER \
  --oracle $ORACLE \
  --usdc $USDC \
  2>&1 | grep -E '^C[A-Z0-9]{55}$')
echo "    ✅ $LENDING_POOL"

# Output all addresses
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  Deployment Complete!                                  ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "RWA Tokens:"
echo "  Invoices:    $RWA_INVOICES"
echo "  TBills:      $RWA_TBILLS"
echo "  Real Estate: $RWA_REALESTATE"
echo ""
echo "stRWA Tokens:"
echo "  Invoices:    $STRWA_INVOICES"
echo "  TBills:      $STRWA_TBILLS"
echo "  Real Estate: $STRWA_REALESTATE"
echo ""
echo "Vaults:"
echo "  Invoices:    $VAULT_INVOICES"
echo "  TBills:      $VAULT_TBILLS"
echo "  Real Estate: $VAULT_REALESTATE"
echo ""
echo "Lending Pool:  $LENDING_POOL"
echo ""

# Save to JSON
cat > contracts/deployed-addresses.json << EOF
{
  "network": "testnet",
  "contracts": {
    "usdc_mock": "$USDC",
    "rwa_invoices": "$RWA_INVOICES",
    "rwa_tbills": "$RWA_TBILLS",
    "rwa_realestate": "$RWA_REALESTATE",
    "strwa_invoices": "$STRWA_INVOICES",
    "strwa_tbills": "$STRWA_TBILLS",
    "strwa_realestate": "$STRWA_REALESTATE",
    "vault_invoices": "$VAULT_INVOICES",
    "vault_tbills": "$VAULT_TBILLS",
    "vault_realestate": "$VAULT_REALESTATE",
    "lending_pool": "$LENDING_POOL",
    "mock_oracle": "$ORACLE"
  },
  "deployed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "deployer_address": "$DEPLOYER",
  "network_passphrase": "Test SDF Network ; September 2015",
  "rpc_url": "https://soroban-testnet.stellar.org"
}
EOF

echo "✅ Addresses saved to contracts/deployed-addresses.json"
