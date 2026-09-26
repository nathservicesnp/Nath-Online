# Owner dashboard and passkey sign-in

The owner selected native WebAuthn passkeys as a no-card alternative to Cloudflare Access. Device verification (PIN or biometrics) is required. No email/SMS provider is needed. Existing Cloudflare usage limits still apply.

## Activation

Back up D1 privately and apply additive migrations 0002–0004. Verify existing requests remain intact. Configure ADMIN_AUTH=passkey, ADMIN_ENABLED=true, MANAGEMENT_ENABLED=true and AUTH_LIMITER. Build, test and dry-run before deploying.

The verified Cloudflare operator runs `node scripts/prepare-owner-setup.mjs` from the project root. It creates a private HTML file outside the repository with a single-use link valid for 24 hours. Only the token hash is stored in D1. Never commit or log that private file. Running again replaces an unused setup link but cannot replace an enrolled owner. The owner must complete device enrollment personally. The login page removes the link fragment from browser history.

Preview authentication was tested with a disposable cryptographically signed credential. The owner must still complete real device enrollment and acceptance testing.

## Operation

- Visit /admin to sign in. Sessions last eight hours; sign-out invalidates the current session.
- Add up to five passkeys. Adding a backup requires signing in within the last five minutes. Keep a backup on another trusted device or security key.
- Search requests by reference, name, phone or status. Read original messages, edit private notes, complete/cancel/decline, or reopen. Version checks prevent stale edits and changes retain history.
- Add/edit bilingual services and starting charges. Removal hides services while preserving historical requests; restore by marking visible.
- Customers track by reference and phone. Results omit customer messages, names and private notes. No automatic SMS/email notifications are configured.
- Closed requests and linked history are retained for 90 days. Local SQLite copies are snapshots and do not sync edits to the website.

## Security and recovery

Sign-in verifies signatures, one-use challenges, exact origin, relying-party hostname and device user verification. Sessions use hashed random tokens and Secure/HttpOnly/SameSite cookies. Authentication requires same-origin headers and rate limiting.

If all passkeys are lost, a verified Cloudflare operator must confirm ownership, back up data, revoke owner credentials and sessions, then issue a new private setup link. Never delete customer tables. There is no public password reset or individual passkey removal screen. This implementation has not received an independent security audit.

Emergency lockout: set ADMIN_ENABLED=false and redeploy. To revert management rendering also set MANAGEMENT_ENABLED=false. Preserve database tables and customer records.

## Quotes and manual payment records

Migration 0005 adds itemized quotes, cumulative verified payment totals and an append-only change history. Amounts use integer paisa; the API rejects invalid values and payments above the quote. Every edit requires a note and version match. Provider fees are listed separately from Nath charges. The overview counts all retained requests by status.

Printing uses the saved quote, not unsaved edits. Quotes are not tax invoices or proof of payment. There is no payment gateway or automatic payment verification. Refund processing and customer quote acceptance are not implemented. The owner records verified amounts manually; corrections remain visible in history.

These operational records follow existing request retention: closed requests and their linked quote/payment history are deleted after 90 days. Keep any required accounting documents in a separate appropriate system. A longer retention policy requires a separate decision. Roll back application code if needed; preserve the additive schema and data.

## Customer website updates

Migration 0006 adds publishable service guidance, one featured customer review and quote acceptance history. All content starts unpublished. The owner confirms checklist/timeline accuracy and permission for review text/display name before publishing in both languages. Payment instructions are per request and remain blank until verified.

Customer tracking uses the existing unpredictable request number plus matching phone. Only explicitly shared quotes are returned, without private notes or customer names. Acceptance records the current quote revision and item snapshot; quote or payment-instruction changes require fresh acceptance. Editing only the received amount does not invalidate acceptance. Payment instructions appear after acceptance. This is request-linked approval, not identity-verified electronic signing or automatic payment.

Quote acceptances follow the existing 90-day closed-request retention and are included in detailed JSON exports. Homepage hours use Nepal time and the published weekly schedule; holiday exceptions are not configured. Task search includes English/Nepali service items. No unverified timelines, payment recipients or reviews are seeded.
