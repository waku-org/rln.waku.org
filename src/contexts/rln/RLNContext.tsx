"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RLNInstance } from '@waku/rln';
import { useKeystore } from '../keystore';
import { RLNContextType } from './types';
import { useWallet } from './wallet';
import { useRLNInitialization } from './initialization';
import { 
  getCurrentRateLimit, 
  getRateLimitsBounds, 
  getPriceForRateLimit 
} from './rateLimits';
import {
  registerMembership,
  extendMembership,
  eraseMembership,
  withdrawDeposit,
  getMembershipInfo
} from './operations';

const RLNContext = createContext<RLNContextType | undefined>(undefined);

export function RLNProvider({ children }: { children: ReactNode }) {
  // State management
  const [rln, setRln] = useState<RLNInstance | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rateMinLimit, setRateMinLimit] = useState<number>(0);
  const [rateMaxLimit, setRateMaxLimit] = useState<number>(0);

  // Hooks
  const { signer, isConnected } = useWallet();
  const { saveCredentials: saveToKeystore, getDecryptedCredential } = useKeystore();

  // Initialization logic
  const state = { rln, isInitialized, isStarted, error, isLoading, rateMinLimit, rateMaxLimit };
  const actions = { setRln, setIsInitialized, setIsStarted, setError, setIsLoading, setRateMinLimit, setRateMaxLimit };
  const { initializeRLN, initializationInProgress, hasInitialized } = useRLNInitialization(
    state, actions, isConnected, signer
  );

  // Auto-initialize effect
  useEffect(() => {
    console.log('Auto-init check:', {
      isConnected,
      hasSigner: !!signer,
      isInitialized,
      isStarted,
      isLoading,
      initInProgress: initializationInProgress,
      hasInitialized
    });
    
    if (isConnected && 
        signer && 
        !isInitialized && 
        !isStarted && 
        !isLoading && 
        !initializationInProgress &&
        !hasInitialized) {
      console.log('Auto-initializing Light RLN implementation...');
      initializeRLN();
    }
  }, [isConnected, signer, isInitialized, isStarted, isLoading, initializationInProgress, hasInitialized, initializeRLN]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("RLN Provider unmounting");
    };
  }, []);

  return (
    <RLNContext.Provider
      value={{
        rln,
        isInitialized,
        isStarted,
        error,
        initializeRLN,
        registerMembership: (rateLimit, saveOptions) => 
          registerMembership(rln, isStarted, signer, rateLimit, rateMinLimit, rateMaxLimit, saveToKeystore, saveOptions),
        extendMembership: (hash, password) => 
          extendMembership(rln, hash, password, getDecryptedCredential),
        eraseMembership: (hash, password) => 
          eraseMembership(rln, hash, password, getDecryptedCredential),
        withdrawDeposit: (hash, password) => 
          withdrawDeposit(rln, signer, hash, password, getDecryptedCredential),
        getMembershipInfo: (hash, password) => 
          getMembershipInfo(rln, hash, password, getDecryptedCredential),
        rateMinLimit,
        rateMaxLimit,
        getCurrentRateLimit: () => getCurrentRateLimit(rln, isStarted),
        getRateLimitsBounds: async () => {
          const result = await getRateLimitsBounds(rln, isStarted, rateMinLimit, rateMaxLimit);
          if (result.success) {
            setRateMinLimit(result.rateMinLimit);
            setRateMaxLimit(result.rateMaxLimit);
          }
          return result;
        },
        saveCredentialsToKeystore: saveToKeystore,
        isLoading,
        getPriceForRateLimit: (rateLimit) => getPriceForRateLimit(rln, isStarted, rateLimit)
      }}
    >
      {children}
    </RLNContext.Provider>
  );
}

export function useRLN() {
  const context = useContext(RLNContext);
  if (context === undefined) {
    throw new Error('useRLN must be used within a RLNProvider');
  }
  return context;
} 