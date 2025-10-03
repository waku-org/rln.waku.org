import { RLN_REGISTRATION_CONTRACT_ADDRESS } from '../contracts/constants';

export type ContentSegment = {
  type: 'text' | 'link';
  content: string;
  url?: string;
};

export type Paragraph = ContentSegment[];

// Content for RLN Membership Registration
export const membershipRegistration = {
  title: "RLN Membership Registration",
  aboutTitle: "About RLN Membership on Linea Sepolia",
  about: [
    [
      { type: 'text', content: 'RLN (' },
      { type: 'link', content: 'Rate Limiting Nullifier', url: 'https://github.com/Rate-Limiting-Nullifier' },
      { type: 'text', content: ') membership allows you to participate in ' },
      { type: 'link', content: 'Waku RLN Relay', url: 'https://blog.waku.org/explanation-series-rln-relay/' },
      { type: 'text', content: ' with rate limiting protection, without exposing your private keys on your node.' }
    ],
    [
      { type: 'text', content: 'This application is configured to use the ' },
      { type: 'link', content: 'Linea Sepolia', url: `https://sepolia.lineascan.build/address/${RLN_REGISTRATION_CONTRACT_ADDRESS.toLowerCase()}` },
      { type: 'text', content: ' testnet for RLN registrations.' }
    ],
    [
      { type: 'text', content: 'When you register, your wallet will sign a message that will be used to generate a ' },
      { type: 'link', content: 'cryptographic identity', url: 'https://github.com/waku-org/specs/blob/master/standards/application/rln-keystore.md' },
      { type: 'text', content: ' for your membership. This allows your node to prove it has permission to send messages without revealing your identity.' }
    ]
  ] as Paragraph[],
  infoHeader: "RLN Membership Info",
  connectWalletPrompt: "Please connect your wallet to register a membership",
  initializePrompt: "Please initialize RLN before registering a membership",
  networkWarning: "You are not connected to Linea Sepolia network. Please switch networks to register.",
  
  form: {
    rateLimitLabel: "Rate Limit (messages per epoch)",
    saveToKeystoreLabel: "Save credentials to keystore",
    passwordLabel: "Keystore Password (min 8 characters)",
    passwordPlaceholder: "Enter password to encrypt credentials",
    registerButton: "Register Membership",
    registeringButton: "Registering..."
  }
};

// Content for Keystore Management
export const keystoreManagement = {
  title: "Keystore Management",
  buttons: {
    import: "Import Keystore",
    export: "Export Keystore",
    view: "View",
    decrypt: "Decrypt",
    decrypting: "Decrypting...",
    remove: "Remove"
  },
  
  about: [
    [
      { type: 'text', content: 'Keystore management allows you to securely store, import, export and manage your ' },
      { type: 'link', content: 'RLN membership credentials', url: 'https://github.com/waku-org/specs/blob/master/standards/application/rln-keystore.md' },
      { type: 'text', content: '.' }
    ],
    [
      { type: 'text', content: 'Credentials are encrypted with your password and can be used across different devices or applications. Learn more about ' },
      { type: 'link', content: 'keystore security', url: 'https://github.com/waku-org/specs/blob/master/standards/application/rln-keystore.md#security-considerations' },
      { type: 'text', content: '.' }
    ],
    [
      { type: 'text', content: 'You can export your credentials as a file and import them on another device to use the same membership.' }
    ]
  ] as Paragraph[],
  
  infoHeader: "About Keystore Management",
  noCredentialsWarning: "Please initialize RLN before managing credentials",
  storedCredentialsTitle: "Stored Credentials",
  passwordPlaceholder: "Enter credential password",
  credentialDetailsTitle: "Credential Details",
  
  resources: {
    title: "Resources",
    links: [
      {
        name: "RLN Specs",
        url: "https://specs.status.im/spec/waku/rln-v1"
      },
      {
        name: "Waku GitHub",
        url: "https://github.com/waku-org/waku-rln-contract"
      },
      {
        name: "Keystore Documentation",
        url: "https://github.com/waku-org/specs/blob/master/standards/application/rln-keystore.md"
      }
    ]
  }
}; 