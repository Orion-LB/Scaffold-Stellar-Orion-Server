import React, { createContext, useContext, ReactNode } from 'react';
import { useFreighterWallet, UseFreighterWalletReturn } from '@/hooks/useFreighterWallet';

// Create context
const WalletContext = createContext<UseFreighterWalletReturn | undefined>(undefined);

// Provider component
export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useFreighterWallet();

  return <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>;
}

// Hook to use wallet context
export function useWallet(): UseFreighterWalletReturn {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
