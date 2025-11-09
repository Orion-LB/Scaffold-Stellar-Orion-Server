import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import {
  TrendingUp,
  Shield,
  DollarSign,
  Wallet,
  Download,
  AlertTriangle
} from "lucide-react";
import { useContractServices } from "@/hooks/useContractServices";
import { toast } from "sonner";
import {
  AssetType,
  getAllAssetTypes,
  getAssetConfig,
  createMockRWAServiceFromAddress,
  createStRWAServiceFromAddress,
  createVaultServiceFromAddress
} from "@/services/contracts";

const ProfileSection = () => {
  const [autoRepayEnabled, setAutoRepayEnabled] = useState(true);

  // Multi-asset balances
  const [assetBalances, setAssetBalances] = useState<Record<AssetType, {
    rwaBalance: bigint;
    stRwaBalance: bigint;
    claimableYield: bigint;
    price: number; // USD price
  }>>({
    [AssetType.INVOICES]: { rwaBalance: 0n, stRwaBalance: 0n, claimableYield: 0n, price: 1.05 },
    [AssetType.TBILLS]: { rwaBalance: 0n, stRwaBalance: 0n, claimableYield: 0n, price: 1.02 },
    [AssetType.REALESTATE]: { rwaBalance: 0n, stRwaBalance: 0n, claimableYield: 0n, price: 1.08 },
  });

  const [usdcBalance, setUsdcBalance] = useState<bigint>(0n);
  const [activeLoan, setActiveLoan] = useState<any>(null);

  const {
    isConnected,
    address,
    usdcService,
    lendingPoolService,
  } = useContractServices();

  // Load data from contracts
  useEffect(() => {
    if (!isConnected || !address) return;

    const loadData = async () => {
      try {
        // Load USDC balance
        const usdc = await usdcService.balance(address);
        setUsdcBalance(usdc);

        // Load loan data
        const loan = await lendingPoolService.get_loan(address).catch(() => null);
        setActiveLoan(loan);

        // Load balances for each asset type
        for (const assetType of getAllAssetTypes()) {
          const config = getAssetConfig(assetType);

          const rwaService = createMockRWAServiceFromAddress(config.rwa);
          const stRwaService = createStRWAServiceFromAddress(config.stRwa);
          const vaultService = createVaultServiceFromAddress(config.vault);

          const [rwa, stRwa, yield_amount] = await Promise.all([
            rwaService.balance(address),
            stRwaService.balance(address),
            vaultService.claimable_yield(address).catch(() => 0n),
          ]);

          setAssetBalances(prev => ({
            ...prev,
            [assetType]: {
              ...prev[assetType],
              rwaBalance: rwa,
              stRwaBalance: stRwa,
              claimableYield: yield_amount,
            }
          }));
        }
      } catch (error) {
        console.error("Failed to load profile data:", error);
      }
    };

    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [isConnected, address, usdcService, lendingPoolService]);

  // Helper functions
  const formatBalance = (balance: bigint, decimals: number = 18) => {
    return (Number(balance) / Math.pow(10, decimals)).toFixed(2);
  };

  const formatUSD = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculate portfolio values
  const calculatePortfolioValues = () => {
    let totalStaked = 0;
    let totalAvailable = 0;

    getAllAssetTypes().forEach(assetType => {
      const data = assetBalances[assetType];
      const stRwaAmount = parseFloat(formatBalance(data.stRwaBalance));
      const rwaAmount = parseFloat(formatBalance(data.rwaBalance));

      totalStaked += stRwaAmount * data.price;
      totalAvailable += rwaAmount; // RWA at $1
    });

    const usdcValue = parseFloat(formatBalance(usdcBalance, 7));
    const totalValue = totalStaked + totalAvailable + usdcValue;

    return { totalStaked, totalAvailable, usdcValue, totalValue };
  };

  const { totalStaked, totalAvailable, usdcValue, totalValue } = calculatePortfolioValues();

  // Portfolio pie chart data
  const portfolioData = [
    { name: 'Staked (stRWA)', value: parseFloat(totalStaked.toFixed(2)), color: '#774be5' },
    { name: 'Available (RWA)', value: parseFloat(totalAvailable.toFixed(2)), color: '#10b981' },
    { name: 'Liquidity (USDC)', value: parseFloat(usdcValue.toFixed(2)), color: '#f59e0b' }
  ].filter(item => item.value > 0);

  // Calculate health factor
  const calculateHealthFactor = () => {
    if (!activeLoan || !activeLoan.collaterals || activeLoan.collaterals.length === 0) return 0;

    let totalCollateralValue = 0;

    activeLoan.collaterals.forEach((col: any) => {
      // Find which asset this collateral belongs to
      const assetType = getAllAssetTypes().find(type => {
        const config = getAssetConfig(type);
        return config.stRwa === col.token_address;
      });

      if (assetType) {
        const data = assetBalances[assetType];
        const collateralAmount = parseFloat(formatBalance(col.amount));
        totalCollateralValue += collateralAmount * data.price;
      }
    });

    const debtValue = parseFloat(formatBalance(activeLoan.outstanding_debt || 0n, 7));
    if (debtValue === 0) return 0;

    return totalCollateralValue / debtValue;
  };

  const healthFactor = calculateHealthFactor();
  const totalDebt = activeLoan ? parseFloat(formatBalance(activeLoan.outstanding_debt || 0n, 7)) : 0;

  // Performance graph data (mock for now)
  const performanceData = [
    { month: 'Jan', value: totalValue * 0.85 },
    { month: 'Feb', value: totalValue * 0.90 },
    { month: 'Mar', value: totalValue * 0.93 },
    { month: 'Apr', value: totalValue * 0.97 },
    { month: 'May', value: totalValue * 0.99 },
    { month: 'Jun', value: totalValue }
  ];

  // Claim yield for specific vault
  const handleClaimYield = async (assetType: AssetType) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return;
    }

    const data = assetBalances[assetType];
    if (data.claimableYield <= 0n) {
      toast.error("No yield available to claim");
      return;
    }

    try {
      const config = getAssetConfig(assetType);
      const vaultService = createVaultServiceFromAddress(config.vault);

      await vaultService.claim_yield(address);
      toast.success(`Claimed ${config.displayName} yield!`);

      // Refresh balances
      const [yield_amount, usdc] = await Promise.all([
        vaultService.claimable_yield(address).catch(() => 0n),
        usdcService.balance(address),
      ]);

      setAssetBalances(prev => ({
        ...prev,
        [assetType]: { ...prev[assetType], claimableYield: yield_amount }
      }));
      setUsdcBalance(usdc);
    } catch (error: any) {
      console.error("Claim failed:", error);
      toast.error(error.message || "Claim failed");
    }
  };

  // Claim all yields
  const handleClaimAllYields = async () => {
    let claimedCount = 0;

    for (const assetType of getAllAssetTypes()) {
      const data = assetBalances[assetType];
      if (data.claimableYield > 0n) {
        try {
          await handleClaimYield(assetType);
          claimedCount++;
        } catch (error) {
          console.error(`Failed to claim ${assetType}:`, error);
        }
      }
    }

    if (claimedCount > 0) {
      toast.success(`Claimed yield from ${claimedCount} vault(s)!`);
    } else {
      toast.info("No yields available to claim");
    }
  };

  // Show connect wallet message if not connected
  if (!isConnected) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600">Please connect your wallet to view your profile</p>
        </div>
      </div>
    );
  }

  const totalYield = getAllAssetTypes().reduce((sum, type) => {
    return sum + parseFloat(formatBalance(assetBalances[type].claimableYield, 7));
  }, 0);

  return (
    <div className="h-full overflow-auto bg-[#d8dfe5] rounded-[24px] flex flex-col h-full p-3">
      {/* Header */}
      <div className="border-b border-gray-200 px-10 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-plus-jakarta text-xl font-semibold text-gray-900">
              Portfolio Overview
            </h1>
            <p className="font-plus-jakarta text-sm text-gray-600 mt-1">
              Your financial snapshot at a glance
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Connected</div>
            <code className="text-xs font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </code>
          </div>
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="grid grid-cols-[60%_40%] gap-6 px-6 py-6">

        {/* LEFT COLUMN */}
        <div className="space-y-6">

          {/* Portfolio Performance - Top Card */}
          <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
            {/* Header with Total Value on Right */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-plus-jakarta text-lg font-semibold text-gray-900">Portfolio Performance</h3>
                  <p className="text-xs text-gray-600">30-day trend</p>
                </div>
              </div>

              {/* Total Portfolio Value - Top Right */}
              <div className="text-right">
                <div className="text-xs text-gray-600 font-plus-jakarta mb-1">Total Value</div>
                <div className="font-antic text-3xl font-bold text-gray-900">
                  {formatUSD(totalValue)}
                </div>
                <div className="flex items-center justify-end gap-1 text-green-600 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  <span className="font-plus-jakarta text-xs">+2.5% this month</span>
                </div>
              </div>
            </div>

            {/* Area Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#774be5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#774be5" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    stroke="#e5e7eb"
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    stroke="#e5e7eb"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatUSD(value)}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#774be5"
                    strokeWidth={3}
                    fill="url(#performanceGradient)"
                    dot={{ fill: '#774be5', strokeWidth: 2, r: 5, stroke: 'white' }}
                    activeDot={{ r: 7 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Portfolio Distribution Legend */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4">
                {portfolioData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                    <div>
                      <div className="text-xs font-plus-jakarta text-gray-600">{entry.name}</div>
                      <div className="text-sm font-plus-jakarta font-semibold text-gray-900">
                        {formatUSD(entry.value)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Asset Breakdown Table */}
          <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
            <h3 className="font-plus-jakarta text-lg font-semibold text-gray-900 mb-4">Asset Breakdown</h3>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Asset Type</div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide text-right">Balance</div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide text-right">Value</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200">
                {getAllAssetTypes().map(assetType => {
                  const config = getAssetConfig(assetType);
                  const data = assetBalances[assetType];
                  const stRwaAmount = parseFloat(formatBalance(data.stRwaBalance));
                  const value = stRwaAmount * data.price;

                  if (stRwaAmount === 0) return null;

                  return (
                    <div key={assetType} className="grid grid-cols-[2fr_1fr_1fr] gap-4 px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{config.emoji}</span>
                        <span className="text-sm font-plus-jakarta text-gray-900">{config.shortName}</span>
                      </div>
                      <div className="text-sm font-plus-jakarta text-gray-900 text-right">{stRwaAmount.toFixed(2)}</div>
                      <div className="text-sm font-plus-jakarta font-semibold text-gray-900 text-right">{formatUSD(value)}</div>
                    </div>
                  );
                })}

                {/* USDC Row */}
                <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-plus-jakarta text-gray-900">USDC</span>
                  </div>
                  <div className="text-sm font-plus-jakarta text-gray-900 text-right">{formatBalance(usdcBalance, 7)}</div>
                  <div className="text-sm font-plus-jakarta font-semibold text-gray-900 text-right">{formatUSD(usdcValue)}</div>
                </div>

                {/* Total Row */}
                <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 px-4 py-3 bg-gray-50 font-semibold">
                  <div className="text-sm font-plus-jakarta text-gray-900">Total</div>
                  <div></div>
                  <div className="text-sm font-plus-jakarta text-gray-900 text-right">{formatUSD(totalValue)}</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6 px-4">

          {/* Risk Dashboard */}
          <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-plus-jakarta text-lg font-semibold text-gray-900">Risk & Loans</h3>
                <p className="text-xs text-gray-600">Health status</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={`text-center p-4 rounded-lg border-2 ${
                healthFactor === 0
                  ? 'border-gray-200 bg-gray-50'
                  : healthFactor >= 1.5
                  ? 'border-green-200 bg-green-50'
                  : healthFactor >= 1.2
                  ? 'border-yellow-200 bg-yellow-50'
                  : 'border-red-200 bg-red-50'
              }`}>
                <div className={`font-antic text-3xl font-bold mb-1 ${
                  healthFactor === 0
                    ? 'text-gray-600'
                    : healthFactor >= 1.5
                    ? 'text-green-600'
                    : healthFactor >= 1.2
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}>
                  {healthFactor === 0 ? 'N/A' : healthFactor.toFixed(2)}
                </div>
                <div className="text-xs text-gray-700 font-plus-jakarta">Health Factor</div>
              </div>

              <div className={`text-center p-4 rounded-lg border-2 ${
                totalDebt === 0 ? 'border-gray-200 bg-gray-50' : 'border-orange-200 bg-orange-50'
              }`}>
                <div className="font-antic text-3xl font-bold text-gray-900 mb-1">
                  {totalDebt === 0 ? 'None' : formatUSD(totalDebt)}
                </div>
                <div className="text-xs text-gray-700 font-plus-jakarta">Total Debt</div>
              </div>
            </div>

            {healthFactor > 0 && healthFactor < 1.5 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-xs text-yellow-800">
                  <div className="font-semibold mb-1">Health Factor Low</div>
                  <div>Liquidation occurs at 1.10. Consider adding collateral or repaying debt.</div>
                </div>
              </div>
            )}

            {totalDebt > 0 && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-semibold ${
                    healthFactor >= 1.5 ? 'text-green-600' : healthFactor >= 1.2 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {healthFactor >= 1.5 ? '🟢 Safe' : healthFactor >= 1.2 ? '🟡 Warning' : '🔴 At Risk'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Liquidation at:</span>
                  <span className="font-semibold text-gray-900">1.10</span>
                </div>
              </div>
            )}
          </div>

          {/* Yield Earnings */}
          <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-plus-jakarta text-lg font-semibold text-gray-900">Yield Earnings</h3>
                <p className="text-xs text-gray-600">Available to claim</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="font-antic text-3xl font-bold text-gray-900 mb-1">
                {formatUSD(totalYield)}
              </div>
              <div className="text-sm text-gray-600">Total Available</div>
            </div>

            {/* Vault-specific yields */}
            <div className="space-y-3 mb-4">
              {getAllAssetTypes().map(assetType => {
                const config = getAssetConfig(assetType);
                const data = assetBalances[assetType];
                const yieldAmount = parseFloat(formatBalance(data.claimableYield, 7));

                // Only show vaults where user has staked
                if (data.stRwaBalance === 0n) return null;

                return (
                  <div key={assetType} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{config.emoji}</span>
                        <div>
                          <div className="text-sm font-plus-jakarta font-semibold text-gray-900">
                            {config.displayName}
                          </div>
                          <div className="text-xs text-gray-600">
                            Staked: {formatBalance(data.stRwaBalance)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-600">Available</div>
                        <div className="text-lg font-antic font-bold text-green-600">
                          {formatUSD(yieldAmount)}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleClaimYield(assetType)}
                        disabled={yieldAmount === 0}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-plus-jakarta"
                      >
                        Claim
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalYield > 0 && (
              <Button
                onClick={handleClaimAllYields}
                className="w-full bg-primary hover:bg-primary/90 font-plus-jakarta"
              >
                Claim All Yields
              </Button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
            <h3 className="font-plus-jakarta text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-plus-jakarta font-medium text-gray-900">Auto-Repay</div>
                  <div className="text-xs text-gray-600">Use yield to auto-pay loans</div>
                </div>
                <Switch
                  checked={autoRepayEnabled}
                  onCheckedChange={setAutoRepayEnabled}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                  <div className="text-sm font-plus-jakarta font-medium text-gray-900">Export Portfolio</div>
                  <div className="text-xs text-gray-600">Download CSV or PDF</div>
                </div>
                <Download className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ProfileSection;
