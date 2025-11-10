#!/bin/bash

# Test RWA Token Minting for All Asset Types
# This script tests minting functionality for Invoices, TBills, and Real Estate RWA tokens

set -e

echo "=================================================="
echo "Testing RWA Token Minting - All Asset Types"
echo "=================================================="
echo ""

# Contract addresses from deployed-addresses.json
INVOICES_RWA="CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP"
TBILLS_RWA="CD3ZKDA3VG4PQAPXCPJV6VZJ65ACA2N7ISPUF4FN73ITMCNHKCEGMZAW"
REALESTATE_RWA="CCSCN4NNINMSENMRRFYHW7M6D3NBMK33NE3BA5XCCT26CSCJT5ZKYF46"

# Deployer address
DEPLOYER="GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D"

# Mint amount: 10 tokens (18 decimals)
MINT_AMOUNT="10000000000000000000"

echo "Test Configuration:"
echo "  Deployer: $DEPLOYER"
echo "  Mint Amount: 10 tokens (10000000000000000000)"
echo ""

# Test 1: Mint Invoices RWA
echo "=================================================="
echo "Test 1: Minting Invoices RWA Tokens"
echo "=================================================="
echo "Contract: $INVOICES_RWA"
echo ""

stellar contract invoke \
  --id "$INVOICES_RWA" \
  --source-account testnet-deployer \
  --network testnet \
  -- mint_rwa_tokens \
    --user "$DEPLOYER" \
    --amount "$MINT_AMOUNT"

echo ""
echo "✅ Invoices RWA tokens minted successfully!"
echo ""

# Check balance
echo "Checking Invoices RWA balance..."
INVOICES_BALANCE=$(stellar contract invoke \
  --id "$INVOICES_RWA" \
  --source-account testnet-deployer \
  --network testnet \
  -- balance \
    --address "$DEPLOYER")

echo "Balance: $INVOICES_BALANCE"
echo ""

# Test 2: Mint TBills RWA
echo "=================================================="
echo "Test 2: Minting TBills RWA Tokens"
echo "=================================================="
echo "Contract: $TBILLS_RWA"
echo ""

stellar contract invoke \
  --id "$TBILLS_RWA" \
  --source-account testnet-deployer \
  --network testnet \
  -- mint_rwa_tokens \
    --user "$DEPLOYER" \
    --amount "$MINT_AMOUNT"

echo ""
echo "✅ TBills RWA tokens minted successfully!"
echo ""

# Check balance
echo "Checking TBills RWA balance..."
TBILLS_BALANCE=$(stellar contract invoke \
  --id "$TBILLS_RWA" \
  --source-account testnet-deployer \
  --network testnet \
  -- balance \
    --address "$DEPLOYER")

echo "Balance: $TBILLS_BALANCE"
echo ""

# Test 3: Mint Real Estate RWA
echo "=================================================="
echo "Test 3: Minting Real Estate RWA Tokens"
echo "=================================================="
echo "Contract: $REALESTATE_RWA"
echo ""

stellar contract invoke \
  --id "$REALESTATE_RWA" \
  --source-account testnet-deployer \
  --network testnet \
  -- mint_rwa_tokens \
    --user "$DEPLOYER" \
    --amount "$MINT_AMOUNT"

echo ""
echo "✅ Real Estate RWA tokens minted successfully!"
echo ""

# Check balance
echo "Checking Real Estate RWA balance..."
REALESTATE_BALANCE=$(stellar contract invoke \
  --id "$REALESTATE_RWA" \
  --source-account testnet-deployer \
  --network testnet \
  -- balance \
    --address "$DEPLOYER")

echo "Balance: $REALESTATE_BALANCE"
echo ""

# Summary
echo "=================================================="
echo "Minting Test Summary"
echo "=================================================="
echo ""
echo "✅ Invoices RWA:    Minted 10 tokens | Balance: $INVOICES_BALANCE"
echo "✅ TBills RWA:      Minted 10 tokens | Balance: $TBILLS_BALANCE"
echo "✅ Real Estate RWA: Minted 10 tokens | Balance: $REALESTATE_BALANCE"
echo ""
echo "All RWA token minting tests completed successfully!"
echo "=================================================="
