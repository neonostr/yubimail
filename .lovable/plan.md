

## YubiMail — Secure Disposable Email Dashboard

### 1. Onboarding & Vault Setup
- **First visit**: Welcome screen explaining YubiMail — tap your YubiKey to create a new vault or unlock an existing one
- **WebAuthn registration**: Use the WebAuthn API to register YubiKeys; derive an encryption key from the credential using `PRF` extension (or fallback to `credentialId`-based key derivation with Web Crypto API)
- **Add more keys anytime**: Settings panel lets users register additional YubiKeys that can unlock the same vault
- **Vault stored in IndexedDB**: All encrypted data persists locally as encrypted blobs

### 2. Encryption Layer
- AES-256-GCM encryption using Web Crypto API
- Encryption key derived from YubiKey authentication (PRF extension or credential-based HKDF)
- All mail.tm credentials, emails metadata, tags, and timers encrypted before storage
- On unlock: decrypt vault into memory; on lock/close: wipe memory

### 3. Dashboard Layout (Dark Theme)
- **Sidebar** (left): List of disposable email addresses with status indicators, tags, and auto-delete countdown timers
- **Main panel** (right): Inbox view for the selected address showing email list → email detail
- **Top bar**: Lock button, add new address button, settings gear
- Minimal dark design with subtle borders, monospace accents for email addresses

### 4. Disposable Email Management (mail.tm API)
- **Create address**: Generate a new mail.tm account (random or custom username), store credentials encrypted in vault
- **Delete address**: Delete from mail.tm API and remove from vault
- **Copy to clipboard**: One-click copy button next to each address
- **Auto-delete timers**: Set 1hr, 24hr, or 7-day timers on addresses; background check on unlock deletes expired ones
- **Service tagging**: Tag each address with what service it was used for (e.g., "Netflix trial", "Forum signup")

### 5. Inbox & Email Viewing
- Fetch emails via mail.tm API using stored credentials
- Clean list view: sender, subject, date, read/unread status
- Click to expand email with rendered HTML content (sanitized) or plain text
- Auto-refresh with polling interval
- Delete individual emails

### 6. Settings Panel
- Manage registered YubiKeys (add/remove)
- Export/import encrypted vault backup
- Clear all data option

