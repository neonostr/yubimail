// AES-256-GCM encryption using Web Crypto API

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function deriveKey(
  keyMaterial: ArrayBuffer,
  salt: ArrayBuffer
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    'HKDF',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: new TextEncoder().encode('YubiMail-vault-key'),
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(
  data: string,
  key: CryptoKey
): Promise<{ iv: string; encrypted: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return {
    iv: arrayBufferToBase64(iv.buffer),
    encrypted: arrayBufferToBase64(encrypted),
  };
}

export async function decrypt(
  encryptedData: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const ivBuffer = base64ToArrayBuffer(iv);
  const dataBuffer = base64ToArrayBuffer(encryptedData);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    key,
    dataBuffer
  );

  return new TextDecoder().decode(decrypted);
}

export function generateSalt(): ArrayBuffer {
  return crypto.getRandomValues(new Uint8Array(32)).buffer;
}

// Generate a random 256-bit Vault Master Key
export function generateVmk(): ArrayBuffer {
  return crypto.getRandomValues(new Uint8Array(32)).buffer;
}

// Import raw VMK bytes as an AES-GCM CryptoKey
export async function importVmk(vmkBytes: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    vmkBytes,
    { name: 'AES-GCM', length: 256 },
    true, // extractable so we can export for wrapping
    ['encrypt', 'decrypt']
  );
}

// Export a CryptoKey to raw bytes
export async function exportKey(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey('raw', key);
}

// Wrap (encrypt) VMK bytes using a wrapping key derived from a YubiKey's PRF output
export async function wrapVmk(
  vmkBytes: ArrayBuffer,
  wrappingKey: CryptoKey
): Promise<{ wrappedVmk: string; wrappingIv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    vmkBytes
  );
  return {
    wrappedVmk: arrayBufferToBase64(wrapped),
    wrappingIv: arrayBufferToBase64(iv.buffer),
  };
}

// Unwrap (decrypt) VMK bytes using a wrapping key
export async function unwrapVmk(
  wrappedVmk: string,
  wrappingIv: string,
  wrappingKey: CryptoKey
): Promise<ArrayBuffer> {
  const ivBuffer = base64ToArrayBuffer(wrappingIv);
  const wrappedBuffer = base64ToArrayBuffer(wrappedVmk);
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    wrappingKey,
    wrappedBuffer
  );
}

export { arrayBufferToBase64, base64ToArrayBuffer };
