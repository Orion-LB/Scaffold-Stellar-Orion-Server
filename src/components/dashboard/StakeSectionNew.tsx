import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowRight, Wallet, TrendingUp, Shield, RefreshCw, Info } from "lucide-react";
import { useContractServices } from "@/hooks/useContractServices";
import { toast } from "sonner";
import { CONTRACT_ADDRESSES } from "@/services/contracts";
import { ensureWhitelisted } from "@/utils/adminWhitelist";

const StakeSectionNew = () => {
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [isStakeMode, setIsStakeMode] = useState(true);

  // Balances
  const [rwaBalance, setRwaBalance] = useState<bigint>(BigInt(0));
  const [stRwaBalance, setStRwaBalance] = useState<bigint>(BigInt(0));
  const [claimableYield, setClaimableYield] = useState<bigint>(BigInt(0));
  const [isWhitelisted, setIsWhitelisted] = useState(false);

  const {
    isConnected,
    address,
    rwaService,
    stRwaService,
    vaultService,
  } = useContractServices();

  // Load user balances and status
  useEffect(() => {
    if (!isConnected || !address) return;

    const loadBalances = async () => {
      try {
        const [rwa, stRwa, yield_amount, whitelisted] = await Promise.all([
          rwaService.balance(address),
          stRwaService.balance(address),
          vaultService.claimable_yield(address).catch(() => BigInt(0)),
          rwaService.allowed(address),
        ]);

        setRwaBalance(rwa);
        setStRwaBalance(stRwa);
        setClaimableYield(yield_amount);
        setIsWhitelisted(whitelisted);
      } catch (error) {
        console.error("Failed to load balances:", error);
      }
    };

    loadBalances();
    const interval = setInterval(loadBalances, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [isConnected, address, rwaService, stRwaService, vaultService]);

  // Whitelist user (admin operation)
  const handleWhitelist = async () => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    setLoading(true);
    try {
      const result = await ensureWhitelisted(address);

      if (result.isWhitelisted) {
        toast.success("Your address is already whitelisted!");
        setIsWhitelisted(true);
      } else {
        toast.info(result.message || "Whitelisting requires admin approval. Contact the team on Discord.");
      }
    } catch (error: any) {
      console.error("Whitelisting check failed:", error);
      toast.error(error.message || "Failed to check whitelist status");
    } finally {
      setLoading(false);
    }
  };

  // Approve RWA tokens for Vault
  const handleApproveRWA = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return;
    }

    const amount = BigInt(Math.floor(parseFloat(stakeAmount || "0") * 1e18));
    if (amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const result = await rwaService.approve(
        address,
        CONTRACT_ADDRESSES.RWA_VAULT_A,
        amount
      );

      if (result.success) {
        toast.success("RWA tokens approved successfully!");
        return true;
      } else {
        toast.error("Approval failed");
        return false;
      }
    } catch (error: any) {
      console.error("Approval failed:", error);
      toast.error(error.message || "Approval failed");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Stake RWA tokens
  const handleStake = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!isWhitelisted) {
      toast.error("Your address must be whitelisted first. Click 'Get Whitelisted' button.");
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
      const approved = await handleApproveRWA();
      if (!approved) return;

      // Step 2: Stake
      toast.info("Step 2/2: Staking RWA tokens...");
      const result = await vaultService.stake(address, amount);

      if (result.success) {
        toast.success(`Successfully staked ${rwaService.fromContractUnits(amount)} RWA!`);
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

  // Unstake stRWA tokens
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
        toast.success(`Successfully unstaked ${stRwaService.fromContractUnits(amount)} stRWA!`);
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

  // Claim yield
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
        toast.success("Yield claimed successfully!");

        // Refresh balances
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

  const formatBalance = (balance: bigint, decimals: number = 18) => {
    return (Number(balance) / Math.pow(10, decimals)).toFixed(2);
  };

  if (!isConnected) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600">Please connect your wallet to start staking</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto px-6 py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Stake RWA Tokens</h1>
          <p className="text-gray-600">Stake your RWA tokens to earn stRWA and yield</p>
        </div>

        {/* Whitelist Warning */}
        {!isWhitelisted && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-yellow-900 mb-1">Whitelisting Required</h3>
                <p className="text-sm text-yellow-800 mb-3">
                  Your address needs to be whitelisted before you can stake RWA tokens.
                  Contact the team on Discord for whitelisting.
                </p>
                <Button
                  onClick={handleWhitelist}
                  disabled={loading}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm"
                >
                  Request Whitelist
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <Wallet className="w-4 h-4" />
              <span>RWA Balance</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatBalance(rwaBalance)} RWA
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <Shield className="w-4 h-4" />
              <span>Staked Balance</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatBalance(stRwaBalance)} stRWA
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <TrendingUp className="w-4 h-4" />
              <span>Claimable Yield</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatBalance(claimableYield, 7)} USDC
            </div>
            {claimableYield > 0 && (
              <Button
                onClick={handleClaimYield}
                disabled={loading}
                size="sm"
                className="mt-2 w-full"
              >
                Claim Yield
              </Button>
            )}
          </div>
        </div>

        {/* Stake/Unstake Interface */}
        <div className="bg-white rounded-lg shadow-md p-6 border">
          {/* Tabs */}
          <div className="flex border-b mb-6">
            <button
              onClick={() => setIsStakeMode(true)}
              className={`flex-1 py-3 font-semibold transition-all ${
                isStakeMode
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Stake
            </button>
            <button
              onClick={() => setIsStakeMode(false)}
              className={`flex-1 py-3 font-semibold transition-all ${
                !isStakeMode
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Unstake
            </button>
          </div>

          {isStakeMode ? (
            /* STAKE MODE */
            <div className="space-y-4">
              {/* Input Card */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">You Stake</span>
                  <span className="text-sm text-gray-600">
                    Balance: {formatBalance(rwaBalance)} RWA
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 bg-transparent text-3xl font-bold outline-none"
                    type="number"
                  />
                  <Button
                    onClick={() => setStakeAmount(formatBalance(rwaBalance))}
                    size="sm"
                    variant="outline"
                  >
                    MAX
                  </Button>
                  <div className="px-4 py-2 bg-white rounded-lg border">
                    <span className="font-semibold">RWA</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <ArrowDown className="w-6 h-6 text-gray-400" />
              </div>

              {/* Output Card */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">You Receive</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-3xl font-bold">
                    {stakeAmount || "0.00"}
                  </div>
                  <div className="px-4 py-2 bg-white rounded-lg border">
                    <span className="font-semibold">stRWA</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleStake}
                disabled={!stakeAmount || loading || !isWhitelisted}
                className="w-full py-6 text-lg"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Stake RWA
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* UNSTAKE MODE */
            <div className="space-y-4">
              {/* Input Card */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">You Unstake</span>
                  <span className="text-sm text-gray-600">
                    Staked: {formatBalance(stRwaBalance)} stRWA
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    value={unstakeAmount}
                    onChange={(e) => setUnstakeAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 bg-transparent text-3xl font-bold outline-none"
                    type="number"
                  />
                  <Button
                    onClick={() => setUnstakeAmount(formatBalance(stRwaBalance))}
                    size="sm"
                    variant="outline"
                  >
                    MAX
                  </Button>
                  <div className="px-4 py-2 bg-white rounded-lg border">
                    <span className="font-semibold">stRWA</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <ArrowDown className="w-6 h-6 text-gray-400" />
              </div>

              {/* Output Card */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">You Receive</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-3xl font-bold">
                    {unstakeAmount || "0.00"}
                  </div>
                  <div className="px-4 py-2 bg-white rounded-lg border">
                    <span className="font-semibold">RWA</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleUnstake}
                disabled={!unstakeAmount || loading}
                className="w-full py-6 text-lg"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Unstake stRWA
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StakeSectionNew;
