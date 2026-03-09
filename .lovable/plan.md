

## Fix: Auto-Delete Timer Badge Not Showing for All Durations

### Analysis

The `getTimeRemaining` function and badge rendering logic in `AddressSidebar.tsx` look correct for all durations (1h, 24h, 7d). Two likely causes:

1. **1-hour accounts may have already expired** — if created earlier in the session, the timer passed and shows "Expired" briefly but the component doesn't re-render to reflect changes.
2. **No periodic re-render** — the timer values are computed once on render. Without an interval, values go stale and never update visually.

### Changes

**`src/components/AddressSidebar.tsx`**:
- Add a `useEffect` with a `setInterval` (every 30s) that forces a re-render, keeping all timer badges up-to-date in real time.
- This ensures 1h, 24h, and 7d timers all tick down and display correctly, including transitioning to "Expired" when time runs out.
- Optionally auto-delete expired accounts (trigger the delete logic when timer hits zero).

This is a small, single-file change.

