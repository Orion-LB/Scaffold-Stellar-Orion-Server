#!/bin/bash

# Comprehensive Contract Function Testing Script
# Tests all deployed contracts to verify build integrity

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load deployed addresses
DEPLOYED_FILE="contracts/deployed-addresses.json"

if [ ! -f "$DEPLOYED_FILE" ]; then
    echo -e "${RED}❌ Error: deployed-addresses.json not found${NC}"
    exit 1
fi

# Extract addresses using jq or simple grep/sed
USDC_MOCK=$(grep -A 1 '"usdc_mock"' $DEPLOYED_FILE | tail -1 | sed 's/.*"\(.*\)".*/\1/')
RWA_INVOICES=$(grep -A 1 '"rwa_invoices"' $DEPLOYED_FILE | tail -1 | sed 's/.*"\(.*\)".*/\1/')
RWA_TBILLS=$(grep -A 1 '"rwa_tbills"' $DEPLOYED_FILE | tail -1 | sed 's/.*"\(.*\)".*/\1/')
RWA_REALESTATE=$(grep -A 1 '"rwa_realestate"' $DEPLOYED_FILE | tail -1 | sed 's/.*"\(.*\)".*/\1/')
STRWA_INVOICES=$(grep -A 1 '"strwa_invoices"' $DEPLOYED_FILE | tail -1 | sed 's/.*"\(.*\)".*/\1/')
STRWA_TBILLS=$(grep -A 1 '"strwa_tbills"' $DEPLOYED_FILE | tail -1 | sed 's/.*"\(.*\)".*/\1/')
STRWA_REALESTATE=$(grep -A 1 '"strwa_realestate"' $DEPLOYED_FILE | tail -1 | sed 's/.*"\(.*\)".*/\1/')
VAULT_INVOICES=$(grep -A 1 '"vault_invoices"' $DEPLOYED_FILE | tail -1 | sed 's/.*"\(.*\)".*/\1/')
VAULT_TBILLS=$(grep -A 1 '"vault_tbills"' $DEPLOYED_FILE | tail -1 | sed 's/.*"\(.*\)".*/\1/')
VAULT_REALESTATE=$(grep -A 1 '"vault_realestate"' $DEPLOYED_FILE | tail -1 | sed 's/.*"\(.*\)".*/\1/')
LENDING_POOL=$(grep -A 1 '"lending_pool"' $DEPLOYED_FILE | tail -1 | sed 's/.*"\(.*\)".*/\1/')
ORACLE=$(grep -A 1 '"mock_oracle"' $DEPLOYED_FILE | tail -1 | sed 's/.*"\(.*\)".*/\1/')

# Test user address (deployer)
USER_ADDRESS=$(stellar keys address deployer)

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test and track results
run_test() {
    local test_name="$1"
    local command="$2"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}🧪 Test $TOTAL_TESTS: $test_name${NC}"

    if eval "$command" > /tmp/test_output.log 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        cat /tmp/test_output.log | head -5
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        cat /tmp/test_output.log
        return 1
    fi
}

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  COMPREHENSIVE CONTRACT TESTING SUITE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}📋 Contract Addresses:${NC}"
echo "USDC Mock:           $USDC_MOCK"
echo "RWA Invoices:        $RWA_INVOICES"
echo "RWA TBills:          $RWA_TBILLS"
echo "RWA Real Estate:     $RWA_REALESTATE"
echo "stRWA Invoices:      $STRWA_INVOICES"
echo "stRWA TBills:        $STRWA_TBILLS"
echo "stRWA Real Estate:   $STRWA_REALESTATE"
echo "Vault Invoices:      $VAULT_INVOICES"
echo "Vault TBills:        $VAULT_TBILLS"
echo "Vault Real Estate:   $VAULT_REALESTATE"
echo "Lending Pool:        $LENDING_POOL"
echo "Oracle:              $ORACLE"

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  SECTION 1: ORACLE CONTRACT TESTS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 1: Inspect Oracle contract
run_test "Inspect Oracle Contract" \
    "stellar contract inspect --id $ORACLE --network testnet"

# Test 2: Query Oracle for Invoices price
run_test "Get Price for stRWA Invoices" \
    "stellar contract invoke --id $ORACLE --network testnet -- get_price --token_address $STRWA_INVOICES"

# Test 3: Query Oracle for TBills price
run_test "Get Price for stRWA TBills" \
    "stellar contract invoke --id $ORACLE --network testnet -- get_price --token_address $STRWA_TBILLS"

# Test 4: Query Oracle for Real Estate price
run_test "Get Price for stRWA Real Estate" \
    "stellar contract invoke --id $ORACLE --network testnet -- get_price --token_address $STRWA_REALESTATE"

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  SECTION 2: USDC MOCK TOKEN TESTS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 5: Check USDC balance
run_test "Check USDC Balance" \
    "stellar contract invoke --id $USDC_MOCK --network testnet -- balance --id $USER_ADDRESS"

# Test 6: Get USDC token name
run_test "Get USDC Name" \
    "stellar contract invoke --id $USDC_MOCK --network testnet -- name"

# Test 7: Get USDC token symbol
run_test "Get USDC Symbol" \
    "stellar contract invoke --id $USDC_MOCK --network testnet -- symbol"

