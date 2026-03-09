import {
  deriveKey, encrypt, decrypt, generateSalt, generateVmk, importVmk,
  exportKey, wrapVmk, unwrapVmk, arrayBufferToBase64, base64ToArrayBuffer
} from './crypto';
import type { VaultData, EncryptedVault, WrappedKey } from '@/types/vault';

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
  rawId: ArrayBuffer,
  keyMaterial: ArrayBuffer,
  prfEnabled: boolean
): Promise<{ vault: VaultData; key: CryptoKey; vmkBytes: ArrayBuffer }> {
  const vault = getDefaultVault();
  vault.registeredKeys.push({
    credentialId,
    publicKey: arrayBufferToBase64(rawId),
    registeredAt: Date.now(),
    label: 'Key 1',
  });

  // Generate random VMK
  const vmkBytes = generateVmk();
  const vmkKey = await importVmk(vmkBytes);

  // Encrypt vault data with VMK
  const jsonData = JSON.stringify(vault);
  const { iv, encrypted } = await encrypt(jsonData, vmkKey);

  // Wrap VMK with this key's derived wrapping key
  const salt = generateSalt();
  const wrappingKey = await deriveKey(keyMaterial, salt);
  const { wrappedVmk, wrappingIv } = await wrapVmk(vmkBytes, wrappingKey);

  const wrappedKeyEntry: WrappedKey = {
    credentialId,
    wrappedVmk,
    wrappingIv,
    salt: arrayBufferToBase64(salt),
  };

  const encryptedVault: EncryptedVault = {
    iv,
    data: encrypted,
    wrappedKeys: [wrappedKeyEntry],
    prfEnabled,
  };

  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(encryptedVault));

  return { vault, key: vmkKey, vmkBytes };
}

export async function unlockVault(
  credentialId: string,
  keyMaterial: ArrayBuffer
): Promise<{ vault: VaultData; key: CryptoKey; vmkBytes: ArrayBuffer }> {
  const stored = localStorage.getItem(VAULT_STORAGE_KEY);
  if (!stored) throw new Error('No vault found');

  const encryptedVault: EncryptedVault = JSON.parse(stored);

  // Legacy migration: old format has salt/keyIds but no wrappedKeys
  if (!encryptedVault.wrappedKeys && encryptedVault.salt) {
    return migrateAndUnlock(encryptedVault, credentialId, keyMaterial);
  }

  const wrappedEntry = encryptedVault.wrappedKeys.find(
    (w) => w.credentialId === credentialId
  );
  if (!wrappedEntry) {
    throw new Error('This key is not registered with this vault');
  }

  // Derive wrapping key and unwrap VMK
  const salt = base64ToArrayBuffer(wrappedEntry.salt);
  const wrappingKey = await deriveKey(keyMaterial, salt);
  const vmkBytes = await unwrapVmk(wrappedEntry.wrappedVmk, wrappedEntry.wrappingIv, wrappingKey);
  const vmkKey = await importVmk(vmkBytes);

  // Decrypt vault data
  const jsonData = await decrypt(encryptedVault.data, encryptedVault.iv, vmkKey);
  const vault: VaultData = JSON.parse(jsonData);

  return { vault, key: vmkKey, vmkBytes };
}

// Migrate old single-key vault to VMK architecture
async function migrateAndUnlock(
  encryptedVault: EncryptedVault & { salt?: string; keyIds?: string[] },
  credentialId: string,
  keyMaterial: ArrayBuffer
): Promise<{ vault: VaultData; key: CryptoKey; vmkBytes: ArrayBuffer }> {
  if (!encryptedVault.keyIds?.includes(credentialId)) {
    throw new Error('This key is not registered with this vault');
  }

  // Decrypt with old method
  const oldSalt = base64ToArrayBuffer(encryptedVault.salt!);
  const oldKey = await deriveKey(keyMaterial, oldSalt);
  const jsonData = await decrypt(encryptedVault.data, encryptedVault.iv, oldKey);
  const vault: VaultData = JSON.parse(jsonData);

  // Generate new VMK and re-encrypt
  const vmkBytes = generateVmk();
  const vmkKey = await importVmk(vmkBytes);
  const { iv, encrypted } = await encrypt(jsonData, vmkKey);

  // Wrap VMK for this key
  const newSalt = generateSalt();
  const wrappingKey = await deriveKey(keyMaterial, newSalt);
  const { wrappedVmk, wrappingIv } = await wrapVmk(vmkBytes, wrappingKey);

  const migrated: EncryptedVault = {
    iv,
    data: encrypted,
    wrappedKeys: [{
      credentialId,
      wrappedVmk,
      wrappingIv,
      salt: arrayBufferToBase64(newSalt),
    }],
    prfEnabled: encryptedVault.prfEnabled,
  };

  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(migrated));

  return { vault, key: vmkKey, vmkBytes };
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
  // Update wrappedKeys credentialIds to match registered keys
  // (remove wrapped entries for keys that were removed from vault data)
  encryptedVault.wrappedKeys = encryptedVault.wrappedKeys.filter(
    (w) => vault.registeredKeys.some((k) => k.credentialId === w.credentialId)
  );

  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(encryptedVault));
}

export async function addKeyToVault(
  vmkBytes: ArrayBuffer,
  newCredentialId: string,
  newKeyMaterial: ArrayBuffer
): Promise<void> {
  const stored = localStorage.getItem(VAULT_STORAGE_KEY);
  if (!stored) throw new Error('No vault found');

  const encryptedVault: EncryptedVault = JSON.parse(stored);

  const salt = generateSalt();
  const wrappingKey = await deriveKey(newKeyMaterial, salt);
  const { wrappedVmk, wrappingIv } = await wrapVmk(vmkBytes, wrappingKey);

  encryptedVault.wrappedKeys.push({
    credentialId: newCredentialId,
    wrappedVmk,
    wrappingIv,
    salt: arrayBufferToBase64(salt),
  });

  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(encryptedVault));
}

export async function removeKeyFromVault(credentialId: string): Promise<void> {
  const stored = localStorage.getItem(VAULT_STORAGE_KEY);
  if (!stored) throw new Error('No vault found');

  const encryptedVault: EncryptedVault = JSON.parse(stored);
  encryptedVault.wrappedKeys = encryptedVault.wrappedKeys.filter(
    (w) => w.credentialId !== credentialId
  );

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
    // Support both new and legacy format
    if (encryptedVault.wrappedKeys) {
      return encryptedVault.wrappedKeys.map((w) => w.credentialId);
    }
    return (encryptedVault as any).keyIds || [];
  } catch {
    return [];
  }
}

export function isVaultPrfEnabled(): boolean {
  const stored = localStorage.getItem(VAULT_STORAGE_KEY);
  if (!stored) return false;
  try {
    const encryptedVault: EncryptedVault = JSON.parse(stored);
    return encryptedVault.prfEnabled ?? false;
  } catch {
    return false;
  }
}

export function clearVault(): void {
  localStorage.removeItem(VAULT_STORAGE_KEY);
}
