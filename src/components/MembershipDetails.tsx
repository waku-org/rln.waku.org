import React, { useState } from 'react';
import { Button } from './ui/button';
import { Copy, Clock, Trash2, Wallet } from 'lucide-react';
import { ethers } from 'ethers';
import { MembershipState } from '@waku/rln';
import { useRLN } from '../contexts/rln/RLNContext';
import { toast } from 'sonner';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/tooltip';

interface MembershipDetailsProps {
  membershipInfo: {
    address: string;
    chainId: string;
    treeIndex: number;
    rateLimit: number;
    idCommitment: string;
    startBlock: number;
    endBlock: number;
    state: MembershipState;
    depositAmount: ethers.BigNumber;
    activeDuration: number;
    gracePeriodDuration: number;
    holder: string;
    token: string;
  };
  copyToClipboard: (text: string) => void;
  hash: string;
}

export function MembershipDetails({ membershipInfo, copyToClipboard, hash }: MembershipDetailsProps) {
  const { extendMembership, eraseMembership, withdrawDeposit } = useRLN();
  const [isLoading, setIsLoading] = useState<{[key: string]: boolean}>({});
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [actionType, setActionType] = useState<'extend' | 'erase' | 'withdraw' | null>(null);

  const handleAction = async (type: 'extend' | 'erase' | 'withdraw') => {
    if (!password) {
      setActionType(type);
      setShowPasswordInput(true);
      return;
    }

    setIsLoading(prev => ({ ...prev, [type]: true }));
    try {
      let result;
      switch (type) {
        case 'extend':
          result = await extendMembership(hash, password);
          break;
        case 'erase':
          result = await eraseMembership(hash, password);
          break;
        case 'withdraw':
          result = await withdrawDeposit(hash, password);
          break;
      }

      if (result.success) {
        toast.success(`Successfully ${type}ed membership`);
        setPassword('');
        setShowPasswordInput(false);
        setActionType(null);
      } else {
        toast.error(result.error || `Failed to ${type} membership`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${type} membership`);
    } finally {
      setIsLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  // Check if membership is in grace period
  const isInGracePeriod = membershipInfo.state === MembershipState.GracePeriod;
  
  // Check if membership is erased and awaiting withdrawal
  const canWithdraw = membershipInfo.state === MembershipState.ErasedAwaitsWithdrawal;

  // Check if membership can be erased (Active or GracePeriod)
  const canErase = membershipInfo.state === MembershipState.Expired || membershipInfo.state === MembershipState.GracePeriod;
  console.log(membershipInfo.state);

  return (
    <div className="mt-3 space-y-2 border-t border-terminal-border/40 pt-3 animate-in fade-in-50 duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <span className="text-primary font-mono font-medium mr-2">{">"}</span>
          <h3 className="text-sm font-mono font-semibold text-primary">
            Membership Details
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          {isInGracePeriod && (
            <Button
              variant="outline"
              size="sm"
              className="text-warning-DEFAULT hover:text-warning-DEFAULT hover:border-warning-DEFAULT flex items-center gap-1"
              onClick={() => handleAction('extend')}
              disabled={isLoading.extend}
            >
              <Clock className="w-3 h-3" />
              <span>{isLoading.extend ? 'Extending...' : 'Extend'}</span>
            </Button>
          )}
          {canErase && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive hover:border-destructive flex items-center gap-1"
              onClick={() => handleAction('erase')}
              disabled={isLoading.erase}
            >
              <Trash2 className="w-3 h-3" />
              <span>{isLoading.erase ? 'Erasing...' : 'Erase'}</span>
            </Button>
          )}
          {canWithdraw && (
            <Button
              variant="outline"
              size="sm"
              className="text-accent hover:text-accent hover:border-accent flex items-center gap-1"
              onClick={() => handleAction('withdraw')}
              disabled={isLoading.withdraw}
            >
              <Wallet className="w-3 h-3" />
              <span>{isLoading.withdraw ? 'Withdrawing...' : 'Withdraw'}</span>
            </Button>
          )}
        </div>
      </div>

      {showPasswordInput && (
        <div className="mb-4 space-y-2 border-b border-terminal-border pb-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter keystore password"
            className="w-full px-3 py-2 border border-terminal-border rounded-md bg-terminal-background text-foreground font-mono focus:ring-1 focus:ring-accent focus:border-accent text-sm"
          />
          <div className="flex space-x-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleAction(actionType!)}
              disabled={!password || isLoading[actionType!]}
            >
              Confirm
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowPasswordInput(false);
                setPassword('');
                setActionType(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2 text-xs font-mono">
        <div className="grid grid-cols-2 gap-4">
          {/* Membership State */}
          <div>
            <span className="text-muted-foreground text-xs">State:</span>
            <div className="text-accent">{membershipInfo.state || 'N/A'}</div>
          </div>
          
          {/* Basic Info */}
          <div>
            <span className="text-muted-foreground text-xs">Chain ID:</span>
            <div className="text-accent">{membershipInfo.chainId}</div>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Rate Limit:</span>
            <div className="text-accent flex items-center gap-1">
              {membershipInfo.rateLimit} msg/epoch
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-1 cursor-pointer align-middle inline-flex items-center justify-center">
                      <span className="w-4 h-4 rounded-full border border-muted-foreground text-muted-foreground flex items-center justify-center text-xs font-bold" style={{ fontFamily: 'monospace' }}>i</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    1 epoch = 10 minutes
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Contract Info */}
          <div>
            <span className="text-muted-foreground text-xs">Contract Address:</span>
            <div className="text-accent truncate hover:text-clip flex items-center">
              {membershipInfo.address}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 w-5 p-0 ml-1 text-muted-foreground hover:text-accent"
                onClick={() => membershipInfo.address && copyToClipboard(membershipInfo.address)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Member Details */}
          <div>
            <span className="text-muted-foreground text-xs">Member Index:</span>
            <div className="text-accent">{membershipInfo.treeIndex || 'N/A'}</div>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">ID Commitment:</span>
            <div className="text-accent truncate hover:text-clip flex items-center">
              {membershipInfo.idCommitment || 'N/A'}
              {membershipInfo.idCommitment && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 w-5 p-0 ml-1 text-muted-foreground hover:text-accent"
                  onClick={() => membershipInfo.idCommitment && copyToClipboard(membershipInfo.idCommitment)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Block Information */}
          <div>
            <span className="text-muted-foreground text-xs">Start Block:</span>
            <div className="text-accent">{membershipInfo.startBlock || 'N/A'}</div>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">End Block:</span>
            <div className="text-accent">{membershipInfo.endBlock || 'N/A'}</div>
          </div>

          {/* Duration Information */}
          <div>
            <span className="text-muted-foreground text-xs">Active Duration:</span>
            <div className="text-accent">{membershipInfo.activeDuration ? `${membershipInfo.activeDuration} blocks` : 'N/A'}</div>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Grace Period:</span>
            <div className="text-accent">{membershipInfo.gracePeriodDuration ? `${membershipInfo.gracePeriodDuration} blocks` : 'N/A'}</div>
          </div>

          {/* Token Information */}
          <div>
            <span className="text-muted-foreground text-xs">Token Address:</span>
            <div className="text-accent truncate hover:text-clip flex items-center">
              {membershipInfo.token || 'N/A'}
              {membershipInfo.token && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 w-5 p-0 ml-1 text-muted-foreground hover:text-accent"
                  onClick={() => membershipInfo.token && copyToClipboard(membershipInfo.token)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Deposit Amount:</span>
            <div className="text-accent">
              {membershipInfo.depositAmount ? `${ethers.utils.formatEther(membershipInfo.depositAmount)} ETH` : 'N/A'}
            </div>
          </div>

          {/* Holder Information */}
          <div className="col-span-2">
            <span className="text-muted-foreground text-xs">Holder Address:</span>
            <div className="text-accent truncate hover:text-clip flex items-center">
              {membershipInfo.holder || 'N/A'}
              {membershipInfo.holder && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 w-5 p-0 ml-1 text-muted-foreground hover:text-accent"
                  onClick={() => membershipInfo.holder && copyToClipboard(membershipInfo.holder)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 