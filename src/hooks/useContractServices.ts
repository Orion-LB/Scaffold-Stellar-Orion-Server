import { useContext, useMemo } from 'react';
import { WalletContext } from '@/providers/WalletProvider';
import {
  createVaultService,
  createLendingPoolService,
  createOracleService,
  createMockRWAService,
  createUSDCService,
  createStakedRWAService,
} from '@/services/contracts';
import type { StellarWalletProvider } from '@/services/contracts/ContractService';

/**
 * Custom hook to access all contract services with wallet integration
 *
 * Usage:
 * ```tsx
 * const { vaultService, lendingPoolService, rwaService, isConnected } = useContractServices();
 *
 * // Call contract methods
 * const balance = await rwaService.balance(address);
 * await vaultService.stake(address, amount); // Automatically uses connected wallet
 * ```
 */
export function useContractServices() {
  const wallet = useContext(WalletContext);

  // Create wallet provider object if connected
  const walletProvider: StellarWalletProvider | undefined = useMemo(() => {
    if (!wallet.isConnected || !wallet.address) return undefined;

    return {
      address: wallet.address,
      networkPassphrase: wallet.networkPassphrase,
      signTransaction: wallet.signTransaction,
    };
  }, [wallet.isConnected, wallet.address, wallet.networkPassphrase, wallet.signTransaction]);

  // Initialize all services with wallet
  const services = useMemo(() => {
    return {
      vaultService: createVaultService(walletProvider),
      lendingPoolService: createLendingPoolService(walletProvider),
      oracleService: createOracleService(walletProvider),
      rwaService: createMockRWAService(walletProvider),
      usdcService: createUSDCService(walletProvider),
      stRwaService: createStakedRWAService(walletProvider),
    };
  }, [walletProvider]);

  return {
    ...services,
    wallet,
    isConnected: wallet.isConnected,
    address: wallet.address,
    network: wallet.network,
    connect: wallet.connect,
    disconnect: wallet.disconnect,
  };
}
