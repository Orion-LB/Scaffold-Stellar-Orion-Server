#!/bin/bash

# Test Staking Functionality for All Asset Types
set -e

echo "=================================================="
echo "Testing Staking Functionality - All Asset Types"
echo "=================================================="
echo ""

# Contract addresses
INVOICES_RWA="CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP"
TBILLS_RWA="CD3ZKDA3VG4PQAPXCPJV6VZJ65ACA2N7ISPUF4FN73ITMCNHKCEGMZAW"
REALESTATE_RWA="CCSCN4NNINMSENMRRFYHW7M6D3NBMK33NE3BA5XCCT26CSCJT5ZKYF46"

VAULT_INVOICES="CBPQKQEA3FN6E56GNNDSA2WU5I3YTVHIKYWWG5SJRUFKFUAD6MMCADND"
VAULT_TBILLS="CCAQKVCDBFF2UHVWSNBVM26RBTS6S7UP77J6XOY7JKKEH526DNOWSHWI"
VAULT_REALESTATE="CBEJDHFILS7TQ3QIIE5H6S25TUCQ5XOSVG75UMA4OTLMZF3SOKUCOEPG"

STRWA_INVOICES="CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL"
STRWA_TBILLS="CDGL6V3VT6HAIWNDQLYTLWFXF4O7L3TNWYD3OUEE4JNCLX3EXHH2HSEA"
STRWA_REALESTATE="CD5WDVFPWBLERKA3RYQT6L7V5J5NLHL3HP64WYJUVZMNUQLAGPLEYOZR"

DEPLOYER="GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D"
STAKE_AMOUNT="1000000000000000000"  # 1 token with 18 decimals

echo "Test User: $DEPLOYER"
echo "Stake Amount: 1 token (1000000000000000000)"
echo ""

# Helper function to run test
run_staking_test() {
    local asset_name=$1
    local rwa_contract=$2
    local vault_contract=$3
    local strwa_contract=$4

    echo "=================================================="
    echo "Testing: $asset_name"
    echo "=================================================="
    echo ""

    # Step 1: Check if deployer is whitelisted
    echo "[1/5] Checking if user is whitelisted..."
    ALLOWED=$(stellar contract invoke \
      --id "$rwa_contract" \
      --source-account testnet-deployer \
      --network testnet \
      -- allowed \
      --account "$DEPLOYER" 2>&1 | grep -E "true|false" || echo "false")

    if [ "$ALLOWED" != "true" ]; then
        echo "   Whitelisting user..."
        stellar contract invoke \
          --id "$rwa_contract" \
          --source-account testnet-deployer \
          --network testnet \
          -- allow_user \
          --user "$DEPLOYER" \
          --operator "$DEPLOYER"
        echo "   ✅ User whitelisted"
    else
        echo "   ✅ User already whitelisted"
    fi
    echo ""

    # Step 2: Mint RWA tokens
    echo "[2/5] Minting RWA tokens..."
    stellar contract invoke \
      --id "$rwa_contract" \
      --source-account testnet-deployer \
      --network testnet \
      -- mint_rwa_tokens \
      --user "$DEPLOYER" \
      --amount "$STAKE_AMOUNT"
    echo "   ✅ Minted 1 RWA token"
    echo ""

    # Step 3: Check balance before staking
    echo "[3/5] Checking stRWA balance before staking..."
    BALANCE_BEFORE_RAW=$(stellar contract invoke \
      --id "$strwa_contract" \
      --source-account testnet-deployer \
      --network testnet \
      -- balance \
      --account "$DEPLOYER" 2>&1)
    BALANCE_BEFORE=$(echo "$BALANCE_BEFORE_RAW" | grep -E '^"[0-9]+"$' | tr -d '"' || echo "0")
    echo "   Balance before: $BALANCE_BEFORE"
    echo "   Raw balance output: $BALANCE_BEFORE_RAW"
    echo ""

    # Step 4: Stake tokens
    echo "[4/5] Staking RWA tokens in vault..."
    STAKE_RESULT=$(stellar contract invoke \
      --id "$vault_contract" \
      --source-account testnet-deployer \
      --network testnet \
      -- stake \
      --user "$DEPLOYER" \
      --amount "$STAKE_AMOUNT" 2>&1)

    if echo "$STAKE_RESULT" | grep -q "Success"; then
        echo "   ✅ Staking successful"
    else
        echo "   ❌ Staking failed:"
        echo "$STAKE_RESULT"
        return 1
    fi
    echo ""

    # Step 5: Check balance after staking
    echo "[5/5] Checking stRWA balance after staking..."
    BALANCE_AFTER_RAW=$(stellar contract invoke \
      --id "$strwa_contract" \
      --source-account testnet-deployer \
      --network testnet \
      -- balance \
      --account "$DEPLOYER" 2>&1)
    BALANCE_AFTER=$(echo "$BALANCE_AFTER_RAW" | grep -E '^"[0-9]+"$' | tr -d '"' || echo "0")
    echo "   Balance after: $BALANCE_AFTER"
    echo "   Raw balance output: $BALANCE_AFTER_RAW"

    # Calculate difference
    DIFF=$((BALANCE_AFTER - BALANCE_BEFORE))
    echo "   Received: $DIFF stRWA tokens"
    echo ""

    if [ "$DIFF" -eq "$STAKE_AMOUNT" ]; then
        echo "✅ $asset_name staking test PASSED"
    else
        echo "❌ $asset_name staking test FAILED - Expected $STAKE_AMOUNT, got $DIFF"
    fi
    echo ""
}

# Run tests for all three asset types
run_staking_test "Invoices RWA" "$INVOICES_RWA" "$VAULT_INVOICES" "$STRWA_INVOICES"
run_staking_test "TBills RWA" "$TBILLS_RWA" "$VAULT_TBILLS" "$STRWA_TBILLS"
run_staking_test "Real Estate RWA" "$REALESTATE_RWA" "$VAULT_REALESTATE" "$STRWA_REALESTATE"

# Summary
echo "=================================================="
echo "Staking Test Summary"
echo "=================================================="
echo ""
echo "All staking tests completed!"
echo "Users can now stake RWA tokens in all three vaults."
echo ""
echo "Next steps:"
echo "1. Users stake their RWA tokens directly (no approval needed)"
echo "2. Users receive stRWA tokens 1:1"
echo "3. Users can use stRWA as collateral for loans"
echo ""
echo "=================================================="
