"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { KeystoreEntity, MembershipInfo, RLNCredentialsManager } from '@waku/rln';
import { ethers } from 'ethers';
import { useKeystore } from '../keystore';
import { ERC20_ABI, LINEA_SEPOLIA_CONFIG, ensureLineaSepoliaNetwork } from '../../utils/network';

interface RLNContextType {
  rln: RLNCredentialsManager | null;
  isInitialized: boolean;
  isStarted: boolean;
  error: string | null;
  initializeRLN: () => Promise<void>;
  registerMembership: (rateLimit: number, saveOptions?: { password: string }) => Promise<{ 
    success: boolean; 
    error?: string; 
    credentials?: KeystoreEntity;
    keystoreHash?: string;
  }>;
  extendMembership: (hash: string, password: string) => Promise<{ success: boolean; error?: string }>;
  eraseMembership: (hash: string, password: string) => Promise<{ success: boolean; error?: string }>;
  withdrawDeposit: (hash: string, password: string) => Promise<{ success: boolean; error?: string }>;
  getMembershipInfo: (hash: string, password: string) => Promise<MembershipInfo & {
    address: string;
    chainId: string;
    treeIndex: number;
    rateLimit: number;
  }>;
  rateMinLimit: number;
  rateMaxLimit: number;
  getCurrentRateLimit: () => Promise<number | null>;
  getRateLimitsBounds: () => Promise<{ success: boolean; rateMinLimit: number; rateMaxLimit: number; error?: string }>;
  saveCredentialsToKeystore: (credentials: KeystoreEntity, password: string) => Promise<string>;
  isLoading: boolean;
  getPriceForRateLimit: (rateLimit: number) => Promise<{ price: string }>;
}

const RLNContext = createContext<RLNContextType | undefined>(undefined);