# Test 8: Get USDC decimals
run_test "Get USDC Decimals" \
    "stellar contract invoke --id $USDC_MOCK --network testnet -- decimals"

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  SECTION 3: RWA TOKEN TESTS (Invoices)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 9: Check RWA Invoices balance
run_test "Check RWA Invoices Balance" \
    "stellar contract invoke --id $RWA_INVOICES --network testnet -- balance --id $USER_ADDRESS"

# Test 10: Get RWA Invoices name
run_test "Get RWA Invoices Name" \
    "stellar contract invoke --id $RWA_INVOICES --network testnet -- name"

# Test 11: Get RWA Invoices symbol
run_test "Get RWA Invoices Symbol" \
    "stellar contract invoke --id $RWA_INVOICES --network testnet -- symbol"

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  SECTION 4: stRWA TOKEN TESTS (Invoices)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 12: Check stRWA Invoices balance
run_test "Check stRWA Invoices Balance" \
    "stellar contract invoke --id $STRWA_INVOICES --network testnet -- balance --id $USER_ADDRESS"

# Test 13: Get stRWA Invoices name
run_test "Get stRWA Invoices Name" \
    "stellar contract invoke --id $STRWA_INVOICES --network testnet -- name"

# Test 14: Get stRWA Invoices symbol
run_test "Get stRWA Invoices Symbol" \
    "stellar contract invoke --id $STRWA_INVOICES --network testnet -- symbol"

# Test 15: Get stRWA Invoices total supply
run_test "Get stRWA Invoices Total Supply" \
    "stellar contract invoke --id $STRWA_INVOICES --network testnet -- total_supply"

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  SECTION 5: VAULT TESTS (Invoices)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 16: Inspect Vault contract
run_test "Inspect Vault Invoices Contract" \
    "stellar contract inspect --id $VAULT_INVOICES --network testnet"

# Test 17: Get Vault balance
run_test "Get Vault Invoices Balance" \
    "stellar contract invoke --id $VAULT_INVOICES --network testnet -- get_user_balance --user $USER_ADDRESS"

# Test 18: Get Vault total deposits
run_test "Get Vault Invoices Total Deposits" \
    "stellar contract invoke --id $VAULT_INVOICES --network testnet -- get_total_deposits"

# Test 19: Get Vault yield rate
run_test "Get Vault Invoices Yield Rate" \
    "stellar contract invoke --id $VAULT_INVOICES --network testnet -- get_yield_rate"

# Test 20: Get user yield
run_test "Get User Yield (Invoices)" \
    "stellar contract invoke --id $VAULT_INVOICES --network testnet -- get_user_yield --user $USER_ADDRESS"

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  SECTION 6: LENDING POOL TESTS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 21: Inspect Lending Pool contract
run_test "Inspect Lending Pool Contract" \
    "stellar contract inspect --id $LENDING_POOL --network testnet"

# Test 22: Get Lending Pool total borrowed
run_test "Get Total Borrowed Amount" \
    "stellar contract invoke --id $LENDING_POOL --network testnet -- get_total_borrowed"

# Test 23: Get Lending Pool available liquidity
run_test "Get Available Liquidity" \
    "stellar contract invoke --id $LENDING_POOL --network testnet -- get_available_liquidity"

# Test 24: Get user loan (should return no loan if not borrowed)
run_test "Get User Loan Status" \
    "stellar contract invoke --id $LENDING_POOL --network testnet -- get_loan --borrower $USER_ADDRESS"

# Test 25: Get interest rate
run_test "Get Interest Rate" \
    "stellar contract invoke --id $LENDING_POOL --network testnet -- get_interest_rate"

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  SECTION 7: MULTI-ASSET VERIFICATION${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test 26: Verify all 3 stRWA tokens exist
run_test "Verify stRWA TBills Token" \
    "stellar contract invoke --id $STRWA_TBILLS --network testnet -- name"

# Test 27: Verify stRWA Real Estate
run_test "Verify stRWA Real Estate Token" \
    "stellar contract invoke --id $STRWA_REALESTATE --network testnet -- name"

# Test 28: Verify all 3 vaults exist
run_test "Verify Vault TBills" \
    "stellar contract invoke --id $VAULT_TBILLS --network testnet -- get_total_deposits"

# Test 29: Verify Vault Real Estate
run_test "Verify Vault Real Estate" \
    "stellar contract invoke --id $VAULT_REALESTATE --network testnet -- get_total_deposits"

# Test 30: Check all RWA tokens
run_test "Verify RWA TBills Token" \
    "stellar contract invoke --id $RWA_TBILLS --network testnet -- name"

# Test 31: Verify RWA Real Estate
run_test "Verify RWA Real Estate Token" \
    "stellar contract invoke --id $RWA_REALESTATE --network testnet -- name"

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  TEST SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}📊 Results:${NC}"
echo -e "Total Tests:  $TOTAL_TESTS"
echo -e "${GREEN}Passed:       $PASSED_TESTS${NC}"
echo -e "${RED}Failed:       $FAILED_TESTS${NC}"

SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo -e "\n${BLUE}Success Rate: $SUCCESS_RATE%${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✅ ALL TESTS PASSED! Build is working correctly.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  Some tests failed. Please review the errors above.${NC}"
    exit 1
fi
