"use client";

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ensureLineaSepoliaNetwork } from '../../utils/network';

export interface WalletState {
  signer: ethers.Signer | null;
  isConnected: boolean;
}

export interface UseWalletReturn extends WalletState {
  checkWallet: () => Promise<void>;
}

/**
 * Hook to manage wallet connection and signer state
 */
export const useWallet = (): UseWalletReturn => {
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const checkWallet = async () => {
    try {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          const signer = provider.getSigner();
          setSigner(signer);
          setIsConnected(true);
          return;
        }
      }
      
      setSigner(null);
      setIsConnected(false);
    } catch (err) {
      console.error("Error checking wallet:", err);
      setSigner(null);
      setIsConnected(false);
    }
  };

  // Listen for wallet connection
  useEffect(() => {
    checkWallet();
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', checkWallet);
      window.ethereum.on('chainChanged', checkWallet);
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', checkWallet);
        window.ethereum.removeListener('chainChanged', checkWallet);
      }
    };
  }, []);

  return {
    signer,
    isConnected,
    checkWallet
  };
};

/**
 * Utility function to ensure wallet is on Linea Sepolia network
 */
export const ensureCorrectNetwork = async (signer: ethers.Signer): Promise<boolean> => {
  try {
    return await ensureLineaSepoliaNetwork(signer);
  } catch (error) {
    console.error("Error ensuring correct network:", error);
    return false;
  }
};

/**
 * Utility function to get user address from signer
 */
export const getUserAddress = async (signer: ethers.Signer): Promise<string> => {
  try {
    return await signer.getAddress();
  } catch (error) {
    console.error("Error getting user address:", error);
    throw new Error("Failed to get user address");
  }
}; 