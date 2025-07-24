import { RLNInstance, createRLN } from '@waku/rln';

// Global singleton to ensure WASM is only initialized once
let globalRLNInstance: RLNInstance | null = null;
let globalInitPromise: Promise<RLNInstance> | null = null;

/**
 * Singleton function to ensure WASM is only initialized once
 * Handles retry logic for WASM-related errors
 */
export const getOrCreateRLNInstance = async (): Promise<RLNInstance> => {
  if (globalRLNInstance) {
    console.log("Reusing existing global RLN instance");
    return globalRLNInstance;
  }

  if (globalInitPromise) {
    console.log("Waiting for existing RLN initialization...");
    return globalInitPromise;
  }

  console.log("Creating new global RLN instance...");
  globalInitPromise = createRLN();
  
  try {
    globalRLNInstance = await globalInitPromise;
    console.log("Global RLN instance created successfully");
    return globalRLNInstance;
  } catch (error) {
    console.error("Error creating global RLN instance:", error);
    globalInitPromise = null;
    throw error;
  }
};

/**
 * Cleanup function to reset the global instance
 * Useful for testing or when a fresh instance is needed
 */
export const resetGlobalRLNInstance = (): void => {
  globalRLNInstance = null;
  globalInitPromise = null;
  console.log("Global RLN instance reset");
}; 