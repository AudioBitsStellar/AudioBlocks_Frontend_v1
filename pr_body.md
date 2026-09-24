- closes #482
- closes #483
- closes #484
- closes #485

## Changes
- **Issue #482**: Updated the `UserMenu` in the dashboard top navbar. Replaced the static "Swap" link with a dynamic "Switch Account" button that triggers `setShowDynamicUserProfile(true)` from the Dynamic SDK, enabling multi-account management natively.
- **Issue #483 & #484**: Built out the account settings section in `app/dashboard/settings/page.tsx`. It now dynamically retrieves the user's `verifiedCredentials` and renders a list of their linked wallets and email addresses. An "unlink account" button (Issue #484) has been added next to linked wallets which calls the `handleUnlinkWallet(wallet.id)` method.
- **Issue #485**: Added security messaging/tooltips for the "Sign in" buttons (both mobile and desktop variants) in `layouts/navbar/index.tsx` explaining the wallet authentication approach (e.g. "Securely connect using your crypto wallet or email. No passwords needed!") to new users using Radix-ui/tooltip based UI components.
