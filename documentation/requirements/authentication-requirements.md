# Authentication and Accounts — Stage 1 Requirements

## Purpose

Authentication provides a private workspace in which every trip and its related data belongs to one account.

## Product behavior

- Accounts use email and password registration and sign-in. Email verification is not required in Stage 1.
- Passwords require at least eight characters. Login failures do not reveal whether an email address has an account.
- Authentication uses secure, HTTP-only persistent cookies. Sessions expire after 30 days of inactivity and normal
  activity renews the current session.
- Account controls provide password change, sign-out from the current browser/device, and permanent account deletion
  after current-password confirmation.
- Protected frontend routes redirect unauthenticated people to sign-in. Loading, unavailable-account, and account-error
  states are displayed.
- Backend authorization is enforced for every trip and trip-scoped endpoint. Another account's trip is returned as not
  found.

## Stage 1 completion

Account behavior, automated coverage, and manual verification are complete.

## Constraints

The pre-account trip migration has completed. Every new trip must have an owner, and account deletion permanently
deletes that account's trips and related records.

## Beyond Stage 1

Future account hardening, shared trips, and collaboration directions are recorded in
[accounts and collaboration](../future/accounts-and-collaboration.md).
