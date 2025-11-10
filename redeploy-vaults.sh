#!/bin/bash
set -e

echo "Building RWA Vault contract..."
cargo build --target wasm32v1-none --release -p rwa-vault

echo "Reading existing contract addresses..."
RWA_INVOICES=$(jq -r '.contracts.rwa_invoices' contracts/deployed-addresses.json)
RWA_TBILLS=$(jq -r '.contracts.rwa_tbills' contracts/deployed-addresses.json)
RWA_REALESTATE=$(jq -r '.contracts.rwa_realestate' contracts/deployed-addresses.json)

STRWA_INVOICES=$(jq -r '.contracts.strwa_invoices' contracts/deployed-addresses.json)
STRWA_TBILLS=$(jq -r '.contracts.strwa_tbills' contracts/deployed-addresses.json)
STRWA_REALESTATE=$(jq -r '.contracts.strwa_realestate' contracts/deployed-addresses.json)

DEPLOYER="GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D"
SOURCE_ACCOUNT="testnet-deployer"
NETWORK="testnet"

echo "Redeploying Vaults..."

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

echo "Updating deployed-addresses.json..."
jq --arg invoices "$VAULT_INVOICES" \
   --arg tbills "$VAULT_TBILLS" \
   --arg realestate "$VAULT_REALESTATE" \
   '.contracts.vault_invoices = $invoices | .contracts.vault_tbills = $tbills | .contracts.vault_realestate = $realestate | .vault_updated_at = "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"' \
   contracts/deployed-addresses.json > tmp.$$.json && mv tmp.$$.json contracts/deployed-addresses.json

echo "Setting Vault addresses on stRWA tokens..."

echo "  → stRWA Invoices..."
echo "    STRWA_INVOICES: $STRWA_INVOICES" # Debugging line
echo "    VAULT_INVOICES: $VAULT_INVOICES" # Debugging line
stellar contract invoke \
  --id "$STRWA_INVOICES" \
  --source-account $SOURCE_ACCOUNT \
  --network $NETWORK \
  -- set_vault_address \
  --vault "$VAULT_INVOICES"
echo "    ✅ Vault address set for stRWA Invoices"

echo "  → stRWA TBills..."
echo "    STRWA_TBILLS: $STRWA_TBILLS" # Debugging line
echo "    VAULT_TBILLS: $VAULT_TBILLS" # Debugging line
stellar contract invoke \
  --id "$STRWA_TBILLS" \
  --source-account $SOURCE_ACCOUNT \
  --network $NETWORK \
  -- set_vault_address \
  --vault "$VAULT_TBILLS"
echo "    ✅ Vault address set for stRWA TBills"

echo "  → stRWA Real Estate..."
echo "    STRWA_REALESTATE: $STRWA_REALESTATE" # Debugging line
echo "    VAULT_REALESTATE: $VAULT_REALESTATE" # Debugging line
stellar contract invoke \
  --id "$STRWA_REALESTATE" \
  --source-account $SOURCE_ACCOUNT \
  --network $NETWORK \
  -- set_vault_address \
  --vault "$VAULT_REALESTATE"
echo "    ✅ Vault address set for stRWA Real Estate"

echo "✅ Vaults redeployed and addresses updated."
