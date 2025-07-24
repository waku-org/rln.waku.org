import { RLNInstance, KeystoreEntity, MembershipInfo } from "@waku/rln";

export interface RLNContextType {
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
}

export interface RateLimitBounds {
  success: boolean;
  rateMinLimit: number;
  rateMaxLimit: number;
  error?: string;
}

export interface RegistrationResult {
  success: boolean;
  error?: string;
  credentials?: KeystoreEntity;
  keystoreHash?: string;
}

export interface OperationResult {
  success: boolean;
  error?: string;
}

export interface MembershipInfoExtended extends MembershipInfo {
  address: string;
  chainId: string;
  treeIndex: number;
  rateLimit: number;
}

export interface PriceResult {
  price: string;
}