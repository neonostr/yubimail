export interface MailAccount {
  id: string;
  address: string;
  password: string;
  token: string;
  createdAt: number;
  tag?: string;
  autoDeleteAt?: number;
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

export interface WrappedKey {
  credentialId: string;
  wrappedVmk: string;   // base64 — VMK encrypted with this key's derived key
  wrappingIv: string;    // base64
  salt: string;          // base64 — per-key HKDF salt
}

export interface EncryptedVault {
  iv: string;
  data: string;
  wrappedKeys: WrappedKey[];
  prfEnabled: boolean;
  // Legacy fields (pre-VMK migration)
  salt?: string;
  keyIds?: string[];
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
