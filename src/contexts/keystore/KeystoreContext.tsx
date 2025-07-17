"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Keystore, KeystoreEntity } from '@waku/rln';

export const LOCAL_STORAGE_KEYSTORE_KEY = 'waku-rln-keystore';
export const LOCAL_STORAGE_ALIASES_KEY = 'waku-rln-keystore-aliases';

interface KeystoreContextType {
  keystore: Keystore | null;
  isInitialized: boolean;
  error: string | null;
  hasStoredCredentials: boolean;
  storedCredentialsHashes: string[];
  credentialsCount: number;
  credentialAliases: { [hash: string]: string };
  decryptedCredentials: KeystoreEntity | null;
  hideCredentials: () => void;
  saveCredentials: (credentials: KeystoreEntity, password: string) => Promise<string>;
  exportCredential: (hash: string, password: string) => Promise<Keystore>;
  exportEntireKeystore: (password: string) => Promise<void>;
  importKeystore: (keystore: Keystore) => boolean;
  removeCredential: (hash: string) => void;
  getDecryptedCredential: (hash: string, password: string) => Promise<KeystoreEntity | null>;
  setCredentialAlias: (hash: string, alias: string) => void;
}

const KeystoreContext = createContext<KeystoreContextType | undefined>(undefined);

export function KeystoreProvider({ children }: { children: ReactNode }) {
  const [keystore, setKeystore] = useState<Keystore | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storedCredentialsHashes, setStoredCredentialsHashes] = useState<string[]>([]);
  const [credentialAliases, setCredentialAliases] = useState<{ [hash: string]: string }>({});
  const [decryptedCredentials, setDecryptedCredentials] = useState<KeystoreEntity | null>(null);

  // Initialize keystore and aliases
  useEffect(() => {
    try {
      const storedKeystore = localStorage.getItem(LOCAL_STORAGE_KEYSTORE_KEY);
      const storedAliases = localStorage.getItem(LOCAL_STORAGE_ALIASES_KEY);
      let keystoreInstance: Keystore;

      if (storedKeystore) {
        const loaded = Keystore.fromString(storedKeystore);
        if (loaded) {
          keystoreInstance = loaded;
        } else {
          keystoreInstance = Keystore.create();
        }
      } else {
        keystoreInstance = Keystore.create();
      }

      setKeystore(keystoreInstance);
      setStoredCredentialsHashes(keystoreInstance.keys());

      if (storedAliases) {
        try {
          setCredentialAliases(JSON.parse(storedAliases));
        } catch (aliasErr) {
          console.error("Error parsing aliases from localStorage:", aliasErr);
          setCredentialAliases({});
        }
      } else {
        setCredentialAliases({});
      }

      setIsInitialized(true);
    } catch (err) {
      console.error("Error initializing keystore:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize keystore");
    }
  }, []);

  // Save keystore to localStorage whenever it changes
  useEffect(() => {
    if (keystore && isInitialized) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYSTORE_KEY, keystore.toString());
      } catch (err) {
        console.warn("Could not save keystore to localStorage:", err);
      }
    }
  }, [keystore, isInitialized]);

  // Save aliases to localStorage whenever they change
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(LOCAL_STORAGE_ALIASES_KEY, JSON.stringify(credentialAliases));
      } catch (err) {
        console.warn("Could not save aliases to localStorage:", err);
      }
    }
  }, [credentialAliases, isInitialized]);

  const saveCredentials = async (credentials: KeystoreEntity, password: string): Promise<string> => {
    if (!keystore) {
      throw new Error("Keystore not initialized");
    }

    try {
      const hash = await keystore.addCredential(credentials, password);
      
      localStorage.setItem(LOCAL_STORAGE_KEYSTORE_KEY, keystore.toString());
      
      setStoredCredentialsHashes(keystore.keys());
      
      return hash;
    } catch (err) {
      console.error("Error saving credentials:", err);
      throw err;
    }
  };

  const getDecryptedCredential = async (hash: string, password: string): Promise<KeystoreEntity | null> => {
    if (!keystore) {
      throw new Error("Keystore not initialized");
    }

    try {
      // Get the credential from the keystore
      const credential = await keystore.readCredential(hash, password);
      if (credential) {
        setDecryptedCredentials(credential);
      }
      return credential || null;
    } catch (err) {
      console.error("Error reading credential:", err);
      throw err;
    }
  };

  const exportCredential = async (hash: string, password: string): Promise<Keystore> => {
    if (!keystore) {
      throw new Error("Keystore not initialized");
    }

    // Create a new keystore instance for the single credential
    const singleCredentialKeystore = Keystore.create();
    
    // Get the credential from the main keystore
    const credential = await keystore.readCredential(hash, password);
    if (!credential) {
      throw new Error("Credential not found");
    }
    
    // Add the credential to the new keystore
    await singleCredentialKeystore.addCredential(credential, password);
    console.log("Single credential keystore:", singleCredentialKeystore.toString());
    return singleCredentialKeystore;
  };

  const exportEntireKeystore = async (password: string): Promise<void> => {
    if (!keystore) {
      throw new Error("Keystore not initialized");
    }

    if (storedCredentialsHashes.length === 0) {
      throw new Error("No credentials to export");
    }

    try {
      // Verify the password works for at least one credential
      const firstHash = storedCredentialsHashes[0];
      const testCredential = await keystore.readCredential(firstHash, password);
      
      if (!testCredential) {
        throw new Error("Invalid password");
      }
      
      // If password is verified, export the entire keystore
      const filename = 'keystore.json';
      const blob = new Blob([keystore.toString()], { type: 'application/json' });
      
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error exporting keystore:", err);
      throw err;
    }
  };

  const importKeystore = (importedKeystore: Keystore): boolean => {
    try {
      const newAliases = {};
      setCredentialAliases(newAliases);
      localStorage.setItem(LOCAL_STORAGE_ALIASES_KEY, JSON.stringify(newAliases));

      setKeystore(importedKeystore);
      setStoredCredentialsHashes(importedKeystore.keys());
      localStorage.setItem(LOCAL_STORAGE_KEYSTORE_KEY, importedKeystore.toString());

      return true;
    } catch (err) {
      console.error("Error importing keystore:", err);
      setError(err instanceof Error ? err.message : "Failed to import keystore");
      return false;
    }
  };

  const removeCredential = (hash: string): void => {
    if (!keystore) {
      throw new Error("Keystore not initialized");
    }

    keystore.removeCredential(hash);
    const remainingHashes = keystore.keys();
    setStoredCredentialsHashes(remainingHashes);
    localStorage.setItem(LOCAL_STORAGE_KEYSTORE_KEY, keystore.toString());

    setCredentialAliases(prev => {
      const newAliases = { ...prev };
      delete newAliases[hash];
      localStorage.setItem(LOCAL_STORAGE_ALIASES_KEY, JSON.stringify(newAliases));
      return newAliases;
    });
  };

  const setCredentialAlias = (hash: string, alias: string) => {
    setCredentialAliases(prev => {
      const newAliases = { ...prev, [hash]: alias };
      localStorage.setItem(LOCAL_STORAGE_ALIASES_KEY, JSON.stringify(newAliases));
      return newAliases;
    });
  };

  const contextValue: KeystoreContextType = {
    keystore,
    isInitialized,
    error,
    hasStoredCredentials: storedCredentialsHashes.length > 0,
    storedCredentialsHashes,
    credentialsCount: storedCredentialsHashes.length,
    credentialAliases,
    saveCredentials,
    exportCredential,
    exportEntireKeystore,
    importKeystore,
    removeCredential,
    getDecryptedCredential,
    decryptedCredentials,
    setCredentialAlias,
    hideCredentials: () => {},
  };

  return (
    <KeystoreContext.Provider value={contextValue}>
      {children}
    </KeystoreContext.Provider>
  );
}

export function useKeystore() {
  const context = useContext(KeystoreContext);
  if (context === undefined) {
    throw new Error('useKeystore must be used within a KeystoreProvider');
  }
  return context;
} 