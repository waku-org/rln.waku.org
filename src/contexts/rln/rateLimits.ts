import { RLNInstance } from '@waku/rln';
import { ethers } from 'ethers';
import { RateLimitBounds, PriceResult } from './types';

/**
 * Get current rate limit from RLN contract
 */
export const getCurrentRateLimit = async (rln: RLNInstance | null, isStarted: boolean): Promise<number | null> => {
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

/**
 * Get rate limit bounds from RLN contract
 */
export const getRateLimitsBounds = async (
  rln: RLNInstance | null, 
  isStarted: boolean,
  currentRateMinLimit: number,
  currentRateMaxLimit: number
): Promise<RateLimitBounds> => {
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
      return {
        success: true,
        rateMinLimit: minLimit,
        rateMaxLimit: maxLimit
      };
    } else {
      throw new Error("Rate limits not available");
    }
  } catch (err) {
    return { 
      success: false, 
      rateMinLimit: currentRateMinLimit, 
      rateMaxLimit: currentRateMaxLimit, 
      error: err instanceof Error ? err.message : 'Failed to get rate limits' 
    };
  }
};

/**
 * Get price for a specific rate limit
 */
export const getPriceForRateLimit = async (
  rln: RLNInstance | null, 
  isStarted: boolean, 
  rateLimit: number
): Promise<PriceResult> => {
  try {
    if (!rln || !rln.contract || !isStarted) {
      throw new Error('RLN not initialized or contract not available');
    }
    
    const result = await rln.contract.getPriceForRateLimit(rateLimit);
    
    // Handle null case to fix linter error
    if (!result || !result.price) {
      throw new Error('Price not available for this rate limit');
    }
    
    const formatted = ethers.utils.formatUnits(result.price, 18);
    return { price: formatted };
  } catch (err) {
    console.error('Error getting price for rate limit:', err);
    throw err;
  }
};

/**
 * Validate rate limit is within bounds
 */
export const validateRateLimit = (
  rateLimit: number, 
  minLimit: number, 
  maxLimit: number
): { isValid: boolean; error?: string } => {
  if (rateLimit < minLimit || rateLimit > maxLimit) {
    return {
      isValid: false,
      error: `Rate limit must be between ${minLimit} and ${maxLimit}`
    };
  }
  return { isValid: true };
}; 