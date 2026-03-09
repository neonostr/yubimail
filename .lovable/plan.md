

## Implement Functional Auto-Delete

When the 30-second timer tick fires in `AddressSidebar.tsx`, check all accounts for expired `autoDeleteAt` timestamps. For each expired account, call `deleteAccount()` on mail.tm and remove it from the vault.

### Changes

**`src/components/AddressSidebar.tsx`**:
- In the existing `useEffect` interval (30s tick), after incrementing the tick, check `vault.accounts` for any with `autoDeleteAt <= Date.now()`
- For each expired account:
  1. Call `deleteAccount(account.id, account.token)` (fire-and-forget, catch errors)
  2. Remove from vault via `updateVault`
  3. Clear `selectedAccountId` if it was selected
  4. Show a toast: "Auto-deleted {address}"
- Use a ref to prevent concurrent cleanup runs

This is a single-file change building on the existing interval logic.

