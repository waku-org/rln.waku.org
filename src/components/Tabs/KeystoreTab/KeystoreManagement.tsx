"use client";

import React, { useState } from 'react';
import { useKeystore } from '../../../contexts/keystore/KeystoreContext';
import { useRLN } from '../../../contexts/rln/RLNContext';
import { readKeystoreFromFile, saveKeystoreCredentialToFile } from '../../../utils/keystore';
import { DecryptedCredentials, MembershipInfo, MembershipState } from '@waku/rln';
import { TerminalWindow } from '../../ui/terminal-window';
import { Button } from '../../ui/button';
import { Copy, Eye, Download, Trash2, ArrowDownToLine, Pencil, Check, X } from 'lucide-react';
import { KeystoreExporter } from '../../KeystoreExporter';
import { keystoreManagement, type ContentSegment } from '../../../content/index';
import { toast } from 'sonner';
import { CredentialDetails } from '@/components/CredentialDetails';
import { MembershipDetails } from '@/components/MembershipDetails';
import { Input } from "@/components/ui/input";

interface ExtendedMembershipInfo extends Omit<MembershipInfo, 'state'> {
  address: string;
  chainId: string;
  treeIndex: number;
  rateLimit: number;
  idCommitment: string;
  startBlock: number;
  endBlock: number;
  state: MembershipState;
  depositAmount: bigint;
  activeDuration: number;
  gracePeriodDuration: number;
  holder: string;
  token: string;
}

