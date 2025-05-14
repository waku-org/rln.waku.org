"use client";

import React, { useState, ChangeEvent } from 'react';
import { useWallet } from "@/contexts/wallet";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  PlusCircle, 
  Wallet, 
  ExternalLink, 
  Copy, 
  LogOut, 
  Coins
} from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const LINEA_PARAMS = {
  chainId: '0xE705', // 59141 in hex
  chainName: 'Linea Sepolia',
  rpcUrls: ['https://rpc.sepolia.linea.build'],
  nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  blockExplorerUrls: ['https://sepolia.lineascan.build'],
};

export function WalletDropdown() {
  const { isConnected, address, chainId, connectWallet, disconnectWallet, balance, wttBalance, mintWTT } = useWallet();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mintAmount, setMintAmount] = useState('1000');

  const handleMint = async () => {
    await mintWTT(Number(mintAmount));
    setIsDialogOpen(false);
  };

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMintAmount(e.target.value);
  };

  // Format address in the "0xabc...xyz" pattern
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `0x${address.slice(2, 5)}...${address.slice(-3)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getNetworkColor = () => {
    if (chainId === 59141) return "text-green-400";
    return "text-yellow-400";
  };

  const getNetworkName = () => {
    if (chainId === 59141) return "Linea Sepolia";
    return `Unknown (${chainId})`;
  };

  const addNetwork = async () => {
    if (!window.ethereum) {
      alert('MetaMask is not installed.');
      return;
    }
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [LINEA_PARAMS],
      });
    } catch {
      alert('Failed to add Linea Sepolia network.');
    }
  };

  if (!isConnected || !address) {
    return (
      <Button 
        onClick={connectWallet}
        variant="terminal"
        size="sm"
        className="text-xs flex items-center gap-1.5"
      >
        <Wallet className="h-3.5 w-3.5" />
        Connect Wallet
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="font-mono text-xs border-terminal-border hover:border-primary hover:text-primary flex items-center gap-1.5"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-success-DEFAULT" />
          <span className="cursor-blink font-medium">
            {formatAddress(address)}
          </span>
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 font-mono border-terminal-border bg-terminal-background/95 p-0">
        <div className="p-3 border-b border-terminal-border bg-terminal-background/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-primary text-sm font-medium">Wallet</span>
            </div>
            <div className={`text-xs px-1.5 py-0.5 rounded-sm ${getNetworkColor()} bg-terminal-background/80 border border-terminal-border`}>
              {getNetworkName()}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="truncate text-primary text-xs font-medium">{address}</div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-primary"
                onClick={() => copyToClipboard(address || '')}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-primary"
                onClick={() => window.open(`https://explorer.linea.build/address/${address}`, '_blank')}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="p-3 space-y-3">
          {/* Balances section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Coins className="h-3.5 w-3.5" />
                <span>ETH Balance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-primary font-medium">{parseFloat(balance || '0').toFixed(4)}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-accent"
                        onClick={() => window.open('https://docs.metamask.io/developer-tools/faucet/', '_blank')}
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p className="font-mono text-xs">Get Testnet ETH from Linea Faucet</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Coins className="h-3.5 w-3.5" />
                <span>WTT Balance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-primary font-medium">{parseFloat(wttBalance || '0').toFixed(4)}</span>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5 p-0 text-muted-foreground hover:text-green-400">
                            <PlusCircle className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p className="font-mono text-xs">Mint WTT tokens for testing</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <DialogContent className="sm:max-w-[350px] bg-terminal-background border-terminal-border">
                    <DialogHeader>
                      <DialogTitle className="text-primary">Mint WTT Tokens</DialogTitle>
                      <DialogDescription className="text-muted-foreground text-xs">
                        Specify how many WTT tokens you want to mint for testing.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-3">
                      <div className="flex items-center gap-3">
                        <Input
                          id="amount"
                          type="number"
                          value={mintAmount}
                          onChange={handleAmountChange}
                          className="bg-terminal-background/60 border-terminal-border text-primary h-9"
                        />
                        <Button 
                          variant="terminal" 
                          onClick={handleMint}
                          className="text-xs h-9"
                        >
                          Mint
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
          {chainId !== 59141 && (
            <Button
              onClick={addNetwork}
              variant="outline"
              size="sm"
              className="w-full flex items-center gap-2 mt-2"
            >
              🦊 Add Linea Sepolia Network
            </Button>
          )}
        </div>
        
        <DropdownMenuSeparator className="bg-terminal-border m-0" />
        <DropdownMenuItem 
          onClick={disconnectWallet}
          className="m-0 rounded-none text-xs py-2.5 text-destructive focus:text-destructive cursor-pointer flex items-center gap-2"
        >
          <LogOut className="h-3.5 w-3.5" />
          Disconnect Wallet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 