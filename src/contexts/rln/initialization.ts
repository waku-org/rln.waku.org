"use client";

import { useCallback, useRef } from 'react';
import { RLNInstance } from '@waku/rln';
import { ethers } from 'ethers';
import { getOrCreateRLNInstance } from './singleton';

export interface InitializationState {
  rln: RLNInstance | null;
  isInitialized: boolean;
  isStarted: boolean;
  error: string | null;
  isLoading: boolean;
  rateMinLimit: number;
  rateMaxLimit: number;
}

export interface InitializationActions {
  setRln: (rln: RLNInstance | null) => void;
  setIsInitialized: (initialized: boolean) => void;
  setIsStarted: (started: boolean) => void;
  setError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setRateMinLimit: (limit: number) => void;
  setRateMaxLimit: (limit: number) => void;
}

export const useRLNInitialization = (
  state: InitializationState,
  actions: InitializationActions,
  isConnected: boolean,
  signer: ethers.Signer | null
) => {
  // Use refs to prevent race conditions and ensure single initialization
  const initializationInProgress = useRef(false);
  const hasInitialized = useRef(false);
  const lastInitAttempt = useRef(0);
  const retryCount = useRef(0);
  const maxRetries = 3;
  const retryDelay = 1000; // Start with 1 second delay

  const initializeRLN = useCallback(async () => {
    
    console.log("InitializeRLN called. Connected:", isConnected, "Signer available:", !!signer);

    // Prevent multiple simultaneous initialization attempts
    if (initializationInProgress.current) {
      console.log("Initialization already in progress, skipping...");
      return;
    }

    // Prevent rapid retry attempts
    const now = Date.now();
    if (now - lastInitAttempt.current < retryDelay) {
      console.log("Too soon since last attempt, skipping...");
      return;
    }
    lastInitAttempt.current = now;

    if (!isConnected || !signer) {
      console.log("Cannot initialize RLN: Wallet not connected or signer not available.");
      actions.setError("Wallet not connected. Please connect your wallet.");
      return; 
    }

    // If already initialized and started, no need to reinitialize
    if (state.isInitialized && state.isStarted && state.rln) {
      console.log("RLN already initialized and started");
      return;
    }

    // If we've already successfully initialized once, don't reinitialize
    if (hasInitialized.current && state.rln) {
      console.log("RLN already initialized once, reusing existing instance");
      if (!state.isStarted) {
        try {
          await state.rln.start({ signer });
          actions.setIsStarted(true);
          console.log("RLN restarted successfully.");
        } catch (startErr) {
          console.error("Error restarting RLN:", startErr);
          actions.setError(startErr instanceof Error ? startErr.message : 'Failed to restart RLN');
        }
      }
      return;
    }

    initializationInProgress.current = true;
    actions.setIsLoading(true);
    actions.setError(null);

    try {
      let currentRln = state.rln;

      // Cleanup existing instance before creating new one
      if (currentRln) {
        console.log("Cleaning up existing RLN instance...");
        actions.setRln(null);
        actions.setIsInitialized(false);
        actions.setIsStarted(false);
        currentRln = null;
        
        // Small delay to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!currentRln) {
        console.log("Creating new RLN instance...");
        try {
          // Add a small delay before WASM initialization to prevent rapid calls
          if (retryCount.current > 0) {
            const delay = retryDelay * Math.pow(2, retryCount.current - 1); // Exponential backoff
            console.log(`Waiting ${delay}ms before retry attempt ${retryCount.current}...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          // Ensure we're not in a rapid initialization loop
          await new Promise(resolve => setTimeout(resolve, 50));

          // Use singleton pattern to ensure WASM is only initialized once
          console.time("RLN WASM BLOB");
          currentRln = await getOrCreateRLNInstance();
          console.timeEnd("RLN WASM BLOB");
          actions.setRln(currentRln); 
          actions.setIsInitialized(true);
          hasInitialized.current = true; // Mark as successfully initialized
          retryCount.current = 0; // Reset retry count on success
          console.log("RLN instance created successfully.");
        } catch (createErr) {
          console.error("Error creating RLN instance:", createErr);
          
          // Check if this is a WASM-related error and implement retry logic
          const errorMessage = createErr instanceof Error ? createErr.message : String(createErr);
          const isWasmError = errorMessage.includes('WebAssembly') || 
                             errorMessage.includes('wasm') || 
                             errorMessage.includes('Table.grow');
          
          if (isWasmError && retryCount.current < maxRetries) {
            retryCount.current++;
            console.log(`WASM error detected, retrying... (attempt ${retryCount.current}/${maxRetries})`);
            actions.setError(`Initializing RLN (attempt ${retryCount.current}/${maxRetries})...`);
            
            // Release the lock and retry after a delay
            initializationInProgress.current = false;
            actions.setIsLoading(false);
            
            // Retry with exponential backoff
            setTimeout(() => {
              initializeRLN();
            }, retryDelay * Math.pow(2, retryCount.current - 1));
            return;
          }
          
          actions.setError(errorMessage);
          actions.setIsLoading(false);
          initializationInProgress.current = false;
          return; 
        }
      } else {
        console.log("RLN instance already exists, skipping creation.");
      }

      if (currentRln && !state.isStarted) {
        console.log("Starting RLN with signer...");
        try {
          await currentRln.start({ signer }); 
          actions.setIsStarted(true);
          console.log("RLN started successfully.");

          if (currentRln.contract) {
            try {
              const minLimit = await currentRln.contract.getMinRateLimit();
              const maxLimit = await currentRln.contract.getMaxRateLimit();
              if (minLimit !== undefined && maxLimit !== undefined) {
                actions.setRateMinLimit(minLimit);
                actions.setRateMaxLimit(maxLimit);
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
          actions.setError(startErr instanceof Error ? startErr.message : 'Failed to start RLN');
          actions.setIsStarted(false); 
        }
      } else if (state.isStarted) {
         console.log("RLN already started.");
      }

    } catch (err) {
      console.error('Error in initializeRLN:', err);
      actions.setError(err instanceof Error ? err.message : 'Failed to initialize RLN');
    } finally {
      actions.setIsLoading(false);
      initializationInProgress.current = false;
    }
  }, [isConnected, signer, state.rln, state.isStarted, state.isInitialized, actions]); 

  return {
    initializeRLN,
    initializationInProgress: initializationInProgress.current,
    hasInitialized: hasInitialized.current
  };
}; 