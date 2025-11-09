import { useState, useEffect, useCallback } from 'react';
import type { StellarWalletProvider } from '@/services/contracts';

export interface UseFreighterWalletReturn {
  address: string | null;
  isConnected: boolean;
  isFreighterInstalled: boolean;
  isLoading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  getWalletProvider: () => StellarWalletProvider | undefined;
}

/**
 * Hook for Freighter Wallet integration
 * Handles connection, disconnection, and transaction signing
 */
export function useFreighterWallet(): UseFreighterWalletReturn {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isFreighterInstalled, setIsFreighterInstalled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if Freighter is installed and already connected
  useEffect(() => {
    const checkFreighter = async () => {
      try {
        if (window.freighter) {
          setIsFreighterInstalled(true);

          // Check if already connected
          const connected = await window.freighter.isConnected();
          if (connected) {
            const publicKey = await window.freighter.getPublicKey();
            setAddress(publicKey);
            setIsConnected(true);
          }
        }
      } catch (err) {
        console.error('Failed to check Freighter:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkFreighter();
  }, []);

  // Connect to Freighter wallet
  const connect = useCallback(async () => {
    if (!window.freighter) {
      setError('Please install Freighter wallet extension');
      window.open('https://www.freighter.app/', '_blank');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const publicKey = await window.freighter.getPublicKey();
      setAddress(publicKey);
      setIsConnected(true);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      console.error('Failed to connect wallet:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    setError(null);
  }, []);

  // Get wallet provider for contract services
  const getWalletProvider = useCallback((): StellarWalletProvider | undefined => {
    if (!address || !window.freighter) return undefined;

    return {
      address,
      networkPassphrase: 'Test SDF Network ; September 2015',
      signTransaction: async (xdr: string, options) => {
        try {
          const signedTxXdr = await window.freighter!.signTransaction(xdr, {
            network: 'testnet',
            networkPassphrase: options.networkPassphrase,
            accountToSign: options.address,
          });
          return { signedTxXdr };
        } catch (err) {
          console.error('Transaction signing failed:', err);
          throw err;
        }
      },
    };
  }, [address]);

  return {
    address,
    isConnected,
    isFreighterInstalled,
    isLoading,
    error,
    connect,
    disconnect,
    getWalletProvider,
  };
}
