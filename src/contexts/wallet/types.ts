import { WalletClient, PublicActions } from 'viem';
import "viem/window";

export interface WalletContextType {
    isConnected: boolean;
    address: string | null;
    signer: WalletClient & PublicActions | null;
    balance: string | null;
    wttBalance: string | null;
    chainId: number | null;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
    mintWTT: (amount: number) => Promise<void>;
    error: string | null;
  }