import React, { useState } from 'react';
import { useKeystore } from '../../../contexts/keystore/KeystoreContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TerminalWindow } from '@/components/ui/terminal-window';
import { toast } from '@/components/ui/toast';
import { Copy } from 'lucide-react';

function CodeBlock({ code }: { code: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    toast({ message: 'Copied to clipboard!', type: 'success' });
  };
  return (
    <div className="relative my-2 flex items-center group">
      <pre className="bg-terminal-background border border-terminal-border rounded px-3 py-2 text-xs font-mono overflow-x-auto w-full pr-12">
        {code}
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 group-hover:opacity-100"
        onClick={handleCopy}
        title="Copy to clipboard"
        type="button"
        tabIndex={0}
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function RunNodeTab({ tabId }: { tabId: string }) {
  const {
    hasStoredCredentials,
    storedCredentialsHashes,
    credentialAliases,
    exportCredential,
  } = useKeystore();

  const [exportPassword, setExportPassword] = useState('');
  const [selectedCredential, setSelectedCredential] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async (hash: string) => {
    setExportError(null);
    try {
      if (!exportPassword) {
        setExportError('Please enter your keystore password to export');
        return;
      }
      const keystore = await exportCredential(hash, exportPassword);
      // Download as file
      const blob = new Blob([JSON.stringify(keystore)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'keystore.json';
      a.click();
      URL.revokeObjectURL(url);
      setExportPassword('');
      setSelectedCredential(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setExportError(err.message);
      } else {
        setExportError('Failed to export credential');
      }
    }
  };

  return (
    <div className="space-y-8 p-4" id={tabId}>
      <TerminalWindow title="Run a Node" className="mb-8">
        <h2 className="text-lg font-mono font-medium mb-6">How to Run a Waku Node</h2>
        <ol className="space-y-8 list-decimal ml-6">
          {/* Step 1: Export Keystore with UI */}
          <li className="space-y-2">
            <div className="font-mono text-base font-semibold text-primary mb-1">Export Your Keystore</div>
            <div className="text-sm text-foreground/90 mb-1">
              Select your RLN keystore from the list below and click <b>Export Keystore</b>.<br />
              This will download a file (e.g., <code>keystore.json</code>) to your computer.
            </div>
            {/* Keystore Export UI */}
            {!hasStoredCredentials ? (
              <div className="p-3 border border-warning-DEFAULT/20 bg-warning-DEFAULT/5 rounded text-warning-DEFAULT">
                No keystores found. Please register a membership and generate a keystore first.
              </div>
            ) : (
              <div className="space-y-4">
                {storedCredentialsHashes.map((hash: string) => {
                  const alias = credentialAliases[hash] || `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
                  return (
                    <div key={hash} className="p-4 border rounded bg-terminal-background/30 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <span className="font-mono text-sm text-foreground">{alias}</span>
                      {selectedCredential === hash ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="password"
                            value={exportPassword}
                            onChange={(e) => setExportPassword(e.target.value)}
                            placeholder="Enter password to export"
                            className="h-8 text-sm"
                          />
                          <Button
                            variant="terminal"
                            size="sm"
                            onClick={() => handleExport(hash)}
                          >
                            Export
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedCredential(null); setExportPassword(''); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="terminal"
                          size="sm"
                          onClick={() => setSelectedCredential(hash)}
                        >
                          Export Keystore
                        </Button>
                      )}
                    </div>
                  );
                })}
                {exportError && <div className="text-red-600 text-sm mt-2">{exportError}</div>}
              </div>
            )}
          </li>

          {/* Step 2: Set Up nwaku-compose */}
          <li className="space-y-2">
            <div className="font-mono text-base font-semibold text-primary mb-1">Set Up nwaku-compose</div>
            <div className="text-sm text-foreground/90 mb-1">
              If you haven’t already, clone the nwaku-compose repository:
            </div>
            <CodeBlock code={`git clone https://github.com/waku-org/nwaku-compose.git\ncd nwaku-compose`} />
            <div className="mt-2 p-2 border-l-4 border-info-DEFAULT bg-info-DEFAULT/10 text-info-DEFAULT text-xs font-mono">
              Make sure you have Docker and docker-compose installed.
            </div>
          </li>

          {/* Step 3: Place Your Keystore */}
          <li className="space-y-2">
            <div className="font-mono text-base font-semibold text-primary mb-1">Place Your Keystore</div>
            <div className="text-sm text-foreground/90 mb-1">
              Copy your exported <code>keystore.json</code> file into the <code>keystore/</code> directory inside your <code>nwaku-compose</code> folder.<br />
              Replace any existing file if prompted.
            </div>
          </li>

          {/* Step 4: Configure Environment */}
          <li className="space-y-2">
            <div className="font-mono text-base font-semibold text-primary mb-1">Configure Environment</div>
            <div className="text-sm text-foreground/90 mb-1">
              Copy <code>.env.example</code> to <code>.env</code>:
            </div>
            <CodeBlock code={`cp .env.example .env`} />
            <div className="text-sm text-foreground/90 mt-2">
              Open <code>.env</code> in your editor and fill in the required values:
              <ul className="list-disc ml-6 text-sm mt-1">
                <li><b>Ethereum Sepolia HTTP endpoint</b> (e.g., from Infura)</li>
                <li><b>Ethereum Sepolia account</b> (with a small balance)</li>
                <li><b>Password</b> (the one you used to encrypt your keystore)</li>
              </ul>
            </div>
          </li>

          {/* Step 5: (Optional) Set Database Parameters */}
          <li className="space-y-2">
            <div className="font-mono text-base font-semibold text-primary mb-1">(Optional) Set Database Parameters</div>
            <div className="text-sm text-foreground/90 mb-1">
              To set storage size, run:
            </div>
            <CodeBlock code={`./set_storage_retention.sh`} />
            <div className="text-sm text-foreground/90 mt-2">
              or manually set <code>STORAGE_SIZE</code> in <code>.env</code>.<br />
              To set Postgres memory, run:
            </div>
            <CodeBlock code={`./set_postgres_shm.sh`} />
            <div className="text-sm text-foreground/90 mt-2">
              or set <code>POSTGRES_SHM</code> in <code>.env</code>.
            </div>
          </li>

          {/* Step 6: Start Your Node */}
          <li className="space-y-2">
            <div className="font-mono text-base font-semibold text-primary mb-1">Start Your Node</div>
            <div className="text-sm text-foreground/90 mb-1">
              Start all services:
            </div>
            <CodeBlock code={`docker-compose up -d`} />
            <div className="mt-2 p-2 border-l-4 border-info-DEFAULT bg-info-DEFAULT/10 text-info-DEFAULT text-xs font-mono">
              Your node will load your RLN membership from the keystore.
            </div>
          </li>

          {/* Step 7: Interact with Your Node */}
          <li className="space-y-2">
            <div className="font-mono text-base font-semibold text-primary mb-1">Interact with Your Node</div>
            <div className="text-sm text-foreground/90 mb-1">
              <div>Visit <b>localhost:4000</b> for the frontend chat.</div>
              <div>Visit <b>localhost:3000</b> for node metrics.</div>
              <div>Use the REST API as described in the nwaku-compose README.</div>
            </div>
          </li>
        </ol>
        <div className="mt-8 p-3 border border-warning-DEFAULT/40 bg-warning-DEFAULT/10 rounded text-warning-DEFAULT text-sm font-mono">
          <b>Note:</b> You do <u>NOT</u> need to run the <code>register_rln.sh</code> script—your RLN membership is already registered and stored in your exported keystore.
        </div>
      </TerminalWindow>
    </div>
  );
} 