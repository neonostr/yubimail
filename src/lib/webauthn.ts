import { arrayBufferToBase64, base64ToArrayBuffer } from './crypto';

const RP_NAME = 'YubiMail';
const RP_ID = window.location.hostname;

// Fixed application-specific PRF salt
let prfSaltCache: ArrayBuffer | null = null;

async function getPrfSalt(): Promise<ArrayBuffer> {
  if (prfSaltCache) return prfSaltCache;
  const encoded = new TextEncoder().encode('YubiMail-vault-prf-v1');
  prfSaltCache = await crypto.subtle.digest('SHA-256', encoded);
  return prfSaltCache;
}

function generateUserId(): ArrayBuffer {
  return crypto.getRandomValues(new Uint8Array(16)).buffer as ArrayBuffer;
}

export interface WebAuthnResult {
  credentialId: string;
  rawId: ArrayBuffer;
  prfOutput?: ArrayBuffer;
  prfSupported: boolean;
}

export async function registerCredential(
  username: string = 'yubimail-user'
): Promise<WebAuthnResult> {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  const prfSalt = await getPrfSalt();

  const createOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: RP_NAME,
      id: RP_ID,
    },
    user: {
      id: generateUserId(),
      name: username,
      displayName: username,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },   // ES256
      { alg: -257, type: 'public-key' },  // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'cross-platform',
      residentKey: 'discouraged',
      userVerification: 'discouraged',
    },
    timeout: 60000,
    attestation: 'none',
    extensions: {
      // @ts-ignore - PRF extension not yet in TypeScript types
      prf: { eval: { first: new Uint8Array(prfSalt) } },
    } as any,
  };

  const credential = (await navigator.credentials.create({
    publicKey: createOptions,
  })) as PublicKeyCredential;

  if (!credential) {
    throw new Error('Failed to create credential');
  }

  const rawId = credential.rawId;
  const credentialId = arrayBufferToBase64(rawId);

  // Check PRF support from extension results
  const extResults = credential.getClientExtensionResults() as any;
  const prfResult = extResults?.prf;
  let prfOutput: ArrayBuffer | undefined;
  let prfSupported = false;

  if (prfResult?.enabled) {
    // PRF is supported but results come during authentication, not registration
    // We need to do an immediate authentication to get the PRF output
    prfSupported = true;
  }

  if (prfResult?.results?.first) {
    prfOutput = prfResult.results.first;
    prfSupported = true;
  }

  // If PRF indicated support but no output yet, do an auth to get it
  if (prfSupported && !prfOutput) {
    try {
      const authResult = await authenticateCredential([credentialId]);
      if (authResult.prfOutput) {
        prfOutput = authResult.prfOutput;
      } else {
        prfSupported = false;
      }
    } catch {
      prfSupported = false;
    }
  }

  return { credentialId, rawId, prfOutput, prfSupported };
}

export async function authenticateCredential(
  allowedCredentialIds: string[]
): Promise<WebAuthnResult> {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  const prfSalt = await getPrfSalt();

  const allowCredentials: PublicKeyCredentialDescriptor[] =
    allowedCredentialIds.map((id) => ({
      id: base64ToArrayBuffer(id),
      type: 'public-key',
      transports: ['usb', 'nfc', 'ble'] as AuthenticatorTransport[],
    }));

  const getOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    rpId: RP_ID,
    allowCredentials,
    userVerification: 'discouraged',
    timeout: 60000,
    extensions: {
      // @ts-ignore
      prf: { eval: { first: new Uint8Array(prfSalt) } },
    } as any,
  };

  const assertion = (await navigator.credentials.get({
    publicKey: getOptions,
  })) as PublicKeyCredential;

  if (!assertion) {
    throw new Error('Authentication failed');
  }

  const extResults = assertion.getClientExtensionResults() as any;
  const prfResult = extResults?.prf;
  let prfOutput: ArrayBuffer | undefined;
  let prfSupported = false;

  if (prfResult?.results?.first) {
    prfOutput = prfResult.results.first;
    prfSupported = true;
  }

  return {
    credentialId: arrayBufferToBase64(assertion.rawId),
    rawId: assertion.rawId,
    prfOutput,
    prfSupported,
  };
}

export function isWebAuthnSupported(): boolean {
  return !!(
    window.PublicKeyCredential &&
    navigator.credentials?.create &&
    navigator.credentials?.get
  );
}