export function RLNProvider({ children }: { children: ReactNode }) {
  const [rln, setRln] = useState<RLNCredentialsManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get the signer from window.ethereum
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [rateMinLimit, setRateMinLimit] = useState<number>(0);
  const [rateMaxLimit, setRateMaxLimit] = useState<number>(0);

  const { saveCredentials: saveToKeystore, getDecryptedCredential } = useKeystore();

  // Listen for wallet connection
  useEffect(() => {
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
  
  const initializeRLN = useCallback(async () => {
    console.log("InitializeRLN called. Connected:", isConnected, "Signer available:", !!signer);
  
    if (!isConnected || !signer) {
      console.log("Cannot initialize RLN: Wallet not connected or signer not available.");
      setError("Wallet not connected. Please connect your wallet.");
      setIsLoading(false);
      return; 
    }
  
    setIsLoading(true);
    setError(null);
  
    try {
      let currentRln = rln; 
  
      if (!currentRln) {
        console.log("Creating RLN instance...");
        try {
          currentRln = new RLNCredentialsManager(); 
          setRln(currentRln); 
          setIsInitialized(true);
          console.log("RLN instance created successfully.");
        } catch (createErr) {
          console.error("Error creating RLN instance:", createErr);
          setError(createErr instanceof Error ? createErr.message : 'Failed to create RLN instance');
          setIsLoading(false);
          return; 
        }
      } else {
        console.log("RLN instance already exists, skipping creation.");
      }
  
      if (currentRln && !isStarted) {
        console.log("Starting RLN with signer...");
        try {
          await currentRln.start({ signer }); 
          setIsStarted(true);
          console.log("RLN started successfully.");
  
          if (currentRln.contract) {
            try {
              const minLimit = await currentRln.contract.getMinRateLimit();
              const maxLimit = await currentRln.contract.getMaxRateLimit();
              if (minLimit !== undefined && maxLimit !== undefined) {
                setRateMinLimit(minLimit);
                setRateMaxLimit(maxLimit);
                console.log("Rate limits fetched:", { min: minLimit, max: maxLimit });
              } else {
                console.warn("Could not fetch rate limits: undefined values returned.");
              }
            } catch (limitErr) {
              console.warn("Could not fetch rate limits after start:", limitErr);
              // Don't fail initialization for this, but log it.
            }
          } else {
             console.warn("RLN contract not available after start, cannot fetch rate limits.");
          }
  
        } catch (startErr) {
          console.error("Error starting RLN:", startErr);
          setError(startErr instanceof Error ? startErr.message : 'Failed to start RLN');
          setIsStarted(false); 
        }
      } else if (isStarted) {
         console.log("RLN already started.");
      }
  
    } catch (err) {
      console.error('Error in initializeRLN:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize RLN');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, signer, rln, isStarted]); 

  // Auto-initialize effect for Light implementation
  useEffect(() => {
    console.log('Auto-init check:', {
      isConnected,
      hasSigner: !!signer,
      isInitialized,
      isStarted,
      isLoading
    });
    if (isConnected && signer && !isInitialized && !isStarted && !isLoading) {
      console.log('Auto-initializing Light RLN implementation...');
      initializeRLN();
    }
  }, [isConnected, signer, isInitialized, isStarted, isLoading, initializeRLN]);

  const getCurrentRateLimit = async (): Promise<number | null> => {
    try {
      if (!rln || !rln.contract || !isStarted) {
        console.log("Cannot get rate limit: RLN not initialized or started");
        return null;
      }
      
      const rateLimit = rln.contract.getRateLimit();
      console.log("Current rate limit:", rateLimit);
      return rateLimit;
    } catch (err) {
      console.error("Error getting current rate limit:", err);
      return null;
    }
  };

  const getRateLimitsBounds = async () => {
    try {
      if (!rln || !isStarted) {
        return { 
          success: false, 
          rateMinLimit: 0, 
          rateMaxLimit: 0, 
          error: 'RLN not initialized or not started' 
        };
      }
      const minLimit = await rln.contract?.getMinRateLimit();
      const maxLimit = await rln.contract?.getMaxRateLimit();
      if (minLimit !== undefined && maxLimit !== undefined) {
      // Update state
      setRateMinLimit(minLimit);
      setRateMaxLimit(maxLimit);
      } else {
        throw new Error("Rate limits not available");
      }
      
      return {
        success: true,
        rateMinLimit: minLimit,
        rateMaxLimit: maxLimit
      };
    } catch (err) {
      return { 
        success: false, 
        rateMinLimit: rateMinLimit, 
        rateMaxLimit: rateMaxLimit, 
        error: err instanceof Error ? err.message : 'Failed to get rate limits' 
      };
    }
  };

  const saveCredentialsToKeystore = async (credentials: KeystoreEntity, password: string): Promise<string> => {
    try {
      return await saveToKeystore(credentials, password);
    } catch (err) {
      console.error("Error saving credentials to keystore:", err);
      throw err;
    }
  };

  const registerMembership = async (rateLimit: number, saveOptions?: { password: string }) => {
    console.log("registerMembership called with rate limit:", rateLimit);
    
    if (!rln || !isStarted) {
      return { success: false, error: 'RLN not initialized or not started' };
    }
    
    if (!signer) {
      return { success: false, error: 'No signer available' };
    }
    
    try {
      // Validate rate limit
      if (rateLimit < rateMinLimit || rateLimit > rateMaxLimit) {
        return { 
          success: false, 
          error: `Rate limit must be between ${rateMinLimit} and ${rateMaxLimit}` 
        };
      }
      await rln.contract?.setRateLimit(rateLimit);
      
      // Ensure we're on the correct network
      const isOnLineaSepolia = await ensureLineaSepoliaNetwork(signer);
      if (!isOnLineaSepolia) {
        console.warn("Could not switch to Linea Sepolia network. Registration may fail.");
      }
      
      // Get user address and contract address
      const userAddress = await signer.getAddress();
      
      if (!rln.contract || !rln.contract.address) {
        return { success: false, error: "RLN contract address not available. Cannot proceed with registration." };
      }
      
      const contractAddress = rln.contract.address;
      const tokenAddress = LINEA_SEPOLIA_CONFIG.tokenAddress;
      
      // Create token contract instance
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        signer
      );
      
      // Check token balance
      const tokenBalance = await tokenContract.balanceOf(userAddress);
      if (tokenBalance.isZero()) {
        return { success: false, error: "You need tokens to register a membership. Your token balance is zero." };
      }
      
      // Check and approve token allowance if needed
      const currentAllowance = await tokenContract.allowance(userAddress, contractAddress);
      if (currentAllowance.eq(0)) {
        console.log("Requesting token approval...");
        
        // Approve a large amount (max uint256)
        const maxUint256 = ethers.constants.MaxUint256;
        
        try {
          const approveTx = await tokenContract.approve(contractAddress, maxUint256);
          console.log("Approval transaction submitted:", approveTx.hash);
          
          // Wait for the transaction to be mined
          await approveTx.wait(1);
          console.log("Token approval confirmed");
        } catch (approvalErr) {
          console.error("Error during token approval:", approvalErr);
          return { 
            success: false, 
            error: `Failed to approve token: ${approvalErr instanceof Error ? approvalErr.message : String(approvalErr)}` 
          };
        }
      } else {
        console.log("Token allowance already sufficient");
      }
      
      // Generate signature for identity
      const timestamp = Date.now();
      const message = `Sign this message to generate your RLN credentials ${timestamp}`;
      const signature = await signer.signMessage(message);
      
      // Register membership
      console.log("Registering membership...");
      const credentials = await rln.registerMembership({
        signature: signature
      });
      console.log("Credentials:", credentials);
      
      // If we have save options, save to keystore
      let keystoreHash: string | undefined;
      if (saveOptions && saveOptions.password && credentials) {
        try {
          const credentialsEntity = credentials as KeystoreEntity;
          keystoreHash = await saveCredentialsToKeystore(credentialsEntity, saveOptions.password);
          console.log("Credentials saved to keystore with hash:", keystoreHash);
        } catch (saveErr) {
          console.error("Error saving credentials to keystore:", saveErr);
          // Continue without failing the overall registration
        }
      }
      
      return { 
        success: true, 
        credentials: credentials as KeystoreEntity, 
        keystoreHash 
      };
    } catch (err) {
      console.error("Error registering membership:", err);
      
      let errorMsg = "Failed to register membership";
      if (err instanceof Error) {
        errorMsg = err.message;
      }
      
      return { success: false, error: errorMsg };
    }
  };


  const getMembershipInfo = async (hash: string, password: string) => {
    if (!rln || !rln.contract) {
      throw new Error('RLN not initialized or contract not available');
    }

    const credential = await getDecryptedCredential(hash, password);
    if (!credential) {
      throw new Error('Could not decrypt credential');
    }

    try {
      const membershipInfo = await rln.contract.getMembershipInfo(credential.identity.IDCommitmentBigInt);
      if (!membershipInfo) {
        throw new Error('Could not fetch membership info');
      }
      return {
        ...membershipInfo,
        address: rln.contract.address,
        chainId: LINEA_SEPOLIA_CONFIG.chainId.toString(),
        treeIndex: Number(membershipInfo.index.toString()),
        rateLimit: Number(membershipInfo.rateLimit.toString())
      }
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  };

  const extendMembership = async (hash: string, password: string) => {
    try {
      if (!rln || !rln.contract) {
        throw new Error('RLN not initialized or contract not available');
      }

      const credential = await getDecryptedCredential(hash, password);
      if (!credential) {
        throw new Error('Could not decrypt credential');
      }

      await rln.contract.extendMembership(credential.identity.IDCommitmentBigInt);
      return { success: true };
    } catch (err) {
      console.error('Error extending membership:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to extend membership'
      };
    }
  };

  const eraseMembership = async (hash: string, password: string) => {
    try {
      if (!rln || !rln.contract) {
        throw new Error('RLN not initialized or contract not available');
      }

      const credential = await getDecryptedCredential(hash, password);
      if (!credential) {
        throw new Error('Could not decrypt credential');
      }
      await rln.contract.eraseMembership(credential.identity.IDCommitmentBigInt);
      return { success: true };
    } catch (err) {
      console.error('Error erasing membership:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to erase membership'
      };
    }
  };

  const withdrawDeposit = async (hash: string, password: string) => {
    try {
      if (!rln || !rln.contract) {
        throw new Error('RLN not initialized or contract not available');
      }

      const credential = await getDecryptedCredential(hash, password);
      if (!credential) {
        throw new Error('Could not decrypt credential');
      }

      // Get token address from config
      const tokenAddress = LINEA_SEPOLIA_CONFIG.tokenAddress;
      const userAddress = await signer?.getAddress();
      
      if (!userAddress) {
        throw new Error('No signer available');
      }
      
      // Call withdraw with token address and holder
      await rln.contract.withdraw(tokenAddress, userAddress);
      return { success: true };
    } catch (err) {
      console.error('Error withdrawing deposit:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to withdraw deposit'
      };
    }
  };

  const getPriceForRateLimit = async (rateLimit: number): Promise<{ price: string }> => {
    try {
      if (!rln || !rln.contract || !isStarted) {
        throw new Error('RLN not initialized or contract not available');
      }
      const result = await rln.contract.getPriceForRateLimit(rateLimit);
      const formatted = ethers.utils.formatUnits(result.price, 18);
      return { price: formatted };
    } catch (err) {
      console.error('Error getting price for rate limit:', err);
      throw err;
    }
  };

  return (
    <RLNContext.Provider
      value={{
        rln,
        isInitialized,
        isStarted,
        error,
        initializeRLN,
        registerMembership,
        extendMembership,
        eraseMembership,
        withdrawDeposit,
        getMembershipInfo,
        rateMinLimit,
        rateMaxLimit,
        getCurrentRateLimit,
        getRateLimitsBounds,
        saveCredentialsToKeystore: saveToKeystore,
        isLoading,
        getPriceForRateLimit
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