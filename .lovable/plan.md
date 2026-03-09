

## Multi-Key Support via Key Wrapping

### Problem
With PRF, each YubiKey produces a unique secret. The vault is encrypted with one key's PRF output, so other registered keys can't decrypt it.

### Solution: Vault Master Key (VMK) Architecture

```text
┌─────────────────────────────────────────────┐
│              Encrypted Vault                │
│         (AES-256-GCM with VMK)              │
└─────────────┬───────────────────────────────┘
              │
    ┌─────────┴─────────┐
    │   VMK (random)    │  ← never stored in plaintext
    └─────────┬─────────┘
              │
   ┌──────────┼──────────┐
   │          │          │
 wrap_1     wrap_2     wrap_3
(Key A)    (Key B)    (Key C)
   │          │          │
 PRF_A     PRF_B     PRF_C
(YubiKey1) (YubiKey2) (YubiKey3)
```

### Changes

**1. `src/types/vault.ts`** — Update `EncryptedVault` to store an array of wrapped VMK entries instead of a single salt:
```ts
interface WrappedKey {
  credentialId: string;
  wrappedVmk: string;   // base64 — VMK encrypted with this key's derived key
  wrappingIv: string;    // base64
  salt: string;          // base64 — per-key HKDF salt
}

interface EncryptedVault {
  iv: string;
  data: string;
  wrappedKeys: WrappedKey[];  // replaces salt + keyIds
  prfEnabled: boolean;
}
```

**2. `src/lib/crypto.ts`** — Add `wrapKey` and `unwrapKey` helpers (AES-KW or AES-GCM wrapping of the raw VMK bytes).

**3. `src/lib/vault.ts`**:
- `createVault`: Generate random 256-bit VMK → encrypt vault with VMK → derive wrapping key from PRF output → wrap VMK → store wrapped entry
- `unlockVault`: Find the matching `wrappedKey` entry by credentialId → derive wrapping key from PRF → unwrap VMK → decrypt vault
- `saveVault`: Re-encrypt vault data with the in-memory VMK (no change to wrapped keys)
- New `addKeyToVault(vmk, newCredentialId, newKeyMaterial, salt)`: wrap VMK with new key's derived key and append to `wrappedKeys`
- New `removeKeyFromVault(credentialId)`: remove wrapped entry

**4. `src/contexts/VaultContext.tsx`** — Store the raw VMK in memory (alongside the derived CryptoKey) so it can be wrapped for new keys.

**5. `src/components/SettingsDialog.tsx`** — When adding a key: register credential → get PRF output → call `addKeyToVault` with in-memory VMK. When removing: call `removeKeyFromVault`.

**6. `src/components/OnboardingScreen.tsx`** — Minimal changes; `createVault` API stays similar but internally uses VMK.

**7. Migration** — If an existing vault has the old `salt`/`keyIds` format (no `wrappedKeys`), migrate on unlock: decrypt with old method, generate VMK, re-encrypt with new architecture.

