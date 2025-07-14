"use client";

import React, { useState, useEffect } from 'react';
import { RLNStatusIndicator } from '../../RLNStatusIndicator';
import { KeystoreEntity } from '@waku/rln';
import { useRLN } from '../../../contexts/rln/RLNContext';
import { useWallet } from '../../../contexts/wallet';
import { TerminalWindow } from '../../ui/terminal-window';
import { ToggleGroup, ToggleGroupItem } from '../../ui/toggle-group';
import { Button } from '../../ui/button';
import { membershipRegistration, type ContentSegment } from '../../../content/index';
import { toast } from 'sonner';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../../ui/tooltip';
interface MembershipRegistrationProps {
  tabId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function MembershipRegistration({ tabId: _tabId }: MembershipRegistrationProps) {
  const { registerMembership, isInitialized, isStarted, error, isLoading, getPriceForRateLimit } = useRLN();
  const { isConnected, chainId } = useWallet();

  // Replace slider state with discrete options
  const [rateLimit, setRateLimit] = useState<number>(300); // Default to Standard
  const [isRegistering, setIsRegistering] = useState(false);
  const [saveToKeystore, setSaveToKeystore] = useState(true);
  const [keystorePassword, setKeystorePassword] = useState('');
  const [registrationResult, setRegistrationResult] = useState<{
    success?: boolean;
    error?: string;
    txHash?: string;
    warning?: string;
    credentials?: KeystoreEntity;
    keystoreHash?: string;
  }>({});

  const isLineaSepolia = chainId === 59141;

  const [price, setPrice] = useState<string>('');
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !isInitialized || !isStarted ) return;
    let cancelled = false;
    setPrice('');
    setPriceError(null);
    setPriceLoading(true);
    (async () => {
      try {
        const result = await getPriceForRateLimit(rateLimit);
        if (!cancelled) {
          setPrice(result.price.toString());
        }
      } catch {
        if (!cancelled) {
          setPriceError('Could not fetch price');
        }
      } finally {
        if (!cancelled) setPriceLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [rateLimit, getPriceForRateLimit, isLoading, isInitialized, isStarted]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      setRegistrationResult({ success: false, error: 'Please connect your wallet first' });
      return;
    }
    
    if (!isInitialized || !isStarted) {
      setRegistrationResult({ success: false, error: 'RLN is not initialized' });
      return;
    }
    
    if (!isLineaSepolia) {
      setRegistrationResult({ success: false, error: 'Please switch to Linea Sepolia network' });
      return;
    }
    
    // Validate keystore password if saving to keystore
    if (saveToKeystore && keystorePassword.length < 8) {
      setRegistrationResult({ 
        success: false, 
        error: 'Keystore password must be at least 8 characters long' 
      });
      return;
    }
    
    setIsRegistering(true);
    setRegistrationResult({});
    
    try {
      setRegistrationResult({ 
        success: undefined, 
        warning: 'Please check your wallet to sign the registration message.' 
      });
      
      // Pass save options if saving to keystore
      const saveOptions = saveToKeystore ? { password: keystorePassword } : undefined;
      
      const result = await registerMembership(rateLimit, saveOptions);
      
      setRegistrationResult({
        ...result,
        credentials: result.credentials
      });
      
      // Clear password field after successful registration
      if (result.success) {
        setKeystorePassword('');
      }
    } catch (error) {
      setRegistrationResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="space-y-6 max-w-full">
      <TerminalWindow className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-mono font-medium text-primary cursor-blink">
            {membershipRegistration.title}
          </h2>
          <RLNStatusIndicator />
        </div>
        <div className="space-y-6">
          {/* Network Warning */}
          {isConnected && !isLineaSepolia && (
            <div className="mb-4 p-3 border border-destructive/20 bg-destructive/5 rounded">
              <p className="text-sm text-destructive font-mono flex items-center">
                <span className="mr-2">⚠️</span>
                <span>{membershipRegistration.networkWarning}</span>
              </p>
            </div>
          )}
          
          {/* Informational Box */}
          <div className="pt-4">
            <div className="flex items-center mb-3">
              <span className="text-primary font-mono font-medium mr-2">{">"}</span>
              <h3 className="text-md font-mono font-semibold text-primary">
                {membershipRegistration.infoHeader}
              </h3>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-md font-mono font-semibold text-primary cursor-blink">
                {membershipRegistration.aboutTitle}
              </h4>
              {membershipRegistration.about.map((paragraph: ContentSegment[], i: number) => (
                <p key={i} className="text-sm text-foreground mb-2 opacity-90">
                  {paragraph.map((segment: ContentSegment, j: number) => (
                    segment.type === 'link' ? (
                      <a 
                        key={j}
                        href={segment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {segment.content}
                      </a>
                    ) : (
                      <span key={j}>{segment.content}</span>
                    )
                  ))}
                </p>
              ))}
            </div>
          </div>

          <div className="border-t border-terminal-border pt-6 mt-4">
            {!isConnected ? (
              <div className="text-warning-DEFAULT font-mono text-sm mt-4 flex items-center">
                <span className="mr-2">ℹ️</span>
                {membershipRegistration.connectWalletPrompt}
              </div>
            ) : !isInitialized || !isStarted ? (
              <div className="text-warning-DEFAULT font-mono text-sm mt-4 flex items-center">
                <span className="mr-2">ℹ️</span>
                {isLoading ? 'Initializing RLN...' : membershipRegistration.initializePrompt}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <label 
                    htmlFor="rateLimit" 
                    className="block text-sm font-mono text-muted-foreground mb-2 flex items-center gap-1"
                  >
                    Rate Limit (messages per epoch)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="ml-1 cursor-pointer align-middle inline-flex items-center justify-center">
                            {/* Unicode info icon, styled */}
                            <span className="w-4 h-4 rounded-full border border-muted-foreground text-muted-foreground flex items-center justify-center text-xs font-bold" style={{ fontFamily: 'monospace' }}>i</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          1 epoch = 10 minutes
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </label>
                  <div className="flex items-center space-x-4 py-2">
                    <ToggleGroup
                      type="single"
                      value={String(rateLimit)}
                      onValueChange={(value) => {
                        if (value === '300' || value === '600') setRateLimit(Number(value));
                      }}
                      className="w-full"
                    >
                      <ToggleGroupItem value="300" className="flex-1 flex flex-col items-center">
                        <span>Standard (300)</span>
                        <span className="text-xs text-muted-foreground">lower deposit</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem value="600" className="flex-1 flex flex-col items-center">
                        <span>Max (600)</span>
                        <span className="text-xs text-muted-foreground">requires higher deposit. more messages.</span>
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  {/* Show calculated token spend for selected rate limit */}
                  <div className="text-xs text-muted-foreground font-mono mt-1">
                    {priceLoading ? (
                      <>Token spend required: <span className="italic">Loading...</span></>
                    ) : priceError ? (
                      <>Token spend required: <span className="text-destructive">{priceError}</span></>
                    ) : (
                      <>Token spend required: <span>{price}</span> WTT</>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id="saveToKeystore"
                      checked={saveToKeystore}
                      onChange={(e) => setSaveToKeystore(e.target.checked)}
                      className="h-4 w-4 rounded bg-terminal-background border-terminal-border text-primary focus:ring-primary"
                    />
                    <label
                      htmlFor="saveToKeystore"
                      className="ml-2 text-sm font-mono text-foreground"
                    >
                      {membershipRegistration.form.saveToKeystoreLabel}
                    </label>
                  </div>

                  {saveToKeystore && (
                    <div>
                      <label
                        htmlFor="keystorePassword"
                        className="block text-sm font-mono text-muted-foreground mb-2"
                      >
                        {membershipRegistration.form.passwordLabel}
                      </label>
                      <input
                        type="password"
                        id="keystorePassword"
                        value={keystorePassword}
                        onChange={(e) => setKeystorePassword(e.target.value)}
                        placeholder={membershipRegistration.form.passwordPlaceholder}
                        className="w-full px-3 py-2 bg-terminal-background border border-terminal-border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full"
                >
                  {isRegistering ? membershipRegistration.form.registeringButton : membershipRegistration.form.registerButton}
                </Button>
              </form>
            )}
          </div>

          {/* Registration Result */}
          {registrationResult.warning && (
            <div className="mt-4 p-3 border border-warning-DEFAULT/20 bg-warning-DEFAULT/5 rounded">
              <p className="text-sm text-warning-DEFAULT font-mono flex items-center">
                <span className="mr-2">⚠️</span>
                {registrationResult.warning}
              </p>
            </div>
          )}
          {registrationResult.error && (
            <div className="mt-4 p-3 border border-destructive/20 bg-destructive/5 rounded">
              <p className="text-sm text-destructive font-mono flex items-center">
                <span className="mr-2">⚠️</span>
                {registrationResult.error}
              </p>
            </div>
          )}
          {registrationResult.success && (
            <div className="mt-4 p-3 border border-success-DEFAULT/20 bg-success-DEFAULT/5 rounded">
              <p className="text-sm text-success-DEFAULT font-mono mb-2 flex items-center">
                <span className="mr-2">✓</span>
                Membership registered successfully!
              </p>
              {registrationResult.txHash && (
                <p className="text-xs text-success-DEFAULT font-mono opacity-80 break-all">
                  Transaction Hash: {registrationResult.txHash}
                </p>
              )}
            </div>
          )}
        </div>
      </TerminalWindow>
    </div>
  );
} 