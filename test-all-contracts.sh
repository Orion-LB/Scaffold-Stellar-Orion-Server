#!/bin/bash

# Comprehensive Contract Function Testing
# Tests all functions across all 12 deployed contracts

set -e

echo "=========================================================="
echo "Orion RWA Lending Protocol - Complete Contract Test Suite"
echo "=========================================================="
echo ""
echo "Network: Stellar Testnet"
echo "Deployer: testnet-deployer"
echo "Date: $(date)"
echo ""

# Contract addresses
ORACLE="CDQ3C3T477QZFH6KQMQEA4HTIVIHOMN5YKDWHBDQT4EBO4MNXI5ZXKVX"
LENDING_POOL="CCW2TFZ7DWNMORNW3QVPYI5VYLNITMUMH42OKILXDLPN2J7HZQ545TWJ"
USDC="CAXHQJ6IHN2TPAJ4NEOXJJLRRAO74BEAWA3RXHD6NSOWRBQCTVZA3ZGS"

RWA_INVOICES="CBFKZAVQ57FUWFTPS2SDHDKWZN2OI2MYRNZ4AZ2FHZ5M62FAT4OAC2SP"
RWA_TBILLS="CD3ZKDA3VG4PQAPXCPJV6VZJ65ACA2N7ISPUF4FN73ITMCNHKCEGMZAW"
RWA_REALESTATE="CCSCN4NNINMSENMRRFYHW7M6D3NBMK33NE3BA5XCCT26CSCJT5ZKYF46"

STRWA_INVOICES="CDHGP3XMH2FUQ6FFUHGLDFN5C26W7C6FW5GZ5N743M546KXWKHHK74IL"
STRWA_TBILLS="CDGL6V3VT6HAIWNDQLYTLWFXF4O7L3TNWYD3OUEE4JNCLX3EXHH2HSEA"
STRWA_REALESTATE="CD5WDVFPWBLERKA3RYQT6L7V5J5NLHL3HP64WYJUVZMNUQLAGPLEYOZR"

VAULT_INVOICES="CCYADH4LWFOIRCZPWCIMGG46M5ZUUQ3WQUA4FF2BJNSFQUHIKTE32N2G"
VAULT_TBILLS="CAFQWK3D3QLMGSW2OL6HE3VTCLCKZKPWNTCTKBM5MFLKKZWIKTA6Z7DP"
VAULT_REALESTATE="CAGUJJGFK7N5WC4CEYS3CS6QH7RIAWBPZIMB6ELVHGBJ5KBA3R3WMWLI"

