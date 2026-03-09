

## Upgrade to WebAuthn PRF Extension for True Key Derivation

### Problem
Currently, the vault encryption key is derived from `rawId`, which is a public credential identifier stored in localStorage. Anyone with access to the browser storage can reconstruct the key without the physical YubiKey.

### Solution
Use the WebAuthn **PRF extension** (`prf`) to derive a secret directly from the authenticator's internal `hmac-secret`. This secret never leaves the YubiKey and cannot be extracted from stored data. Fall back to `rawId`-based derivation (with a visible warning) for authenticators that don't support PRF.

### Changes

**1. `src/lib/webauthn.ts`** — Add PRF extension to both registration and authentication

- During `registerCredential`: add `extensions: { prf: { eval: { first: <salt> } } }` to creation options. After creation, check `credential.getClientExtensionResults().prf` for support. Return `{ credentialId, rawId, prfOutput?, prfSupported }`.
- During `authenticateCredential`: add same PRF extension to get options. Extract `prf.results.first` from extension results. Return `{ credentialId, rawId, prfOutput?, prfSupported }`.
- The PRF salt will be a fixed application-specific value (SHA-256 of "YubiMail-vault-prf-v1") so the same secret is derived each time.

**2. `src/lib/vault.ts`** — Use PRF output as key material when available

- `createVault` and `unlockVault` accept a new `keyMaterial: ArrayBuffer` parameter (either PRF output or rawId fallback).
- Store a `prfEnabled: boolean` flag in the `EncryptedVault` metadata so we know which mode was used.

**3. `src/types/vault.ts`** — Add `prfEnabled` field to `EncryptedVault`

**4. `src/components/OnboardingScreen.tsx`** — Pass PRF output through; show a warning banner if PRF is not supported (fallback mode).

**5. `src/components/SettingsDialog.tsx`** — When adding a new key, use PRF extension. Show PRF support status per key.

### Security Model
- **PRF supported**: Encryption key derived from a hardware-bound secret. Stealing localStorage is useless without the physical key.
- **PRF not supported (fallback)**: Same as current behavior (rawId-based), but with a visible warning telling the user their authenticator doesn't provide full hardware-bound encryption.

