#!/bin/bash
set -e

echo "Reading contract addresses..."
RWA_INVOICES=$(jq -r '.contracts.rwa_invoices' contracts/deployed-addresses.json)
RWA_TBILLS=$(jq -r '.contracts.rwa_tbills' contracts/deployed-addresses.json)
RWA_REALESTATE=$(jq -r '.contracts.rwa_realestate' contracts/deployed-addresses.json)

VAULT_INVOICES=$(jq -r '.contracts.vault_invoices' contracts/deployed-addresses.json)
VAULT_TBILLS=$(jq -r '.contracts.vault_tbills' contracts/deployed-addresses.json)
VAULT_REALESTATE=$(jq -r '.contracts.vault_realestate' contracts/deployed-addresses.json)

DEPLOYER="GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D"
SOURCE_ACCOUNT="testnet-deployer"
NETWORK="testnet"

echo "Whitelisting new vaults on RWA tokens..."
echo ""

echo "[1/3] Whitelisting Invoices Vault on Invoices RWA..."
stellar contract invoke \
  --id "$RWA_INVOICES" \
  --source-account $SOURCE_ACCOUNT \
  --network $NETWORK \
  -- allow_user \
  --user "$VAULT_INVOICES" \
  --operator "$DEPLOYER"

echo ""
echo "[2/3] Whitelisting TBills Vault on TBills RWA..."
stellar contract invoke \
  --id "$RWA_TBILLS" \
  --source-account $SOURCE_ACCOUNT \
  --network $NETWORK \
  -- allow_user \
  --user "$VAULT_TBILLS" \
  --operator "$DEPLOYER"

echo ""
echo "[3/3] Whitelisting Real Estate Vault on Real Estate RWA..."
stellar contract invoke \
  --id "$RWA_REALESTATE" \
  --source-account $SOURCE_ACCOUNT \
  --network $NETWORK \
  -- allow_user \
  --user "$VAULT_REALESTATE" \
  --operator "$DEPLOYER"

echo ""
echo "✅ All vaults whitelisted!"
