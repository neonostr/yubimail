import { deriveKey, encrypt, decrypt, generateSalt, arrayBufferToBase64, base64ToArrayBuffer } from './crypto';
import type { VaultData, EncryptedVault } from '@/types/vault';

const VAULT_STORAGE_KEY = 'yubimail-vault';

function getDefaultVault(): VaultData {
  return {
    accounts: [],
    registeredKeys: [],
    version: 1,
  };
}

export async function createVault(
  credentialId: string,
  rawId: ArrayBuffer
): Promise<{ vault: VaultData; key: CryptoKey }> {
  const vault = getDefaultVault();
  vault.registeredKeys.push({
    credentialId,
    publicKey: arrayBufferToBase64(rawId),
    registeredAt: Date.now(),
    label: 'Key 1',
  });

  const salt = generateSalt();
  const key = await deriveKey(rawId, salt);

  const jsonData = JSON.stringify(vault);
  const { iv, encrypted } = await encrypt(jsonData, key);

  const encryptedVault: EncryptedVault = {
    iv,
    data: encrypted,
    salt: arrayBufferToBase64(salt),
    keyIds: [credentialId],
  };

  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(encryptedVault));

  return { vault, key };
}

export async function unlockVault(
  credentialId: string,
  rawId: ArrayBuffer
): Promise<{ vault: VaultData; key: CryptoKey }> {
  const stored = localStorage.getItem(VAULT_STORAGE_KEY);
  if (!stored) {
    throw new Error('No vault found');
  }

  const encryptedVault: EncryptedVault = JSON.parse(stored);

  if (!encryptedVault.keyIds.includes(credentialId)) {
    throw new Error('This key is not registered with this vault');
  }

  const salt = base64ToArrayBuffer(encryptedVault.salt);
  const key = await deriveKey(rawId, salt);

  const jsonData = await decrypt(encryptedVault.data, encryptedVault.iv, key);
  const vault: VaultData = JSON.parse(jsonData);

  return { vault, key };
}

export async function saveVault(
  vault: VaultData,
  key: CryptoKey
): Promise<void> {
  const stored = localStorage.getItem(VAULT_STORAGE_KEY);
  if (!stored) throw new Error('No vault found');

  const encryptedVault: EncryptedVault = JSON.parse(stored);

  const jsonData = JSON.stringify(vault);
  const { iv, encrypted } = await encrypt(jsonData, key);

  encryptedVault.iv = iv;
  encryptedVault.data = encrypted;
  encryptedVault.keyIds = vault.registeredKeys.map((k) => k.credentialId);

  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(encryptedVault));
}

export function vaultExists(): boolean {
  return localStorage.getItem(VAULT_STORAGE_KEY) !== null;
}

export function getStoredKeyIds(): string[] {
  const stored = localStorage.getItem(VAULT_STORAGE_KEY);
  if (!stored) return [];
  try {
    const encryptedVault: EncryptedVault = JSON.parse(stored);
    return encryptedVault.keyIds;
  } catch {
    return [];
  }
}

export function clearVault(): void {
  localStorage.removeItem(VAULT_STORAGE_KEY);
}
