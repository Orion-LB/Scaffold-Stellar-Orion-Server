#!/bin/bash
set -e

# Stellar Smart Contract Deployment Script
# Usage: ./scripts/deploy.sh [testnet|futurenet|mainnet]

NETWORK=${1:-testnet}
IDENTITY="admin"

echo "🚀 Deploying contracts to $NETWORK..."

# Check if stellar CLI is installed
if ! command -v stellar &> /dev/null; then
    echo "❌ Stellar CLI not found. Install with: cargo install --locked soroban-cli --features opt"
    exit 1
fi

# Build contracts
echo "📦 Building contracts..."
cargo build --target wasm32-unknown-unknown --release

# Create output directory for contract addresses
mkdir -p .soroban

# Deploy contracts in order
echo ""
echo "📝 Deploying contracts..."

# 1. USDC Mock
echo "1/6 Deploying USDC Mock..."
USDC_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/usdc_mock.wasm \
  --source $IDENTITY \
  --network $NETWORK)
echo "   ✅ USDC: $USDC_ID"

# 2. Mock RWA Token
echo "2/6 Deploying Mock RWA Token..."
RWA_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/mock_rwa_token.wasm \
  --source $IDENTITY \
  --network $NETWORK)
echo "   ✅ RWA Token: $RWA_ID"

# 3. stRWA Token
echo "3/6 Deploying stRWA Token..."
STRWA_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/strwa_token.wasm \
  --source $IDENTITY \
  --network $NETWORK)
echo "   ✅ stRWA Token: $STRWA_ID"

# 4. RWA Vault
echo "4/6 Deploying RWA Vault..."
VAULT_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/rwa_vault.wasm \
  --source $IDENTITY \
  --network $NETWORK)
echo "   ✅ Vault: $VAULT_ID"

# 5. Oracle
echo "5/6 Deploying Oracle..."
ORACLE_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/mock_oracle.wasm \
  --source $IDENTITY \
  --network $NETWORK)
echo "   ✅ Oracle: $ORACLE_ID"

# 6. Lending Pool
echo "6/6 Deploying Lending Pool..."
LENDING_POOL_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/lending_pool.wasm \
  --source $IDENTITY \
  --network $NETWORK)
echo "   ✅ Lending Pool: $LENDING_POOL_ID"

# Save contract addresses
echo ""
echo "💾 Saving contract addresses..."

cat > .soroban/contract-addresses-$NETWORK.json <<EOF
{
  "network": "$NETWORK",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "contracts": {
    "usdc": "$USDC_ID",
    "rwaToken": "$RWA_ID",
    "stRwaToken": "$STRWA_ID",
    "vault": "$VAULT_ID",
    "oracle": "$ORACLE_ID",
    "lendingPool": "$LENDING_POOL_ID"
  }
}
EOF

# Export for initialization script
export USDC_ID
export RWA_ID
export STRWA_ID
export VAULT_ID
export ORACLE_ID
export LENDING_POOL_ID
export NETWORK
export IDENTITY

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Contract Addresses:"
echo "   USDC:         $USDC_ID"
echo "   RWA Token:    $RWA_ID"
echo "   stRWA Token:  $STRWA_ID"
echo "   Vault:        $VAULT_ID"
echo "   Oracle:       $ORACLE_ID"
echo "   Lending Pool: $LENDING_POOL_ID"
echo ""
echo "📄 Addresses saved to: .soroban/contract-addresses-$NETWORK.json"
echo ""
echo "⚠️  Next step: Run initialization script"
echo "   ./scripts/initialize.sh $NETWORK"
