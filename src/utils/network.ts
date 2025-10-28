"use client";

import { WalletClient } from 'viem';
import { WAKU_TESTNET_TOKEN_ADDRESS } from '../contracts/constants';

// Linea Sepolia configuration
export const LINEA_SEPOLIA_CONFIG = {
  chainId: 59141,
  tokenAddress: WAKU_TESTNET_TOKEN_ADDRESS
};

// Type for Ethereum provider in window
export interface EthereumProvider {
  request: (args: { 
    method: string; 
    params?: unknown[] 
  }) => Promise<unknown>;
}

// Function to ensure the wallet is connected to Linea Sepolia network
export const ensureLineaSepoliaNetwork = async (walletClient?: WalletClient): Promise<boolean> => {
  try {
    const currentChainId = walletClient?.chain?.id;
    console.log("Current network chain ID:", currentChainId);
    
    // Check if already on Linea Sepolia
    if (currentChainId === LINEA_SEPOLIA_CONFIG.chainId) {
      console.log("Already on Linea Sepolia network");
      return true;
    }
    
    // If not on Linea Sepolia, try to switch
    console.log("Not on Linea Sepolia, attempting to switch...");
    
    // Get the provider from window.ethereum
    const provider = window.ethereum as EthereumProvider | undefined;
    
    if (!provider) {
      console.warn("No Ethereum provider found");
      return false;
    }
    
    const chainIdHex = `0x${LINEA_SEPOLIA_CONFIG.chainId.toString(16)}`; // 0xe705
    
    try {
      // Request network switch
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
      
      console.log("Successfully switched to Linea Sepolia");
      return true;
    } catch (switchError: unknown) {
      console.log("Switch error:", switchError);
      
      // Check if the error is because the network is not added to MetaMask
      const error = switchError as { code?: number; message?: string };
      if (error?.code === 4902 || error?.message?.includes('Unrecognized chain ID')) {
        console.log("Network not found, attempting to add Linea Sepolia...");
        
        try {
          // Add the network to MetaMask
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: chainIdHex,
                chainName: 'Linea Sepolia Testnet',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://rpc.sepolia.linea.build'],
                blockExplorerUrls: ['https://sepolia.lineascan.build'],
              },
            ],
          });
          
          console.log("Successfully added Linea Sepolia network");
          return true;
        } catch (addError) {
          console.error("Error adding network:", addError);
          return false;
        }
      } else {
        console.error("Error switching network:", switchError);
        return false;
      }
    }
  } catch (err) {
    console.error("Error checking or switching network:", err);
    return false;
  }
};

// ERC20 ABI for token operations (viem format)
export const ERC20_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  }
] as const;

// Message for signing to generate identity
export const SIGNATURE_MESSAGE = "Sign this message to generate your RLN credentials"; 