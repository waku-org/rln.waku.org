import { DecryptedCredentials, RLNInstance } from "@waku/rln";

export interface RLNContextType {
    rln: RLNInstance | null;
    isInitialized: boolean;
    isStarted: boolean;
    error: string | null;
    initializeRLN: () => Promise<void>;
    registerMembership: (rateLimit: number) => Promise<{ success: boolean; error?: string; credentials?: DecryptedCredentials }>;
    rateMinLimit: number;
    rateMaxLimit: number;
  }