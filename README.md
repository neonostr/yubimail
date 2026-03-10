# YubiMail

**Disposable email addresses, secured by your YubiKey.**

No passwords. No accounts. No tracking. Just tap your YubiKey and go.

## What is YubiMail?

YubiMail lets you create temporary, disposable email addresses on the fly — perfect for signing up for services, avoiding spam, or keeping your real inbox clean. All your credentials are encrypted and stored locally in your browser, protected by your hardware security key.

## Features

- 🔐 **Hardware-secured vault** — Your email credentials are encrypted with AES-256-GCM, unlocked only by your YubiKey
- 📨 **Instant disposable inboxes** — Create new email addresses in one tap
- ⏱️ **Auto-delete timers** — Set addresses to self-destruct after a chosen time period
- 🚫 **No backend** — Everything runs client-side in your browser. No servers, no data collection
- 🔑 **WebAuthn + PRF** — Uses modern browser standards for hardware-bound encryption when supported

## How it works

1. **Tap your YubiKey** to create or unlock your encrypted vault
2. **Create a disposable address** — YubiMail generates a real email address via [mail.tm](https://mail.tm)
3. **Receive emails** — Check your inbox directly in the app
4. **Auto-delete** — Addresses and their credentials are removed when the timer expires

## Good to know

- These are **receive-only** inboxes — you can't send emails from them
- Emails on mail.tm are stored for a **maximum of 7 days**, then automatically deleted
- Your vault lives in your browser's local storage — if you clear browser data, it's gone
- A modern browser with WebAuthn support is required (Chrome, Firefox, Edge)

## Tech stack

Built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui.

## Links

- 🌐 [yubimail.lovable.app](https://yubimail.lovable.app)
- 💻 [Source on GitHub](https://github.com/neonostr/yubimail)

## License

Free & open source.
