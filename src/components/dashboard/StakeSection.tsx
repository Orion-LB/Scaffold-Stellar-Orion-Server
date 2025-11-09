import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowRight, Wallet, TrendingUp, Shield, RefreshCw, Info, Lock, Vote, Zap } from "lucide-react";
import grow from "@/assets/growth.png";
import { useContractServices } from "@/hooks/useContractServices";
import { toast } from "sonner";
import { CONTRACT_ADDRESSES } from "@/services/contracts";

const StakeSection = () => {
  const [selectedVault, setSelectedVault] = useState("alexVault");
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [isStakeMode, setIsStakeMode] = useState(true);

  // Real contract balances
  const [rwaBalance, setRwaBalance] = useState<bigint>(BigInt(0));
  const [stRwaBalance, setStRwaBalance] = useState<bigint>(BigInt(0));
  const [claimableYield, setClaimableYield] = useState<bigint>(BigInt(0));

  const {
    isConnected,
    address,
    rwaService,
    stRwaService,
    vaultService,
    usdcService,
  } = useContractServices();

  // Load user balances
  useEffect(() => {
    if (!isConnected || !address) return;

    const loadBalances = async () => {
      try {
        const [rwa, stRwa, yield_amount] = await Promise.all([
          rwaService.balance(address),
          stRwaService.balance(address),
          vaultService.claimable_yield(address).catch(() => BigInt(0)),
        ]);

        setRwaBalance(rwa);
        setStRwaBalance(stRwa);
        setClaimableYield(yield_amount);
      } catch (error) {
        console.error("Failed to load balances:", error);
      }
    };

    loadBalances();
    const interval = setInterval(loadBalances, 10000);
    return () => clearInterval(interval);
  }, [isConnected, address, rwaService, stRwaService, vaultService]);

  const formatBalance = (balance: bigint, decimals: number = 18) => {
    return (Number(balance) / Math.pow(10, decimals)).toFixed(2);
  };

  // Mock data for UI - Keep the original vaults structure
  const vaults = [
    { id: "alexVault", name: "AlexRWA", emoji: "🏦"},
    { id: "ethVault", name: "EthRWA", emoji: "⚡"},
    { id: "btcVault", name: "BtcRWA", emoji: "₿"}
  ];

  // NOTE: Currently only one vault is deployed. Multiple vaults will be added in backend later.
  // For now, all vaults map to the same RWA token contract

  // ============================================================================
  // BACKEND REQUIRED: mint_rwa_tokens() function
  // ============================================================================
  // Function signature needed in RWA Token Contract:
  // pub fn mint_rwa_tokens(env: Env, to: Address, amount: i128) -> Result<(), Error>
  //
  // This function should:
  // 1. Mint RWA tokens to the user's address
  // 2. Automatically whitelist the user (allow_user) so they can transfer tokens
  // 3. For hackathon: Allow anyone to call this (no admin check)
  // 4. In production: Add rate limiting or faucet logic
  // ============================================================================
  const handleGetMockRWA = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with actual mint_rwa_tokens contract call when available
      // const mintAmount = BigInt(1000 * 1e18); // 1000 RWA tokens
      // const result = await rwaService.mint_rwa_tokens(address, mintAmount);

      toast.info("RWA Token minting function not yet implemented in backend. Contact team to get test tokens.");

      // For now, just refresh balances in case tokens were added manually
      const rwa = await rwaService.balance(address);
      setRwaBalance(rwa);
    } catch (error: any) {
      console.error("Minting failed:", error);
      toast.error(error.message || "Minting failed");
    } finally {
      setLoading(false);
    }
  };

  const handleStake = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return;
    }

    const amount = BigInt(Math.floor(parseFloat(stakeAmount || "0") * 1e18));
    if (amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > rwaBalance) {
      toast.error("Insufficient RWA balance");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Approve RWA tokens
      toast.info("Step 1/2: Approving RWA tokens...");
      const approveResult = await rwaService.approve(
        address,
        CONTRACT_ADDRESSES.RWA_VAULT_A,
        amount
      );

      if (!approveResult.success) {
        toast.error("Failed to approve tokens");
        return;
      }

      // ============================================================================
      // BACKEND REQUIRED: Auto-whitelist on stake
      // ============================================================================
      // The stake() function in Vault contract should:
      // 1. Check if user is whitelisted in RWA token
      // 2. If not whitelisted, call rwa_token.allow_user(user) internally
      // 3. Then proceed with the stake
      // This way users don't need manual admin approval
      // ============================================================================

      // Step 2: Stake
      toast.info("Step 2/2: Staking RWA tokens...");
      const result = await vaultService.stake(address, amount);

      if (result.success) {
        toast.success(`Successfully staked ${formatBalance(amount)} RWA!`);
        setStakeAmount("");

        // Refresh balances
        const [rwa, stRwa] = await Promise.all([
          rwaService.balance(address),
          stRwaService.balance(address),
        ]);
        setRwaBalance(rwa);
        setStRwaBalance(stRwa);
      } else {
        toast.error("Staking failed");
      }
    } catch (error: any) {
      console.error("Staking failed:", error);
      toast.error(error.message || "Staking failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return;
    }

    const amount = BigInt(Math.floor(parseFloat(unstakeAmount || "0") * 1e18));
    if (amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > stRwaBalance) {
      toast.error("Insufficient stRWA balance");
      return;
    }

    setLoading(true);
    try {
      const result = await vaultService.unstake(address, amount);

      if (result.success) {
        toast.success(`Successfully unstaked ${formatBalance(amount)} stRWA!`);
        setUnstakeAmount("");

        // Refresh balances
        const [rwa, stRwa] = await Promise.all([
          rwaService.balance(address),
          stRwaService.balance(address),
        ]);
        setRwaBalance(rwa);
        setStRwaBalance(stRwa);
      } else {
        toast.error("Unstaking failed");
      }
    } catch (error: any) {
      console.error("Unstaking failed:", error);
      toast.error(error.message || "Unstaking failed");
    } finally {
      setLoading(false);
    }
  };

  // Claim yield function
  const handleClaimYield = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (claimableYield <= 0) {
      toast.error("No yield available to claim");
      return;
    }

    setLoading(true);
    try {
      const result = await vaultService.claim_yield(address);

      if (result.success) {
        toast.success(`Successfully claimed ${usdcService.fromContractUnits(claimableYield)} USDC yield!`);

        // Refresh claimable yield
        const yield_amount = await vaultService.claimable_yield(address).catch(() => BigInt(0));
        setClaimableYield(yield_amount);
      } else {
        toast.error("Claim failed");
      }
    } catch (error: any) {
      console.error("Claim failed:", error);
      toast.error(error.message || "Claim failed");
    } finally {
      setLoading(false);
    }
  };

  const calculateReceiveAmount = (amount: string) => {
    const exchangeRate = 0.95; // Mock exchange rate
    return (parseFloat(amount || "0") * exchangeRate).toFixed(2);
  };

  const selectedVaultData = vaults.find(v => v.id === selectedVault) || vaults[0];
  const platformTokenName = `Orion${selectedVaultData.name}`;

  // Decorative Stack SVG Component
  const DecorativeStack = () => (
    <svg width="80" height="92" viewBox="0 0 100 115" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M100 108.02C100 111.627 97.0757 114.552 93.4685 114.552L6.53152 114.552C2.92426 114.552 1.03042e-05 111.627 1.03319e-05 108.02V108.02C1.03595e-05 104.413 2.92427 101.489 6.53152 101.489L93.4685 101.489C97.0757 101.489 100 104.413 100 108.02V108.02Z" fill="url(#paint0_linear_296_241)"></path>
      <path d="M94.3613 95.8681C94.3613 97.5733 92.9789 98.9557 91.2737 98.9557L7.79364 98.9557C6.08839 98.9557 4.70602 97.5733 4.70602 95.8681V95.8681C4.70602 94.1628 6.0884 92.7804 7.79364 92.7804L91.2737 92.7805C92.9789 92.7805 94.3613 94.1628 94.3613 95.8681V95.8681Z" fill="url(#paint1_linear_296_241)"></path>
      <path d="M89.8841 87.5937C89.8841 88.971 88.7675 90.0875 87.3902 90.0875L15.7162 90.0875C14.3389 90.0875 13.2224 88.971 13.2224 87.5937V87.5937C13.2224 86.2164 14.3389 85.0998 15.7162 85.0998L87.3902 85.0998C88.7675 85.0998 89.8841 86.2164 89.8841 87.5937V87.5937Z" fill="url(#paint2_linear_296_241)"></path>
      <path d="M86.4012 80.8651C86.4012 81.8926 85.5682 82.7256 84.5407 82.7256L20.6852 82.7256C19.6577 82.7256 18.8247 81.8926 18.8247 80.8651V80.8651C18.8247 79.8376 19.6577 79.0046 20.6852 79.0046L84.5407 79.0046C85.5682 79.0046 86.4012 79.8376 86.4012 80.8651V80.8651Z" fill="url(#paint3_linear_296_241)"></path>
      <path d="M83.9137 75.4415C83.9137 76.0099 83.4529 76.4707 82.8845 76.4707L25.2324 76.4707C24.664 76.4707 24.2032 76.0099 24.2032 75.4415V75.4415C24.2032 74.8731 24.664 74.4123 25.2324 74.4123L82.8845 74.4123C83.4529 74.4123 83.9137 74.8731 83.9137 75.4415V75.4415Z" fill="url(#paint4_linear_296_241)"></path>
      <path d="M80.7626 71.3646C80.7626 71.8674 80.355 72.275 79.8522 72.275L29.5956 72.275C29.0928 72.275 28.6852 71.8674 28.6852 71.3646V71.3646C28.6852 70.8617 29.0928 70.4541 29.5956 70.4541L79.8522 70.4541C80.355 70.4541 80.7626 70.8617 80.7626 71.3646V71.3646Z" fill="url(#paint5_linear_296_241)"></path>
      <path d="M81.0944 67.8416C81.0944 68.1914 80.8108 68.475 80.461 68.475L36.7141 68.475C36.3643 68.475 36.0807 68.1914 36.0807 67.8416V67.8416C36.0807 67.4918 36.3643 67.2083 36.7141 67.2083L80.461 67.2083C80.8108 67.2083 81.0944 67.4918 81.0944 67.8416V67.8416Z" fill="url(#paint6_linear_296_241)"></path>
      <path d="M81.4261 65.3478C81.4261 65.5883 81.2312 65.7832 80.9907 65.7832L43.9117 65.7832C43.6712 65.7832 43.4763 65.5882 43.4763 65.3478V65.3478C43.4763 65.1073 43.6712 64.9123 43.9117 64.9123L80.9907 64.9123C81.2312 64.9123 81.4261 65.1073 81.4261 65.3478V65.3478Z" fill="url(#paint7_linear_296_241)"></path>
      <path d="M81.0944 63.0518C81.0944 63.2486 80.9349 63.4081 80.7381 63.4081L51.2279 63.4081C51.0311 63.4081 50.8716 63.2486 50.8716 63.0518V63.0518C50.8716 62.8551 51.0311 62.6956 51.2279 62.6956L80.7381 62.6956C80.9349 62.6956 81.0944 62.8551 81.0944 63.0518V63.0518Z" fill="url(#paint8_linear_296_241)"></path>
      <path d="M77.2802 60.9932C77.2802 61.1462 77.1562 61.2703 77.0031 61.2703L60.3371 61.2703C60.1841 61.2703 60.06 61.1462 60.06 60.9932V60.9932C60.06 60.8401 60.1841 60.7161 60.3371 60.7161L77.0031 60.7161C77.1562 60.7161 77.2802 60.8401 77.2802 60.9932V60.9932Z" fill="url(#paint9_linear_296_241)"></path>
      <path d="M77.2802 59.2919C77.2802 59.4231 77.1739 59.5294 77.0427 59.5294L66.7966 59.5294C66.6654 59.5294 66.559 59.4231 66.559 59.2919V59.2919C66.559 59.1607 66.6654 59.0544 66.7966 59.0544L77.0427 59.0544C77.1739 59.0544 77.2802 59.1607 77.2802 59.2919V59.2919Z" fill="url(#paint10_linear_296_241)"></path>
      <path d="M76.6167 58.3013C76.6167 58.3669 76.5636 58.42 76.498 58.42L70.7116 58.42C70.646 58.42 70.5928 58.3669 70.5928 58.3013V58.3013C70.5928 58.2357 70.646 58.1825 70.7116 58.1825L76.498 58.1825C76.5636 58.1825 76.6167 58.2357 76.6167 58.3013V58.3013Z" fill="url(#paint11_linear_296_241)"></path>
      <path d="M100 7.18154C100 3.57428 97.0758 0.650025 93.4685 0.650026L6.53155 0.65005C2.92429 0.650051 4.11693e-05 3.57431 4.16257e-05 7.18156V7.18156C4.2082e-05 10.7888 2.9243 13.7131 6.53155 13.7131L93.4685 13.7131C97.0758 13.713 100 10.7888 100 7.18154V7.18154Z" fill="url(#paint12_linear_296_241)"></path>
      <path d="M94.3614 19.3337C94.3614 17.6285 92.979 16.2461 91.2738 16.2461L7.7937 16.2461C6.08845 16.2461 4.70608 17.6285 4.70608 19.3337V19.3337C4.70609 21.039 6.08846 22.4214 7.7937 22.4214L91.2738 22.4213C92.979 22.4213 94.3614 21.039 94.3614 19.3337V19.3337Z" fill="url(#paint13_linear_296_241)"></path>
      <path d="M89.8841 27.6083C89.8841 26.231 88.7675 25.1145 87.3902 25.1145L15.7162 25.1145C14.3389 25.1145 13.2224 26.2311 13.2224 27.6084V27.6084C13.2224 28.9857 14.3389 30.1022 15.7162 30.1022L87.3902 30.1022C88.7675 30.1022 89.8841 28.9857 89.8841 27.6083V27.6083Z" fill="url(#paint14_linear_296_241)"></path>
      <path d="M86.4013 34.3367C86.4013 33.3092 85.5683 32.4762 84.5408 32.4762L20.6852 32.4762C19.6577 32.4762 18.8247 33.3092 18.8247 34.3367V34.3367C18.8247 35.3642 19.6577 36.1972 20.6852 36.1972L84.5408 36.1972C85.5683 36.1972 86.4013 35.3642 86.4013 34.3367V34.3367Z" fill="url(#paint15_linear_296_241)"></path>
      <path d="M83.9137 39.7603C83.9137 39.1919 83.4529 38.7311 82.8845 38.7311L25.2324 38.7311C24.664 38.7311 24.2032 39.1919 24.2032 39.7603V39.7603C24.2032 40.3287 24.664 40.7895 25.2324 40.7895L82.8845 40.7895C83.4529 40.7895 83.9137 40.3287 83.9137 39.7603V39.7603Z" fill="url(#paint16_linear_296_241)"></path>
      <path d="M80.7626 43.8373C80.7626 43.3345 80.355 42.9269 79.8522 42.9269L29.5957 42.9269C29.0928 42.9269 28.6852 43.3345 28.6852 43.8373V43.8373C28.6852 44.3402 29.0928 44.7478 29.5957 44.7478L79.8522 44.7478C80.355 44.7478 80.7626 44.3402 80.7626 43.8373V43.8373Z" fill="url(#paint17_linear_296_241)"></path>
      <path d="M81.0944 47.3603C81.0944 47.0105 80.8108 46.7269 80.461 46.7269L36.7141 46.7269C36.3643 46.7269 36.0807 47.0105 36.0807 47.3603V47.3603C36.0807 47.7101 36.3643 47.9937 36.7141 47.9937L80.461 47.9936C80.8108 47.9936 81.0944 47.7101 81.0944 47.3603V47.3603Z" fill="url(#paint18_linear_296_241)"></path>
      <path d="M81.4262 49.8543C81.4262 49.6138 81.2312 49.4188 80.9907 49.4188L43.9117 49.4188C43.6713 49.4188 43.4763 49.6138 43.4763 49.8543V49.8543C43.4763 50.0947 43.6712 50.2897 43.9117 50.2897L80.9907 50.2897C81.2312 50.2897 81.4262 50.0947 81.4262 49.8543V49.8543Z" fill="url(#paint19_linear_296_241)"></path>
      <path d="M81.0944 52.1514C81.0944 51.9547 80.9349 51.7952 80.7381 51.7952L51.2279 51.7952C51.0311 51.7952 50.8716 51.9547 50.8716 52.1514V52.1514C50.8716 52.3482 51.0311 52.5077 51.2279 52.5077L80.7381 52.5077C80.9349 52.5077 81.0944 52.3482 81.0944 52.1514V52.1514Z" fill="url(#paint20_linear_296_241)"></path>
      <path d="M77.2802 54.2087C77.2802 54.0557 77.1562 53.9316 77.0031 53.9316L60.3371 53.9316C60.1841 53.9316 60.06 54.0557 60.06 54.2087V54.2087C60.06 54.3618 60.1841 54.4858 60.3371 54.4858L77.0031 54.4858C77.1562 54.4858 77.2802 54.3618 77.2802 54.2087V54.2087Z" fill="url(#paint21_linear_296_241)"></path>
      <path d="M77.2802 55.9112C77.2802 55.78 77.1739 55.6737 77.0427 55.6737L66.7966 55.6737C66.6654 55.6737 66.559 55.78 66.559 55.9112V55.9112C66.559 56.0424 66.6654 56.1487 66.7966 56.1487L77.0427 56.1487C77.1739 56.1487 77.2802 56.0424 77.2802 55.9112V55.9112Z" fill="url(#paint22_linear_296_241)"></path>
      <path d="M76.6167 56.9007C76.6167 56.8352 76.5636 56.782 76.498 56.782L70.7116 56.782C70.646 56.782 70.5928 56.8352 70.5928 56.9007V56.9007C70.5928 56.9663 70.646 57.0195 70.7116 57.0195L76.498 57.0195C76.5636 57.0195 76.6167 56.9663 76.6167 56.9007V56.9007Z" fill="url(#paint23_linear_296_241)"></path>
      <defs>
        <linearGradient id="paint0_linear_296_241" x1="0.000014085" y1="114.552" x2="3.51738" y2="88.9388" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint1_linear_296_241" x1="4.70603" y1="98.9557" x2="5.59463" y2="86.6838" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint2_linear_296_241" x1="13.2224" y1="90.0875" x2="13.9007" y2="80.17" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint3_linear_296_241" x1="18.8247" y1="82.7256" x2="19.2535" y2="75.317" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint4_linear_296_241" x1="24.2032" y1="76.4707" x2="24.3521" y2="72.364" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint5_linear_296_241" x1="28.6852" y1="72.275" x2="28.8187" y2="68.6423" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint6_linear_296_241" x1="36.0807" y1="68.475" x2="36.1555" y2="65.9467" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint7_linear_296_241" x1="43.4763" y1="65.7832" x2="43.5182" y2="64.0445" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint8_linear_296_241" x1="50.8716" y1="63.4081" x2="50.9069" y2="61.9855" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint9_linear_296_241" x1="60.06" y1="61.2703" x2="60.0974" y2="60.1644" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint10_linear_296_241" x1="66.559" y1="59.5294" x2="66.6032" y2="58.5825" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint11_linear_296_241" x1="70.5928" y1="58.42" x2="70.6124" y2="57.9464" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint12_linear_296_241" x1="0.0000446026" y1="0.650051" x2="3.51741" y2="26.263" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint13_linear_296_241" x1="4.70609" y1="16.2461" x2="5.59469" y2="28.518" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint14_linear_296_241" x1="13.2224" y1="25.1145" x2="13.9007" y2="35.032" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint15_linear_296_241" x1="18.8247" y1="32.4762" x2="19.2536" y2="39.8848" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint16_linear_296_241" x1="24.2032" y1="38.7311" x2="24.3521" y2="42.8378" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint17_linear_296_241" x1="28.6852" y1="42.9269" x2="28.8187" y2="46.5596" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint18_linear_296_241" x1="36.0807" y1="46.7269" x2="36.1555" y2="49.2552" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint19_linear_296_241" x1="43.4763" y1="49.4188" x2="43.5182" y2="51.1575" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint20_linear_296_241" x1="50.8716" y1="51.7952" x2="50.9069" y2="53.2177" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint21_linear_296_241" x1="60.06" y1="53.9316" x2="60.0974" y2="55.0375" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint22_linear_296_241" x1="66.559" y1="55.6737" x2="66.6032" y2="56.6206" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
        <linearGradient id="paint23_linear_296_241" x1="70.5928" y1="56.782" x2="70.6124" y2="57.2556" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(14, 28, 41)" offset="-0.68"></stop>
          <stop offset="1" stopColor="rgb(50, 61, 104)"></stop>
        </linearGradient>
      </defs>
    </svg>
  );

  return (
<div className="h-full relative overflow-hidden">
      <div className="w-full min-h-full mx-auto px-4 py-3  flex-col">
        {/* Main Title Section - Compact */}
        <div className="text-center mb-3">
          <h1 className="text-2xl font-bold text-gray-900 mb-1 font-antic">
            Stake RWA Tokens 
          </h1>
          <p className="text-xs text-gray-600 font-antic">
            Stake your RWA tokens and grow with Orion
          </p>
        </div>
 <div className="w-full h-[1000vh] px-10 py-3">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 p-1">
          {/* Card 1: Total RWA Value Locked */}
          <div className="bg-white rounded-lg shadow-md p-3 border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-1 text-gray-500 text-[10px] mb-0.5">
              <Info className="w-3 h-3" />
              <span className="font-antic uppercase tracking-wide">TVL Targeted</span>
            </div>
            <div className="text-xl font-bold text-gray-900 font-antic">
              $14,421,587
            </div>
          </div>

          {/* Card 2: Estimated APY with Decorative SVG */}
          <div className="bg-white rounded-lg shadow-md p-3 border border-gray-100 hover:shadow-lg transition-shadow relative overflow-hidden">
            {/* Decorative Stack SVG - positioned on the right */}
            <div className="absolute right-1 top-1/2 transform -translate-y-1/2 opacity-100 pointer-events-none">
              <DecorativeStack />
            </div>

            <div className="flex items-center gap-1 text-gray-500 text-[10px] mb-0.5 relative z-10">
              <TrendingUp className="w-3 h-3" />
              <span className="font-antic uppercase tracking-wide">Expected APY</span>
            </div>
            <div className="text-xl font-bold text-primary font-antic relative z-10">
              2.5%
            </div>
          </div>

          {/* Card 3: My Staked RWA */}
          <div className="bg-white rounded-lg shadow-md p-3 border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-1 text-gray-500 text-[10px] mb-0.5">
              <Shield className="w-3 h-3" />
              <span className="font-antic uppercase tracking-wide">My Staked RWA</span>
            </div>
            <div className="text-xl font-bold text-gray-900 font-antic">
              {formatBalance(stRwaBalance)} stRWA
            </div>
            {claimableYield > 0 && (
              <Button
                onClick={handleClaimYield}
                disabled={loading}
                className="mt-2 bg-green-600 hover:bg-green-700 text-white text-[9px] px-2 py-1 rounded-md font-antic"
              >
                Claim {usdcService.fromContractUnits(claimableYield)} USDC
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: Main Action Cards - Flexible */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-2.5 mb-2  ">
          {/* Left Card: Earn Rewards Info */}
          <div className="bg-white rounded-lg shadow-md p-5 border border-gray-100 hover:shadow-lg transition-shadow   justify-between flex flex-col">
  <div>
    <div className="flex items-center justify-center ">
                   <img src={grow} alt="Orion" className="w-8 h-8" />

    </div>
    <h2 className="text-sm font-bold text-gray-900 mb-2 text-center font-antic mt-1">
      Earn Rewards
    </h2>
    
    {/* --- LOOK HERE --- */}
    {/* 1. Added `flex flex-col` to make this a flex container.
      2. `items-center` now works, centering all <li> items.
    */}
    <ul className="space-y-1.5 flex flex-col items-center p-3">
      
      {/* I removed `text-center` from this span, as it's no longer needed */}
      <li className="flex items-center gap-1.5">
        <div className="w-1 h-1 bg-primary rounded-full mt-1 flex-shrink-0"></div>
        <span className="text-[10px] text-gray-700 font-antic leading-tight">
          Stake and grow your RWA token balance
        </span>
      </li>

      <li className="flex items-center gap-1.5">
        <div className="w-1 h-1 bg-primary rounded-full mt-1 flex-shrink-0"></div>
        <span className="text-[10px] text-gray-700 font-antic leading-tight">
          Receive rewards block by block
        </span>
      </li>

      {/* Changed `items-start` to `items-center` for consistency */}
      <li className="flex items-center gap-1.5">
        <div className="w-1 h-1 bg-primary rounded-full mt-1 flex-shrink-0"></div>
        <span className="text-[10px] text-gray-700 font-antic leading-tight">
          Unstake any time with no penalties
        </span>
      </li>
    </ul>
    {/* --- END OF FIX --- */}

  </div>

  <div className=" flex justify-center">
    <Button
      onClick={handleGetMockRWA}
      disabled={loading}
      className="bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white font-antic font-semibold px-3 py-1 rounded-lg tracking-wide transition-all flex items-center gap-3 mt-3 text-[10px]"
    >
      <Wallet className="w-2.5 h-2.5" />
      Get RWA Tokens
      <ArrowRight className="w-2.5 h-2.5" />
    </Button>
  </div>
</div>

          {/* Right Card: Stake/Unstake Component - Compact Uniswap Style */}
          <div className="bg-[#d8dfe5] rounded-[20px] p-2 hover:shadow-lg transition-shadow overflow-hidden">
            {/* Stake/Unstake Tabs */}
            <div className="flex border-b border-gray-300">
              <button
                onClick={() => setIsStakeMode(true)}
                className={`flex-1 py-1.5 text-center font-antic font-semibold transition-all text-[10px] ${
                  isStakeMode
                    ? "text-primary border-b-2 border-primary"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Stake
              </button>
              <button
                onClick={() => setIsStakeMode(false)}
                className={`flex-1 py-1.5 text-center font-antic font-semibold transition-all text-[10px] ${
                  !isStakeMode
                    ? "text-primary border-b-2 border-primary"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Unstake
              </button>
            </div>

            {/* Stake/Unstake Form */}
            <div className="p-2 flex-1 flex flex-col justify-between">
              {isStakeMode ? (
                // STAKE MODE
                <>
                  <div className="space-y-1.5">
                    {/* Upper Section - Stake Input */}
                    <div className="bg-gray-50 rounded-[16px] p-1.5">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                          <input
                            value={stakeAmount}
                            onChange={(e) => setStakeAmount(e.target.value)}
                            placeholder="0.00"
                            className="bg-transparent text-black text-base font-antic font-bold outline-none w-full tracking-tight"
                            type="number"
                          />
                          <div className="text-gray-500 text-[9px] mt-0.5 font-antic font-light">$0</div>
                        </div>

                        <div className="flex flex-col items-end gap-0.5">
                          <Select value={selectedVault} onValueChange={setSelectedVault}>
                            <SelectTrigger className="bg-white border border-gray-200 text-black rounded-lg h-7 w-24 font-inter hover:border-gray-300">
                              <div className="flex items-center gap-0.5">
                                <span className="text-xs">{selectedVaultData.emoji}</span>
                                <span className="font-antic font-semibold text-[9px]">{selectedVaultData.name}</span>
                              </div>
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-gray-200">
                              {vaults.map((vault) => (
                                <SelectItem key={vault.id} value={vault.id} className="hover:bg-gray-50">
                                  <div className="flex items-center gap-1 w-full">
                                    <span className="text-xs">{vault.emoji}</span>
                                    <span className="font-antic font-semibold text-[9px]">{vault.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Button
                            onClick={() => setStakeAmount(formatBalance(rwaBalance))}
                            className="bg-primary hover:bg-primary/90 text-white text-[9px] px-1.5 py-0 h-3.5 rounded-md font-antic font-bold tracking-wide"
                          >
                            MAX
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-0.5 text-gray-500 text-[9px]">
                        <Wallet className="w-2 h-2" />
                        <span className="font-antic font-medium">Balance: {formatBalance(rwaBalance)} RWA</span>
                      </div>
                    </div>

                    {/* Arrow Button */}
                    <div className="flex justify-center py-0.5">
                      <button className="bg-white border border-gray-200 rounded-lg p-1 hover:border-gray-300 transition-colors">
                        <ArrowDown className="w-2.5 h-2.5 text-gray-400" />
                      </button>
                    </div>

                    {/* Lower Section - Receive */}
                    <div className="bg-gray-50 rounded-[16px] p-1.5">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                          <div className="text-black text-sm font-antic font-bold tracking-tight">
                            {calculateReceiveAmount(stakeAmount)}
                          </div>
                          <div className="text-gray-500 text-[9px] mt-0.5 font-antic font-light">You Will Receive</div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg h-7 px-1.5 flex items-center">
                          <div className="flex items-center gap-0.5 text-black">
                            <span className="text-xs">⭐</span>
                            <span className="font-antic font-semibold text-[9px]">{platformTokenName}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleStake}
                    disabled={!stakeAmount || loading}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-antic font-bold py-2 text-xs rounded-[16px] flex items-center justify-center gap-1.5 tracking-wide mt-4"
                  >
                    {loading ? (
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                      <>
                        Stake Assets
                        <ArrowRight className="w-2.5 h-2.5" />
                      </>
                    )}
                  </Button>
                </>
              ) : (
                // UNSTAKE MODE
                <>
                  <div className="space-y-1.5">
                    <div className="bg-gray-50 rounded-[16px] p-1.5">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                          <input
                            value={unstakeAmount}
                            onChange={(e) => setUnstakeAmount(e.target.value)}
                            placeholder="0.00"
                            className="bg-transparent text-black text-base font-antic font-bold outline-none w-full tracking-tight"
                            type="number"
                          />
                          <div className="text-gray-500 text-[9px] mt-0.5 font-antic font-light">$0</div>
                        </div>

                        <div className="flex flex-col items-end gap-0.5">
                          <div className="bg-white border border-gray-200 rounded-lg h-7 px-1.5 flex items-center">
                            <div className="flex items-center gap-0.5 text-black">
                              <span className="text-xs">⭐</span>
                              <span className="font-antic font-semibold text-[9px]">{platformTokenName}</span>
                            </div>
                          </div>

                          <Button
                            onClick={() => setUnstakeAmount(formatBalance(stRwaBalance))}
                            className="bg-primary hover:bg-primary/90 text-white text-[9px] px-1.5 py-0 h-3.5 rounded-md font-antic font-bold tracking-wide"
                          >
                            MAX
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-0.5 text-gray-500 text-[9px]">
                        <Shield className="w-2 h-2" />
                        <span className="font-antic font-medium">Staked: {formatBalance(stRwaBalance)} stRWA</span>
                      </div>
                    </div>

                    {/* Arrow Button */}
                    <div className="flex justify-center py-0.5">
                      <button className="bg-white border border-gray-200 rounded-lg p-1 hover:border-gray-300 transition-colors">
                        <ArrowDown className="w-2.5 h-2.5 text-gray-400" />
                      </button>
                    </div>

                    <div className="bg-gray-50 rounded-[16px] p-1.5">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                          <div className="text-black text-sm font-antic font-bold tracking-tight">
                            {(parseFloat(unstakeAmount || "0") * 1.05).toFixed(2)}
                          </div>
                          <div className="text-gray-500 text-[9px] mt-0.5 font-antic font-light">You Will Receive</div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg h-7 px-1.5 flex items-center">
                          <div className="flex items-center gap-0.5 text-black">
                            <span className="text-xs">{selectedVaultData.emoji}</span>
                            <span className="font-antic font-semibold text-[9px]">{selectedVaultData.name}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleUnstake}
                    disabled={!unstakeAmount || loading}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-antic font-bold py-2 text-xs rounded-[16px] flex items-center justify-center gap-1.5 tracking-wide mt-4"
                  >
                    {loading ? (
                      <RefreshCw className="w-2.5 h-2.5 animate-spin " />
                    ) : (
                      <>
                        Unstake Assets
                        <ArrowRight className="w-2.5 h-2.5" />
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Why Stake Section - Compact */}
        <div className="bg-white rounded-lg shadow-md p-5 border border-gray-100 hover:shadow-lg transition-shadow">
          <h2 className="text-sm font-bold text-gray-900 font-antic mb-1.5">Why Stake?</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Feature 1: Real-World Backing */}
            <div className="flex gap-1.5">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center">
                  <Shield className="w-3 h-3 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-gray-900 mb-0.5 font-antic leading-tight">Real-World Backing</h3>
                <p className="text-[9px] text-gray-600 font-antic leading-tight">
                  Tokens backed by tangible assets
                </p>
              </div>
            </div>

            {/* Feature 2: No Lockup Period */}
            <div className="flex gap-1.5">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center">
                  <Lock className="w-3 h-3 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-gray-900 mb-0.5 font-antic leading-tight">No Lockup Period</h3>
                <p className="text-[9px] text-gray-600 font-antic leading-tight">
                  Unstake anytime without penalties
                </p>
              </div>
            </div>

            {/* Feature 3: Participate in Governance */}
            <div className="flex gap-1.5">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center">
                  <Vote className="w-3 h-3 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-gray-900 mb-0.5 font-antic leading-tight">Governance Voting</h3>
                <p className="text-[9px] text-gray-600 font-antic leading-tight">
                  Shape the future through voting
                </p>
              </div>
            </div>

            {/* Feature 4: Future Utility */}
            <div className="flex gap-1.5">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center">
                  <Zap className="w-3 h-3 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-gray-900 mb-0.5 font-antic leading-tight">Future Utility</h3>
                <p className="text-[9px] text-gray-600 font-antic leading-tight">
                  Unlock benefits through staking
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-gray-400 text-[9px] font-antic">
          <div className="flex-1"></div>
          <div className="flex items-center gap-3">
            <span className="hover:text-gray-600 cursor-pointer transition-colors">Interface</span>
            <span className="hover:text-gray-600 cursor-pointer transition-colors">Terms of Use</span>
            <span className="hover:text-gray-600 cursor-pointer transition-colors">Documentation</span>
            <span className="hover:text-gray-600 cursor-pointer transition-colors">FAQ</span>
          </div>
          <div className="flex-1 flex justify-end">
            <span>©Orion 2025</span>
          </div>
        </div>
      </div></div>
        {/* Row 1: Top Stat Cards - Compact */}

    </div>
  );
};

export default StakeSection;
