# Authentication and Accounts — Requirements and Task List

This work is planned for Phase 3. No authentication implementation is currently scheduled.

## Intended outcome

Accounts will allow people to sign in securely and see only trips and related data that they own.
The data model will leave room for later shared trips without implementing collaboration in this phase.

## Decisions made for the initial implementation

- Sign in with email and password only; email verification is not required initially.
- Use ASP.NET Core Identity with secure, HTTP-only persistent cookies for authentication. Sessions persist for 30 days; signing out affects the current browser/device.
- Passwords require at least eight characters, with no additional composition rules.
- Existing pre-account trips will be assigned automatically to the account whose email matches the configured `InitialTripOwnerEmail` when it registers.
- A compact account dropdown in the app banner will show the signed-in user's name and email, and provide change-password, sign-out, and delete-account actions. A separate settings page is deferred.
- Account deletion requires the current password and permanently deletes the account and its trips and related records.
- Data export is not included initially.
- Login errors must not reveal whether an email address has an account.

## Decisions still required before implementation

- The `InitialTripOwnerEmail` value for each environment.
- [ ] Migration strategy for existing pre-account trips and data.
- [ ] Ownership and authorization rules for every trip-scoped API endpoint.
- [ ] Privacy, deletion, and account-data export requirements.
- [ ] Whether email verification is required before app use.

## Initial implementation scope

- [ ] Account registration, sign-in, sign-out, password change, and protected routes.
- [ ] Associate each trip and all related records with an owning user.
- [ ] Enforce ownership on backend reads and writes, not only in the frontend.
- [ ] Show clear unauthenticated, unauthorized, loading, and account-error states.
- [ ] Add automated authorization and account-flow tests.

## Explicitly later

- Shared trips, invitations, collaborator roles, and permissions.
- Shared expenses, payment splits, and settlements.
