

You're right -- when there's only one domain available, the code renders it as plain text instead of a dropdown. It should always show as a Select dropdown regardless of how many domains are returned, so it's clear it's dynamic and not hardcoded.

## Changes

**`src/components/CreateAddressDialog.tsx`** -- Remove the `domains.length > 1` conditional and always render the `<Select>` dropdown for the domain, even when there's only one option.

