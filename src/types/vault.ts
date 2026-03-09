export interface MailAccount {
  id: string;
  address: string;
  password: string;
  token: string;
  createdAt: number;
  tag?: string;
  autoDeleteAt?: number; // timestamp when to auto-delete
  autoDeleteDuration?: '1h' | '24h' | '7d';
}

export interface RegisteredKey {
  credentialId: string;
  publicKey: string; // base64 encoded
  registeredAt: number;
  label?: string;
}

export interface VaultData {
  accounts: MailAccount[];
  registeredKeys: RegisteredKey[];
  version: number;
}

export interface EncryptedVault {
  iv: string; // base64
  data: string; // base64 encrypted
  salt: string; // base64
  keyIds: string[]; // credential IDs that can unlock this vault
}

export interface Email {
  id: string;
  from: { address: string; name: string };
  to: { address: string; name: string }[];
  subject: string;
  intro: string;
  text?: string;
  html?: string[];
  seen: boolean;
  createdAt: string;
  hasAttachments: boolean;
}

export interface MailDomain {
  id: string;
  domain: string;
  isActive: boolean;
  isPrivate: boolean;
}