interface KeystoreManagementProps {
  tabId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function KeystoreManagement({ tabId: _tabId }: KeystoreManagementProps) {
  const { 
    hasStoredCredentials, 
    storedCredentialsHashes,
    credentialAliases,
    setCredentialAlias,
    error,
    exportCredential,
    importKeystore,
    removeCredential,
    getDecryptedCredential
  } = useKeystore();

  const {
    getMembershipInfo
  } = useRLN();

  const [exportPassword, setExportPassword] = useState<string>('');
  const [selectedCredential, setSelectedCredential] = useState<string | null>(null);
  const [viewPassword, setViewPassword] = useState<string>('');
  const [viewingCredential, setViewingCredential] = useState<string | null>(null);
  const [decryptedInfo, setDecryptedInfo] = useState<DecryptedCredentials | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [membershipInfo, setMembershipInfo] = useState<ExtendedMembershipInfo | null>(null);
  const [editingAliasHash, setEditingAliasHash] = useState<string | null>(null);
  const [currentAliasInput, setCurrentAliasInput] = useState<string>('');

  React.useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleExportKeystoreCredential = async (hash: string) => {
    try {
      if (!exportPassword) {
        toast.error('Please enter your keystore password to export');
        return;
      }
      const keystore = await exportCredential(hash, exportPassword);
      saveKeystoreCredentialToFile(keystore);
      setExportPassword('');
      setSelectedCredential(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export credential');
    }
  };

  const handleImportKeystore = async () => {
    try {
      const keystore = await readKeystoreFromFile();
      const success = importKeystore(keystore);
      if (!success) {
        toast.error('Failed to import keystore');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to import keystore');
    }
  };

  const handleRemoveCredential = (hash: string) => {
    try {
      removeCredential(hash);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove credential');
    }
  };

  const handleViewCredential = async (hash: string) => {
    if (!viewPassword) {
      toast.error('Please enter your keystore password to view credential');
      return;
    }
    
    setIsDecrypting(true);
    setMembershipInfo(null);
    
    try {
      const credential = await getDecryptedCredential(hash, viewPassword);
      setIsDecrypting(false);
      
      if (credential) {
        setDecryptedInfo(credential);
        const info = await getMembershipInfo(hash, viewPassword);
        setMembershipInfo(info as ExtendedMembershipInfo);
      } else {
        toast.error('Could not decrypt credential. Please check your password and try again.');
      }
    } catch (err) {
      setIsDecrypting(false);
      toast.error(err instanceof Error ? err.message : 'Failed to decrypt credential');
    }
  };

  // Reset view state when changing credentials
  React.useEffect(() => {
    if (viewingCredential !== selectedCredential) {
      setDecryptedInfo(null);
    }
  }, [viewingCredential, selectedCredential]);

  // Add a function to copy text to clipboard with visual feedback
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedHash(text);
        setTimeout(() => setCopiedHash(null), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  return (
    <div className="space-y-6">
      <TerminalWindow className="w-full">
        <h2 className="text-lg font-mono font-medium text-primary mb-4 cursor-blink">
          {keystoreManagement.title}
        </h2>
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={handleImportKeystore} 
              variant="terminal"
              className="group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center">
                <ArrowDownToLine className="w-4 h-4 mr-2" />
                {keystoreManagement.buttons.import}
              </span>
              <span className="absolute inset-0 bg-primary/10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200"></span>
            </Button>
            
            <KeystoreExporter />
          </div>
          
          {/* Warning - RLN not initialized */}
          {!hasStoredCredentials && (
            <div className="my-4 p-3 border border-warning-DEFAULT/20 bg-warning-DEFAULT/5 rounded">
              <p className="text-sm text-warning-DEFAULT font-mono flex items-center">
                <span className="mr-2">⚠️</span>
                {keystoreManagement.noCredentialsWarning}
              </p>
            </div>
          )}
          
          {/* About Section */}
          <div className="border-t border-terminal-border pt-4 mt-4">
            <div className="flex items-center mb-3">
              <span className="text-primary font-mono font-medium mr-2">{">"}</span>
              <h3 className="text-md font-mono font-semibold text-primary">
                {keystoreManagement.infoHeader}
              </h3>
            </div>
            
            <div className="space-y-3">
              {keystoreManagement.about.map((paragraph: ContentSegment[], i: number) => (
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

          {/* Resources Section */}
          <div className="border-t border-terminal-border pt-4">
            <h3 className="text-md font-mono font-semibold text-primary mb-3">
              {keystoreManagement.resources.title}
            </h3>
            <div className="flex flex-wrap gap-3">
              {keystoreManagement.resources.links.map((link: { name: string; url: string }, i: number) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>
          
          {/* Stored Credentials */}
          <div className="border-t border-terminal-border pt-6">
            <h3 className="text-sm font-mono font-medium text-muted-foreground mb-4">
              {keystoreManagement.storedCredentialsTitle}
            </h3>
            
            {hasStoredCredentials ? (
              <div className="space-y-4">
                {storedCredentialsHashes.map((hash) => {
                  const currentAlias = credentialAliases[hash] || '';
                  const displayValue = currentAlias || `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
                  const isEditing = editingAliasHash === hash;

                  return (
                    <div
                      key={hash}
                      className="p-4 rounded-md border border-terminal-border bg-terminal-background/30 hover:border-terminal-border/80 transition-colors"
                    >
                      <div className="flex flex-col space-y-3">
                        <div className="flex items-center justify-between">
                          {/* Display Alias/Hash or Edit Input */}
                          {isEditing ? (
                            <div className="flex items-center space-x-2 flex-grow mr-2">
                              <Input 
                                type="text"
                                value={currentAliasInput}
                                onChange={(e) => setCurrentAliasInput(e.target.value)}
                                placeholder="Enter alias..."
                                className="h-8 text-sm flex-grow"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-primary hover:text-primary"
                                onClick={() => {
                                  setCredentialAlias(hash, currentAliasInput);
                                  setEditingAliasHash(null);
                                  setCurrentAliasInput('');
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  setEditingAliasHash(null);
                                  setCurrentAliasInput('');
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 flex-grow">
                              <code className={`text-sm font-mono ${currentAlias ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {displayValue}
                              </code>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 p-0 ml-1 text-muted-foreground hover:text-accent"
                                onClick={() => {
                                  setEditingAliasHash(hash);
                                  setCurrentAliasInput(currentAlias); // Pre-fill input if alias exists
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 p-0 text-muted-foreground hover:text-accent"
                                onClick={() => copyToClipboard(hash)}
                                title="Copy Full Hash"
                              >
                                <Copy className="h-3 w-3" />
                                {copiedHash === hash && <span className="text-xs ml-1">Copied!</span>}
                              </Button>
                            </div>
                          )}

                          {/* Action Buttons (View, Export, Remove) - only show if not editing */}
                          {!isEditing && (
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-accent"
                                onClick={() => {
                                  setViewingCredential(hash);
                                  // Optionally clear previous details or require password again
                                  setDecryptedInfo(null); 
                                  setMembershipInfo(null);
                                  setViewPassword(''); // Clear password for safety
                                }}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-accent"
                                onClick={() => setSelectedCredential(hash)} // Set selected for export modal
                                title="Export Credential"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveCredential(hash)}
                                title="Remove Credential"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Password input for View Credential */}
                        {viewingCredential === hash && !decryptedInfo && (
                          <div className="flex items-center space-x-2 pt-2 border-t border-terminal-border/20">
                            <Input
                              type="password"
                              value={viewPassword}
                              onChange={(e) => setViewPassword(e.target.value)}
                              placeholder="Enter password to view details"
                              className="flex-grow h-8 text-sm"
                            />
                            <Button
                              variant="terminal"
                              size="sm"
                              onClick={() => handleViewCredential(hash)}
                              disabled={!viewPassword || isDecrypting}
                            >
                              {isDecrypting ? 'Decrypting...' : 'View'}
                            </Button>
                             <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingCredential(null)} // Cancel view
                            >
                              Cancel
                            </Button>
                          </div>
                        )}

                        {/* Password input for Export Credential */}
                        {selectedCredential === hash && (
                          <div className="flex items-center space-x-2 pt-2 border-t border-terminal-border/20">
                            <Input
                              type="password"
                              value={exportPassword}
                              onChange={(e) => setExportPassword(e.target.value)}
                              placeholder="Enter password to export"
                              className="flex-grow h-8 text-sm"
                            />
                            <Button
                              variant="terminal"
                              size="sm"
                              onClick={() => handleExportKeystoreCredential(hash)}
                              disabled={!exportPassword}
                            >
                              Confirm Export
                            </Button>
                             <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedCredential(null)} // Cancel export
                            >
                              Cancel
                            </Button>
                          </div>
                        )}

                        {/* Decrypted Credential Details */}
                        {viewingCredential === hash && decryptedInfo && (
                          <CredentialDetails decryptedInfo={decryptedInfo} copyToClipboard={copyToClipboard} />
                        )}
                        {/* Membership Details */}
                        {viewingCredential === hash && membershipInfo && (
                            <MembershipDetails membershipInfo={membershipInfo} copyToClipboard={copyToClipboard} hash={hash} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground font-mono bg-terminal-background/30 p-4 border border-terminal-border/50 rounded-md text-center">
                No credentials stored
              </div>
            )}
          </div>
        </div>
      </TerminalWindow>
    </div>
  );
} 