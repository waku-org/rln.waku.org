"use client";

import React from 'react';
import { useRLN } from '../contexts';
import { useWallet } from '../contexts';

export function RLNStatusIndicator() {
  const { isInitialized, isStarted, isLoading, error, rln } = useRLN();
  const { isConnected, chainId } = useWallet();

  // Debug logging
  console.log('RLN Status:', {
    isConnected,
    chainId,
    isInitialized,
    isStarted,
    isLoading,
    error,
    rln
  });

  const getStatusColor = () => {
    if (error) return 'bg-red-500 shadow-[0_0_8px_0_rgba(239,68,68,0.6)]';
    if (isLoading) return 'bg-yellow-500 animate-pulse shadow-[0_0_8px_0_rgba(234,179,8,0.6)]';
    if (isInitialized && isStarted) return 'bg-green-500 shadow-[0_0_8px_0_rgba(34,197,94,0.6)]';
    return 'bg-gray-500';
  };

  const getTextColor = () => {
    if (error) return 'text-red-500';
    if (isLoading) return 'text-yellow-500';
    if (isInitialized && isStarted) return 'text-green-500';
    return 'text-gray-500';
  };

  const getStatusText = () => {
    if (error) return 'Error';
    if (isLoading) return 'Initializing RLN...';
    if (!isConnected) return 'Wallet Not Connected';
    if (chainId !== 59141) return 'Switch to Linea Sepolia';
    if (isInitialized && isStarted) return 'RLN Active';
    return 'RLN Inactive';
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-terminal-border bg-terminal-background">
      <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${getStatusColor()}`} />
      <span className={`text-xs font-mono font-medium transition-all duration-300 ${getTextColor()} capitalize`}>
        {getStatusText()}
      </span>
    </div>
  );
} 