"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { KeystoreEntity, MembershipInfo, RLNInstance, createRLN, createViemClientFromWindow } from '@waku/rln';
import { formatUnits, parseUnits, maxUint256, PublicActions, WalletClient } from "viem";
import { useKeystore } from '../keystore';
import { useWallet } from '../wallet';
import { ERC20_ABI, LINEA_SEPOLIA_CONFIG, ensureLineaSepoliaNetwork } from '../../utils/network';
import { WAKU_TESTNET_TOKEN_ADDRESS } from '../../contracts/constants';

interface RLNContextType {
  rln: RLNInstance | null;
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
  tokenApprovalStatus: {
    isApproved: boolean | null;
    isChecking: boolean;
    needsApproval: boolean;
    requiredAmount: string | null;
    currentAllowance: string | null;
    tokenBalance: string | null;
    hasEnoughBalance: boolean | null;
  };
  checkTokenApproval: (rateLimit: number) => Promise<void>;
  approveTokens: () => Promise<{ success: boolean; error?: string }>;
}

const RLNContext = createContext<RLNContextType | undefined>(undefined);

export function RLNProvider({ children }: { children: ReactNode }) {
  const [rln, setRln] = useState<RLNInstance | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [signer, setSigner] = useState<WalletClient & PublicActions | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [rateMinLimit, setRateMinLimit] = useState<number>(0);
  const [rateMaxLimit, setRateMaxLimit] = useState<number>(0);
  
  // Token approval status
  const [tokenApprovalStatus, setTokenApprovalStatus] = useState({
    isApproved: null as boolean | null,
    isChecking: false,
    needsApproval: false,
    requiredAmount: null as string | null,
    currentAllowance: null as string | null,
    tokenBalance: null as string | null,
    hasEnoughBalance: null as boolean | null,
  });

  const { saveCredentials: saveToKeystore, getDecryptedCredential } = useKeystore();
  const { wttBalance } = useWallet();

  // Listen for wallet connection
  useEffect(() => {
    const checkWallet = async () => {
      try {
        const signer = await createViemClientFromWindow();
        setSigner(signer);
        setIsConnected(true);
      } catch(err) {
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
          currentRln = await createRLN(); 
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
          await currentRln.start({ walletClient: signer }); 
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
          
          // Check if it's a network mismatch error
          // if (startErr instanceof Error && startErr.message.includes('chain ID of contract is different')) {
          //   console.log("Network mismatch detected, attempting to switch to Linea Sepolia...");
            
          //   try {
          //     const switched = await ensureLineaSepoliaNetwork(walletClient);
          //     if (switched) {
          //       setError('Network switched to Linea Sepolia. Please try connecting again.');
          //       // Don't retry automatically to avoid loops, let user re-trigger
          //     } else {
          //       setError('Please manually switch to Linea Sepolia network in MetaMask and try again.');
          //     }
          //   } catch (switchErr) {
          //     console.error("Error switching network:", switchErr);
          //     setError('Failed to switch to Linea Sepolia network. Please switch manually in MetaMask.');
          //   }
          // } else {
          //   setError(startErr instanceof Error ? startErr.message : 'Failed to start RLN');
          // }
          
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
      hasWalletClient: !!signer,
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

  const checkTokenApproval = useCallback(async (rateLimit: number) => {
    if (!rln || !rln.contract || !signer || !isConnected) {
      console.log("Cannot check token approval: RLN not ready or wallet not connected");
      return;
    }

    setTokenApprovalStatus(prev => ({ ...prev, isChecking: true }));

    try {
      const [userAddress] = await signer.getAddresses();
      const contractAddress = rln.contract.address;

      // Use the hardcoded token address consistently
      const tokenAddress = WAKU_TESTNET_TOKEN_ADDRESS;
      
      // Get price info from RLN contract
      const priceInfo = await rln.contract.getPriceForRateLimit(rateLimit);

      if (!priceInfo.price) {
        throw new Error("Unable to determine required deposit amount");
      }

      const requiredAmount = priceInfo.price;
      
      // Read current allowance from token contract
      const currentAllowance = await signer.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [userAddress, contractAddress as `0x${string}`],
      }) as bigint;
      
      // Check actual token balance directly from the contract
      const actualTokenBalance = await signer.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress],
      }) as bigint;
      
      const tokenBalanceStr = formatUnits(actualTokenBalance, 18);
      const tokenBalance = actualTokenBalance;

      console.log("Token approval check:", {
        requiredAmount: formatUnits(requiredAmount, 18),
        currentAllowance: formatUnits(currentAllowance, 18),
        tokenBalance: tokenBalanceStr,
        tokenAddress: tokenAddress,
        userAddress: userAddress,
        contractAddress: contractAddress
      });

      const isApproved = currentAllowance >= requiredAmount;
      const needsApproval = !isApproved;
      const hasEnoughBalance = tokenBalance >= requiredAmount;

      setTokenApprovalStatus({
        isApproved,
        isChecking: false,
        needsApproval,
        requiredAmount: formatUnits(requiredAmount, 18),
        currentAllowance: formatUnits(currentAllowance, 18),
        tokenBalance: tokenBalanceStr,
        hasEnoughBalance,
      });

      // Clear any existing errors when checking status
      setError(null);
    } catch (err) {
      console.error("Error checking token approval:", err);
      setTokenApprovalStatus(prev => ({ 
        ...prev, 
        isChecking: false, 
        isApproved: null,
        needsApproval: false 
      }));
    }
  }, [rln, signer, isConnected, setError]);

  const approveTokens = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!rln || !rln.contract || !signer) {
      return { success: false, error: "RLN not initialized or wallet not connected" };
    }

    try {
      const [userAddress] = await signer.getAddresses();
      const contractAddress = rln.contract.address;

      // Use the hardcoded token address consistently
      const tokenAddress = WAKU_TESTNET_TOKEN_ADDRESS;

      // Approve maximum amount for convenience
      const approvalAmount = maxUint256;
      
        const hash = await signer.writeContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [contractAddress as `0x${string}`, approvalAmount],
        chain: signer.chain,
        account: userAddress,
      });
      console.log("Approval transaction submitted:", hash);
      
      // Update status to show approval in progress
      setTokenApprovalStatus(prev => ({ ...prev, isChecking: true }));
      
      // Wait for the transaction to be mined
      const receipt = await signer.waitForTransactionReceipt({ hash, confirmations: 2 });
      console.log("Token approval confirmed in block:", receipt.blockNumber);
      
      // Update approval status
      const newAllowance = await signer.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [userAddress, contractAddress as `0x${string}`],
      }) as bigint;
      const isApproved = newAllowance > BigInt(0);
      
      setTokenApprovalStatus(prev => ({
        ...prev,
        isApproved,
        isChecking: false,
        needsApproval: !isApproved,
        currentAllowance: formatUnits(newAllowance, 18),
      }));

      return { success: true };
    } catch (err) {
      console.error("Error approving tokens:", err);
      setTokenApprovalStatus(prev => ({ ...prev, isChecking: false }));
      
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { 
        success: false, 
        error: `Failed to approve tokens: ${errorMessage}` 
      };
    }
  }, [rln, signer]);

  const registerMembership = async (rateLimit: number, saveOptions?: { password: string }) => {
    console.log("registerMembership called with rate limit:", rateLimit);
    
    if (!rln || !isStarted) {
      return { success: false, error: 'RLN not initialized or not started' };
    }
    
    if (!signer) {
      return { success: false, error: 'Wallet not connected' };
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
      const [userAddress] = await signer.getAddresses();
      
      if (!rln.contract || !rln.contract.address) {
        return { success: false, error: "RLN contract address not available. Cannot proceed with registration." };
      }
      
      const contractAddress = rln.contract.address;
      
      // Use the hardcoded token address consistently
      const tokenAddress = WAKU_TESTNET_TOKEN_ADDRESS;
      
      // Check balance from wallet context
      const tokenBalanceStr = wttBalance || "0";
      const tokenBalance = parseUnits(tokenBalanceStr, 18);
      
      if (tokenBalance === BigInt(0)) {
        return { 
          success: false, 
          error: `You need tokens to register a membership. Your balance is ${tokenBalanceStr} WTT. Please get test tokens.` 
        };
      }
      
      // Get the required deposit amount first
      let requiredDeposit;
      try {
        const priceInfo = await rln.contract.getPriceForRateLimit(rateLimit);
        if (!priceInfo.price) {
          return { success: false, error: "Unable to determine deposit amount for rate limit" };
        }
        requiredDeposit = priceInfo.price;
        console.log("Required deposit:", formatUnits(requiredDeposit, 18), "WTT");
      } catch (priceErr) {
        console.error("Error getting price for rate limit:", priceErr);
        return { success: false, error: "Failed to determine required deposit amount" };
      }
      
      // Check and approve token allowance
      const currentAllowance = await signer.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [userAddress, contractAddress as `0x${string}`],
      }) as bigint;
      console.log("Current allowance:", formatUnits(currentAllowance, 18), "WTT");
      console.log("Required deposit:", formatUnits(requiredDeposit, 18), "WTT");
      
      if (currentAllowance < requiredDeposit) {
        console.log("Insufficient allowance, requesting token approval...");
        
        // Approve the required amount plus a buffer (or max uint256 for simplicity)
        const approvalAmount = maxUint256;
        
        try {
          const hash = await signer.writeContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [contractAddress as `0x${string}`, approvalAmount],
            chain: signer.chain,
            account: userAddress,
          });
          console.log("Approval transaction submitted:", hash);
          
          // Wait for the transaction to be mined with more confirmations
          const receipt = await signer.waitForTransactionReceipt({ hash, confirmations: 2 });
          console.log("Token approval confirmed in block:", receipt.blockNumber);
          
          // Verify the approval was successful
          const newAllowance = await signer.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [userAddress, contractAddress as `0x${string}`],
          }) as bigint;
          console.log("New allowance:", formatUnits(newAllowance, 18), "WTT");
          
          if (newAllowance < requiredDeposit) {
            return { success: false, error: "Token approval failed - insufficient allowance after approval" };
          }
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
      const signature = await signer.signMessage({ message, account: userAddress });
      
      // Register membership
      console.log("Registering membership...");
      let credentials;
      try {
        credentials = await rln.registerMembership({
          signature: signature
        });
        console.log("Credentials:", credentials);
      } catch (registrationError) {
        console.error("Registration error:", registrationError);
        
        // Check if it's an allowance issue
        if (registrationError instanceof Error && registrationError.message.includes("insufficient allowance")) {
          return { 
            success: false, 
            error: "Token approval failed. Please try approving tokens manually in MetaMask and try again." 
          };
        }
        
        // Check for other common errors
        if (registrationError instanceof Error && registrationError.message.includes("user rejected")) {
          return { 
            success: false, 
            error: "Transaction was rejected. Please try again and approve the transaction." 
          };
        }
        
        // Generic error handling
        const errorMessage = registrationError instanceof Error ? registrationError.message : String(registrationError);
        return { 
          success: false, 
          error: `Registration failed: ${errorMessage}` 
        };
      }
      
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

      // Use the hardcoded token address consistently
      const tokenAddress = WAKU_TESTNET_TOKEN_ADDRESS;
      
      // Call withdraw with token address
      await rln.contract.withdraw(tokenAddress);
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
      if (!result.price) {
        throw new Error('Price not available');
      }
      
      console.log("💰 Price from RLN contract (raw):", result.price);
      console.log("💰 Price from RLN contract (toString):", result.price.toString());
      
      const formatted = formatUnits(result.price, 18);
      console.log("💰 Price formatted to decimal:", formatted);
      
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
        getPriceForRateLimit,
        tokenApprovalStatus,
        checkTokenApproval,
        approveTokens
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