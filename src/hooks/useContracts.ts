import { useContext, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WalletContext } from '@/providers/WalletProvider';
import {
  createVaultService,
  createLendingPoolService,
  createMockRWAService,
  createOracleService,
  type TransactionResult,
  type Vault,
  type LoanInfo,
  type PriceData
} from '@/services/contracts';

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const useVaultService = () => {
  const wallet = useWallet();
  
  return useMemo(() => {
    return createVaultService(wallet.isConnected ? wallet : undefined);
  }, [wallet.isConnected, wallet.address, wallet.networkPassphrase]);
};

export const useLendingPoolService = () => {
  const wallet = useWallet();
  
  return useMemo(() => {
    return createLendingPoolService(wallet.isConnected ? wallet : undefined);
  }, [wallet.isConnected, wallet.address, wallet.networkPassphrase]);
};

export const useMockRWAService = () => {
  const wallet = useWallet();
  
  return useMemo(() => {
    return createMockRWAService(wallet.isConnected ? wallet : undefined);
  }, [wallet.isConnected, wallet.address, wallet.networkPassphrase]);
};

export const useOracleService = () => {
  const wallet = useWallet();
  
  return useMemo(() => {
    return createOracleService(wallet.isConnected ? wallet : undefined);
  }, [wallet.isConnected, wallet.address, wallet.networkPassphrase]);
};

// Vault Hooks
// TODO: These hooks use placeholder method names. Update when backend is ready.
// export const useAvailableVaults = () => {
//   const vaultService = useVaultService();
//
//   return useQuery({
//     queryKey: ['vaults', 'available'],
//     queryFn: () => vaultService.getAvailableVaults(),
//     staleTime: 30000, // 30 seconds
//     refetchInterval: 60000, // 1 minute
//   });
// };

// export const useUserStakedBalance = (userAddress?: string) => {
//   const vaultService = useVaultService();
//
//   return useQuery({
//     queryKey: ['vault', 'stakedBalance', userAddress],
//     queryFn: () => userAddress ? vaultService.getUserStakedBalance(userAddress) : Promise.resolve(BigInt(0)),
//     enabled: Boolean(userAddress),
//     staleTime: 10000, // 10 seconds
//     refetchInterval: 15000, // 15 seconds
//   });
// };

export const useClaimableYield = (userAddress?: string) => {
  const vaultService = useVaultService();

  return useQuery({
    queryKey: ['vault', 'claimableYield', userAddress],
    queryFn: () => userAddress ? vaultService.claimable_yield(userAddress) : Promise.resolve(BigInt(0)),
    enabled: Boolean(userAddress),
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // 10 seconds
  });
};

export const useStakeMutation = () => {
  const vaultService = useVaultService();
  const queryClient = useQueryClient();
  const wallet = useWallet();
  
  return useMutation({
    mutationFn: async ({ amount }: { amount: bigint }) => {
      if (!wallet.address) throw new Error('Wallet not connected');
      return vaultService.stake(wallet.address, amount);
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['vault'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'balances'] });
    },
  });
};

export const useUnstakeMutation = () => {
  const vaultService = useVaultService();
  const queryClient = useQueryClient();
  const wallet = useWallet();
  
  return useMutation({
    mutationFn: async ({ amount }: { amount: bigint }) => {
      if (!wallet.address) throw new Error('Wallet not connected');
      return vaultService.unstake(wallet.address, amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'balances'] });
    },
  });
};

// Lending Pool Hooks
// TODO: These hooks use placeholder method names. Update when backend is ready.
// export const useUserLoans = (userAddress?: string) => {
//   const lendingService = useLendingPoolService();
//
//   return useQuery({
//     queryKey: ['lending', 'userLoans', userAddress],
//     queryFn: () => userAddress ? lendingService.getUserLoans(userAddress) : Promise.resolve([]),
//     enabled: Boolean(userAddress),
//     staleTime: 10000,
//     refetchInterval: 15000,
//   });
// };

// export const useHealthFactor = (userAddress?: string) => {
//   const lendingService = useLendingPoolService();
//
//   return useQuery({
//     queryKey: ['lending', 'healthFactor', userAddress],
//     queryFn: () => userAddress ? lendingService.getHealthFactor(userAddress) : Promise.resolve(0),
//     enabled: Boolean(userAddress),
//     staleTime: 5000,
//     refetchInterval: 10000,
//   });
// };

// export const useBorrowMutation = () => {
//   const lendingService = useLendingPoolService();
//   const queryClient = useQueryClient();
//   const wallet = useWallet();
//
//   return useMutation({
//     mutationFn: async ({ asset, amount }: { asset: string; amount: bigint }) => {
//       if (!wallet.address) throw new Error('Wallet not connected');
//       return lendingService.borrow(wallet.address, asset, amount);
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['lending'] });
//       queryClient.invalidateQueries({ queryKey: ['user', 'balances'] });
//     },
//   });
// };

// Mock RWA Hooks
// TODO: These hooks use placeholder method names. Update when backend is ready.
// export const useUserBalance = (userAddress?: string) => {
//   const mockRWAService = useMockRWAService();
//
//   return useQuery({
//     queryKey: ['mockRWA', 'balance', userAddress],
//     queryFn: () => userAddress ? mockRWAService.balance(userAddress) : Promise.resolve(BigInt(0)),
//     enabled: Boolean(userAddress),
//     staleTime: 10000,
//     refetchInterval: 30000,
//   });
// };

// export const useMintMockRWA = () => {
//   const mockRWAService = useMockRWAService();
//   const queryClient = useQueryClient();
//   const wallet = useWallet();
//
//   return useMutation({
//     mutationFn: async ({ amount }: { amount: bigint }) => {
//       if (!wallet.address) throw new Error('Wallet not connected');
//       return mockRWAService.mint(wallet.address, amount);
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['mockRWA'] });
//       queryClient.invalidateQueries({ queryKey: ['user', 'balances'] });
//     },
//   });
// };

// Oracle Hooks
export const useAssetPrice = (assetAddress: string) => {
  const oracleService = useOracleService();

  return useQuery({
    queryKey: ['oracle', 'price', assetAddress],
    queryFn: () => oracleService.get_price(assetAddress),
    staleTime: 5000,
    refetchInterval: 10000, // Price updates every 10 seconds
    enabled: Boolean(assetAddress),
  });
};

export const usePriceData = (assetAddress: string) => {
  const oracleService = useOracleService();

  return useQuery({
    queryKey: ['oracle', 'priceData', assetAddress],
    queryFn: () => oracleService.get_price_data(assetAddress),
    staleTime: 5000,
    refetchInterval: 10000,
    enabled: Boolean(assetAddress),
  });
};