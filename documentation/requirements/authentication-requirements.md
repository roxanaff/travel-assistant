# Authentication and Accounts — Requirements and Task List

This work is currently being implemented as Phase 3.

## Intended outcome

Accounts will allow people to sign in securely and see only trips and related data that they own.
The data model will leave room for later shared trips without implementing collaboration in this phase.

## Decisions made for the initial implementation

- Sign in with email and password only; email verification is not required initially.
- Use ASP.NET Core Identity with secure, HTTP-only persistent cookies for authentication. Sessions persist for 30 days of inactivity: normal requests while using the app renew the session. Signing out affects the current browser/device.
- Passwords require at least eight characters, with no additional composition rules.
- Existing pre-account trips will be assigned automatically to the account whose email matches the configured `InitialTripOwnerEmail` when it registers.
- A compact account dropdown in the app banner will show the signed-in user's name and email, and provide change-password, sign-out, and delete-account actions. A separate settings page is deferred.
- Account deletion requires the current password and permanently deletes the account and its trips and related records.
- Data export is not included initially.
- Login errors must not reveal whether an email address has an account.

## Initial implementation scope

- [x] Account registration, sign-in, sign-out, password change, and protected routes.
- [x] Associate each trip and all related records with an owning user.
- [x] Enforce ownership on backend reads and writes, not only in the frontend.
- [ ] Show clear unauthenticated, unauthorized, loading, and account-error states.
- [ ] Add automated authorization and account-flow tests.

## One-time existing-trip migration

Completed: the two pre-account trips were assigned to the intended first account in local development and production. The final database migration now makes `Trips.UserId` required, so every future trip must have an owner.

## Explicitly later

- Shared trips, invitations, collaborator roles, and permissions.
- Shared expenses, payment splits, and settlements.
