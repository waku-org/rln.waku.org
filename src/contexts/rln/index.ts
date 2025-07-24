// Main context exports
export { RLNProvider, useRLN } from './RLNContext';

// Type exports
export type {
  RLNContextType,
  RateLimitBounds,
  RegistrationResult,
  OperationResult,
  MembershipInfoExtended,
  PriceResult
} from './types';

// Singleton exports
export { getOrCreateRLNInstance, resetGlobalRLNInstance } from './singleton';

// Wallet exports
export { useWallet, ensureCorrectNetwork, getUserAddress } from './wallet';
export type { WalletState, UseWalletReturn } from './wallet';

// Initialization exports
export { useRLNInitialization } from './initialization';
export type { InitializationState, InitializationActions } from './initialization';

// Rate limit exports
export {
  getCurrentRateLimit,
  getRateLimitsBounds,
  getPriceForRateLimit,
  validateRateLimit
} from './rateLimits';

// Operations exports
export {
  registerMembership,
  getMembershipInfo,
  extendMembership,
  eraseMembership,
  withdrawDeposit
} from './operations';