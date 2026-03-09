import { arrayBufferToBase64, base64ToArrayBuffer } from './crypto';

const RP_NAME = 'YubiMail';
const RP_ID = window.location.hostname;

function generateUserId(): ArrayBuffer {
  return crypto.getRandomValues(new Uint8Array(16)).buffer as ArrayBuffer;
}

export async function registerCredential(
  username: string = 'yubimail-user'
): Promise<{ credentialId: string; rawId: ArrayBuffer }> {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

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
  };

  const credential = (await navigator.credentials.create({
    publicKey: createOptions,
  })) as PublicKeyCredential;

  if (!credential) {
    throw new Error('Failed to create credential');
  }

  const rawId = credential.rawId;
  const credentialId = arrayBufferToBase64(rawId);

  return { credentialId, rawId };
}

export async function authenticateCredential(
  allowedCredentialIds: string[]
): Promise<{ credentialId: string; rawId: ArrayBuffer }> {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

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
  };

  const assertion = (await navigator.credentials.get({
    publicKey: getOptions,
  })) as PublicKeyCredential;

  if (!assertion) {
    throw new Error('Authentication failed');
  }

  return {
    credentialId: arrayBufferToBase64(assertion.rawId),
    rawId: assertion.rawId,
  };
}

export function isWebAuthnSupported(): boolean {
  return !!(
    window.PublicKeyCredential &&
    navigator.credentials?.create &&
    navigator.credentials?.get
  );
}