DEPLOYER="GAADPNKZXJEJ6DDDCSGZH3EIIUB2BUKOMH3RQSNZZEKA5GTXRDZBLO3D"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test
run_test() {
    local test_name="$1"
    local command="$2"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo ""
    echo "[$TOTAL_TESTS] Testing: $test_name"

    if eval "$command" > /dev/null 2>&1; then
        echo "✅ PASSED"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo "❌ FAILED"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Function to run test with output
run_test_with_output() {
    local test_name="$1"
    local command="$2"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo ""
    echo "[$TOTAL_TESTS] Testing: $test_name"

    result=$(eval "$command" 2>&1)
    exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo "✅ PASSED"
        echo "Result: $result"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo "❌ FAILED"
        echo "Error: $result"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

echo "=========================================================="
echo "1. ORACLE CONTRACT TESTS"
echo "=========================================================="
echo "Contract: $ORACLE"

run_test_with_output "Oracle: get_price (Invoices stRWA)" \
    "stellar contract invoke --id $ORACLE --source-account testnet-deployer --network testnet -- get_price --asset $STRWA_INVOICES"

run_test_with_output "Oracle: get_price (TBills stRWA)" \
    "stellar contract invoke --id $ORACLE --source-account testnet-deployer --network testnet -- get_price --asset $STRWA_TBILLS"

run_test_with_output "Oracle: get_price (Real Estate stRWA)" \
    "stellar contract invoke --id $ORACLE --source-account testnet-deployer --network testnet -- get_price --asset $STRWA_REALESTATE"

run_test "Oracle: set_price (Invoices stRWA)" \
    "stellar contract invoke --id $ORACLE --source-account testnet-deployer --network testnet -- set_price --asset_address $STRWA_INVOICES --price 1000000 --timestamp 0 --source $DEPLOYER"

run_test "Oracle: set_price (TBills stRWA)" \
    "stellar contract invoke --id $ORACLE --source-account testnet-deployer --network testnet -- set_price --asset_address $STRWA_TBILLS --price 1050000 --timestamp 0 --source $DEPLOYER"

run_test "Oracle: set_price (Real Estate stRWA)" \
    "stellar contract invoke --id $ORACLE --source-account testnet-deployer --network testnet -- set_price --asset_address $STRWA_REALESTATE --price 950000 --timestamp 0 --source $DEPLOYER"

run_test_with_output "Oracle: get_price_data (Invoices)" \
    "stellar contract invoke --id $ORACLE --source-account testnet-deployer --network testnet -- get_price_data --asset $STRWA_INVOICES"

echo ""
echo "=========================================================="
echo "2. USDC MOCK CONTRACT TESTS"
echo "=========================================================="
echo "Contract: $USDC"

run_test_with_output "USDC: balance (deployer)" \
    "stellar contract invoke --id $USDC --source-account testnet-deployer --network testnet -- balance --id $DEPLOYER"

run_test "USDC: mint (1000 USDC)" \
    "stellar contract invoke --id $USDC --source-account testnet-deployer --network testnet -- mint --to $DEPLOYER --amount 1000000000"

run_test_with_output "USDC: balance (after mint)" \
    "stellar contract invoke --id $USDC --source-account testnet-deployer --network testnet -- balance --id $DEPLOYER"

echo ""
echo "=========================================================="
echo "3. RWA TOKEN TESTS (Invoices)"
echo "=========================================================="
echo "Contract: $RWA_INVOICES"

run_test "RWA Invoices: allow_user (whitelist deployer)" \
    "stellar contract invoke --id $RWA_INVOICES --source-account testnet-deployer --network testnet -- allow_user --user $DEPLOYER"

run_test_with_output "RWA Invoices: is_allowed (check whitelist)" \
    "stellar contract invoke --id $RWA_INVOICES --source-account testnet-deployer --network testnet -- is_allowed --user $DEPLOYER"

run_test "RWA Invoices: mint_rwa_tokens (10 tokens)" \
    "stellar contract invoke --id $RWA_INVOICES --source-account testnet-deployer --network testnet -- mint_rwa_tokens --user $DEPLOYER --amount 10000000000000000000"

run_test_with_output "RWA Invoices: balance (after minting)" \
    "stellar contract invoke --id $RWA_INVOICES --source-account testnet-deployer --network testnet -- balance --id $DEPLOYER"

run_test "RWA Invoices: allow_user (whitelist vault)" \
    "stellar contract invoke --id $RWA_INVOICES --source-account testnet-deployer --network testnet -- allow_user --user $VAULT_INVOICES"

echo ""
echo "=========================================================="
echo "4. RWA TOKEN TESTS (TBills)"
echo "=========================================================="
echo "Contract: $RWA_TBILLS"

run_test "RWA TBills: allow_user" \
    "stellar contract invoke --id $RWA_TBILLS --source-account testnet-deployer --network testnet -- allow_user --user $DEPLOYER"

run_test "RWA TBills: mint_rwa_tokens (10 tokens)" \
    "stellar contract invoke --id $RWA_TBILLS --source-account testnet-deployer --network testnet -- mint_rwa_tokens --user $DEPLOYER --amount 10000000000000000000"

run_test_with_output "RWA TBills: balance" \
    "stellar contract invoke --id $RWA_TBILLS --source-account testnet-deployer --network testnet -- balance --id $DEPLOYER"

run_test "RWA TBills: allow_user (vault)" \
    "stellar contract invoke --id $RWA_TBILLS --source-account testnet-deployer --network testnet -- allow_user --user $VAULT_TBILLS"

echo ""
echo "=========================================================="
echo "5. RWA TOKEN TESTS (Real Estate)"
echo "=========================================================="
echo "Contract: $RWA_REALESTATE"

run_test "RWA Real Estate: allow_user" \
    "stellar contract invoke --id $RWA_REALESTATE --source-account testnet-deployer --network testnet -- allow_user --user $DEPLOYER"

run_test "RWA Real Estate: mint_rwa_tokens (10 tokens)" \
    "stellar contract invoke --id $RWA_REALESTATE --source-account testnet-deployer --network testnet -- mint_rwa_tokens --user $DEPLOYER --amount 10000000000000000000"

run_test_with_output "RWA Real Estate: balance" \
    "stellar contract invoke --id $RWA_REALESTATE --source-account testnet-deployer --network testnet -- balance --id $DEPLOYER"

run_test "RWA Real Estate: allow_user (vault)" \
    "stellar contract invoke --id $RWA_REALESTATE --source-account testnet-deployer --network testnet -- allow_user --user $VAULT_REALESTATE"

echo ""
echo "=========================================================="
echo "6. VAULT TESTS (Invoices)"
echo "=========================================================="
echo "Contract: $VAULT_INVOICES"

run_test_with_output "Vault Invoices: get_total_deposits (before stake)" \
    "stellar contract invoke --id $VAULT_INVOICES --source-account testnet-deployer --network testnet -- get_total_deposits"

run_test "Vault Invoices: approve RWA tokens for vault" \
    "stellar contract invoke --id $RWA_INVOICES --source-account testnet-deployer --network testnet -- approve --from $DEPLOYER --spender $VAULT_INVOICES --amount 5000000000000000000 --expiration_ledger 1000000"

run_test "Vault Invoices: stake (5 tokens)" \
    "stellar contract invoke --id $VAULT_INVOICES --source-account testnet-deployer --network testnet -- stake --user $DEPLOYER --amount 5000000000000000000"

run_test_with_output "Vault Invoices: get_user_balance" \
    "stellar contract invoke --id $VAULT_INVOICES --source-account testnet-deployer --network testnet -- get_user_balance --user $DEPLOYER"

run_test_with_output "Vault Invoices: get_total_deposits (after stake)" \
    "stellar contract invoke --id $VAULT_INVOICES --source-account testnet-deployer --network testnet -- get_total_deposits"

run_test_with_output "Vault Invoices: get_yield_balance" \
    "stellar contract invoke --id $VAULT_INVOICES --source-account testnet-deployer --network testnet -- get_yield_balance --user $DEPLOYER"

echo ""
echo "=========================================================="
echo "7. VAULT TESTS (TBills)"
echo "=========================================================="
echo "Contract: $VAULT_TBILLS"

run_test "Vault TBills: approve RWA tokens" \
    "stellar contract invoke --id $RWA_TBILLS --source-account testnet-deployer --network testnet -- approve --from $DEPLOYER --spender $VAULT_TBILLS --amount 5000000000000000000 --expiration_ledger 1000000"

run_test "Vault TBills: stake (5 tokens)" \
    "stellar contract invoke --id $VAULT_TBILLS --source-account testnet-deployer --network testnet -- stake --user $DEPLOYER --amount 5000000000000000000"

run_test_with_output "Vault TBills: get_user_balance" \
    "stellar contract invoke --id $VAULT_TBILLS --source-account testnet-deployer --network testnet -- get_user_balance --user $DEPLOYER"

echo ""
echo "=========================================================="
echo "8. VAULT TESTS (Real Estate)"
echo "=========================================================="
echo "Contract: $VAULT_REALESTATE"

run_test "Vault Real Estate: approve RWA tokens" \
    "stellar contract invoke --id $RWA_REALESTATE --source-account testnet-deployer --network testnet -- approve --from $DEPLOYER --spender $VAULT_REALESTATE --amount 5000000000000000000 --expiration_ledger 1000000"

run_test "Vault Real Estate: stake (5 tokens)" \
    "stellar contract invoke --id $VAULT_REALESTATE --source-account testnet-deployer --network testnet -- stake --user $DEPLOYER --amount 5000000000000000000"

run_test_with_output "Vault Real Estate: get_user_balance" \
    "stellar contract invoke --id $VAULT_REALESTATE --source-account testnet-deployer --network testnet -- get_user_balance --user $DEPLOYER"

echo ""
echo "=========================================================="
echo "9. stRWA TOKEN TESTS (Invoices)"
echo "=========================================================="
echo "Contract: $STRWA_INVOICES"

run_test_with_output "stRWA Invoices: balance (after staking)" \
    "stellar contract invoke --id $STRWA_INVOICES --source-account testnet-deployer --network testnet -- balance --id $DEPLOYER"

run_test "stRWA Invoices: approve lending pool" \
    "stellar contract invoke --id $STRWA_INVOICES --source-account testnet-deployer --network testnet -- approve --from $DEPLOYER --spender $LENDING_POOL --amount 3000000000000000000 --expiration_ledger 1000000"

echo ""
echo "=========================================================="
echo "10. stRWA TOKEN TESTS (TBills)"
echo "=========================================================="
echo "Contract: $STRWA_TBILLS"

run_test_with_output "stRWA TBills: balance (after staking)" \
    "stellar contract invoke --id $STRWA_TBILLS --source-account testnet-deployer --network testnet -- balance --id $DEPLOYER"

echo ""
echo "=========================================================="
echo "11. stRWA TOKEN TESTS (Real Estate)"
echo "=========================================================="
echo "Contract: $STRWA_REALESTATE"

run_test_with_output "stRWA Real Estate: balance (after staking)" \
    "stellar contract invoke --id $STRWA_REALESTATE --source-account testnet-deployer --network testnet -- balance --id $DEPLOYER"

echo ""
echo "=========================================================="
echo "12. LENDING POOL TESTS"
echo "=========================================================="
echo "Contract: $LENDING_POOL"

run_test_with_output "Lending Pool: get_all_borrowers (before loan)" \
    "stellar contract invoke --id $LENDING_POOL --source-account testnet-deployer --network testnet -- get_all_borrowers"

run_test "Lending Pool: approve USDC for lending pool" \
    "stellar contract invoke --id $USDC --source-account testnet-deployer --network testnet -- approve --from $DEPLOYER --spender $LENDING_POOL --amount 1000000000 --expiration_ledger 1000000"

echo ""
echo "Lending Pool: originate_loan (2 USDC against 3 stRWA Invoices)"
echo "Note: This test may take longer..."
LOAN_RESULT=$(stellar contract invoke \
  --id $LENDING_POOL \
  --source-account testnet-deployer \
  --network testnet \
  -- originate_loan \
    --borrower $DEPLOYER \
    --collaterals "[[\"$STRWA_INVOICES\", \"3000000000000000000\"]]" \
    --loan_amount 2000000 \
    --duration_months 12 2>&1)

if echo "$LOAN_RESULT" | grep -q "\"1\""; then
    echo "✅ PASSED - Loan ID: 1"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo "❌ FAILED"
    echo "Result: $LOAN_RESULT"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

run_test_with_output "Lending Pool: get_all_borrowers (after loan)" \
    "stellar contract invoke --id $LENDING_POOL --source-account testnet-deployer --network testnet -- get_all_borrowers"

run_test_with_output "Lending Pool: get_health_factor" \
    "stellar contract invoke --id $LENDING_POOL --source-account testnet-deployer --network testnet -- get_health_factor --borrower $DEPLOYER --loan_id 1"

run_test "Lending Pool: repay_loan (1 USDC)" \
    "stellar contract invoke --id $LENDING_POOL --source-account testnet-deployer --network testnet -- repay_loan --borrower $DEPLOYER --loan_id 1 --amount 1000000"

echo ""
echo "=========================================================="
echo "TEST SUMMARY"
echo "=========================================================="
echo ""
echo "Total Tests:  $TOTAL_TESTS"
echo "Passed:       $PASSED_TESTS"
echo "Failed:       $FAILED_TESTS"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 ALL TESTS PASSED!"
    echo ""
    echo "✅ Oracle Contract: Operational"
    echo "✅ USDC Mock: Operational"
    echo "✅ RWA Tokens (3): Operational"
    echo "✅ stRWA Tokens (3): Operational"
    echo "✅ Vaults (3): Operational"
    echo "✅ Lending Pool: Operational"
    echo ""
    echo "System Status: FULLY OPERATIONAL"
    exit 0
else
    echo "⚠️  Some tests failed. Please review the output above."
    echo ""
    echo "Pass Rate: $(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%"
    exit 1
fi
