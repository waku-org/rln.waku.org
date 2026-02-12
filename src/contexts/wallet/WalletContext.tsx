"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { createViemClientFromWindow } from '@waku/rln';
import { WalletClient, PublicActions, formatUnits, parseUnits } from 'viem';
import { WalletContextType } from './types';
import { WAKU_TESTNET_TOKEN_ABI } from '../../contracts/waku_testnet_token_abi';
import { WAKU_TESTNET_TOKEN_ADDRESS } from '../../contracts/constants';
import { toast } from 'sonner';

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<WalletClient & PublicActions | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [wttBalance, setWttBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch WTT token balance
  const fetchWttBalance = useCallback(async (userAddress: `0x${string}`, client: PublicActions) => {
    try {
      const balance = await client.readContract({
        address: WAKU_TESTNET_TOKEN_ADDRESS as `0x${string}`,
        abi: WAKU_TESTNET_TOKEN_ABI,
        functionName: 'balanceOf',
        args: [userAddress],
      }) as bigint;
      const formattedBalance = formatUnits(balance, 18); // Assuming 18 decimals for the token
      setWttBalance(formattedBalance);
    } catch (err) {
      console.error('Error fetching WTT balance:', err);
      setWttBalance(null);
    }
  }, []);

  // Function to mint WTT tokens
  const mintWTT = useCallback(async (amount: number) => {
    if (!signer || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      toast.loading('Minting WTT tokens...');
      
      // Convert amount to wei (assuming 18 decimals)
      const amountInWei = parseUnits(amount.toString(), 18);
      
      // Call the mint function
      const hash = await signer.writeContract({
        address: WAKU_TESTNET_TOKEN_ADDRESS as `0x${string}`,
        abi: WAKU_TESTNET_TOKEN_ABI,
        functionName: 'mint',
        args: [address as `0x${string}`, amountInWei],
        chain: signer.chain,
        account: address as `0x${string}`,
      });
      
      // Wait for the transaction receipt
      await signer.waitForTransactionReceipt({ hash });
      
      // Refresh the balance
      await fetchWttBalance(address as `0x${string}`, signer);
      
      toast.dismiss();
      toast.success(`Successfully minted ${amount} WTT tokens`);
    } catch (err) {
      toast.dismiss();
      console.error('Error minting WTT tokens:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to mint WTT tokens');
    }
  }, [signer, address, fetchWttBalance]);

  // Function to disconnect wallet - defined first to avoid reference issues
  const disconnectWallet = useCallback(() => {
    setSigner(null);
    setAddress(null);
    setBalance(null);
    setWttBalance(null);
    setChainId(null);
    setIsConnected(false);
    
    // Event listeners are removed in the cleanup function of useEffect
  }, []);

  // Function to connect wallet
  const connectWallet = useCallback(async () => {
    try {
      setError(null);
      const signer = await createViemClientFromWindow();
      setSigner(signer);
      
      const [address] = await signer.getAddresses();
      setAddress(address);
      
      const chain = await signer.getChainId();
      setChainId(chain);
      
      const balanceWei = await signer.getBalance({ address });
      const balanceEth = formatUnits(balanceWei, 18);
      setBalance(balanceEth);
      
      // Fetch WTT token balance
      await fetchWttBalance(address, signer);
      
      setIsConnected(true);
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
      disconnectWallet();
    }
  }, [disconnectWallet, fetchWttBalance]);

  // Handle account changes
  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else if (accounts[0] !== address) {
      connectWallet();
    }
  }, [address, connectWallet, disconnectWallet]);

  // Handle chain changes
  const handleChainChanged = useCallback(() => {
    connectWallet();
  }, [connectWallet]);

  // Setup and cleanup event listeners
  useEffect(() => {
    if (window.ethereum && isConnected) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged as (chainId: string) => void);
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged as (chainId: string) => void);
      }
    };
  }, [handleAccountsChanged, handleChainChanged, isConnected]);

  // Check if wallet was previously connected
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check if MetaMask is installed
        if (!window.ethereum) {
          console.log("MetaMask not installed");
          return;
        }

        // Check if already connected
        const accounts = await window.ethereum.request({
          method: 'eth_accounts'
        }) as string[];
        
        if (accounts && accounts.length > 0) {
          console.log("Found existing connection, reconnecting...");
          connectWallet();
        } else {
          console.log("No existing connection found");
        }
      } catch (error) {
        console.error("Error checking for existing connection:", error);
      }
    };
    
    checkConnection();
  }, [connectWallet]);

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        signer,
        balance,
        wttBalance,
        chainId,
        connectWallet,
        disconnectWallet,
        mintWTT,
        error
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

