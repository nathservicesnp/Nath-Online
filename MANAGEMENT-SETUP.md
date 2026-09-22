# Request and service management

Owner approved: the approved owner email. Customer sign-in is deferred; customers use their request number and phone for general status only.

## Current state

Customer-facing social links, payment logos, pricing and request receipts can be released with both production management and admin flags disabled. The management implementation is staged. Preview database migrations 0002 and 0003 have been applied. Production management and admin flags remain false; existing customer records have not been migrated or modified. The admin API fails closed until authentication is configured.

The owner explicitly approved Cloudflare Access and MFA. The subsequent API attempt failed with Cloudflare authentication error 10000; protected sign-in is still not configured. Do not represent admin sign-in as working until the following setup and verification are complete.

## Secure activation

1. Enable Cloudflare Zero Trust/Access for account the Nath Cloudflare account. Use the free plan only unless the owner explicitly approves a paid plan. Do not accept contractual terms on the owner's behalf through browser automation.
2. Create a self-hosted Access application protecting `www.nathonline.com.np/admin` and all child paths, including `/admin/api/*`. Only allow the exact email `the approved owner email`. Require MFA (TOTP or security key) in addition to email/identity verification. The owner must enrol their own authenticator; never collect its seed or codes in chat.
3. Configure separate preview protection for `nath-official-preview.nathservicesnp.workers.dev/admin` before enabling the preview administrator. Verify both the bare admin path and all subpaths are covered.
4. Set `ACCESS_TEAM_DOMAIN` to the verified team hostname (without scheme), `ACCESS_AUD` to the application audience, and `ADMIN_EMAILS` to the approved exact owner email. Each environment must use its own audience if separate applications are used.
5. Set `ADMIN_ENABLED=true` only after the Access policy is verified. The Worker independently validates the JWT signature, RS256 algorithm, issuer, audience, expiry and exact owner email. Never substitute the unsigned email header for JWT validation.
6. Test owner sign-in and denied access for unauthenticated/other-email users on the preview. Test listing and completing a synthetic request, service editing and removal, public catalogue updates, and customer tracking without private-note leakage.
7. Export a fresh production backup. Apply additive migrations 0002 and 0003 to production with Wrangler. Migration 0003 does not overwrite existing service edits. Never drop/recreate the live enquiry table.
8. Set `MANAGEMENT_ENABLED=true` in production only after migrations succeed. Run the full test suite, build and production dry run. Publish from the reviewed GitHub commit; verify the owner can read the existing New request, and that public submissions and tracking still work.

## Operation

- `/admin`: search by request number, name, phone or status; read the original request message; update private staff notes and status; close as completed/cancelled/unable to fulfil; reopen if needed.
- Updates use version checks and transactional history writes. A stale edit is rejected instead of overwriting another update.
- Service editor: add and edit bilingual descriptions, items and starting charges; remove from the public catalogue; restore by marking visible. Removal preserves historical customer requests and original service titles.
- `/track`: request number and phone reveal general status, closing result and status dates, never name, message, staff identity or private notes.
- The receipt lets customers copy their request number and open tracking. The reference is passed in a URL fragment and removed from browser history on the tracking page; phone numbers are never put in URLs.
- Closed requests and linked history are deleted after 90 days. No automatic SMS/email notifications are configured.

## DB Browser for SQLite

The private `private-database-copies` directory outside this repository contains the owner's local snapshot. Open the `.sqlite` file in DB Browser, choose Browse Data, then enquiries. `message` is the customer's original request and `reference` is the request number. Local edits do not sync to Cloudflare. Never upload this directory or import a stale whole-database snapshot over production.

## Local UI test

`node scripts/admin-demo.mjs` serves an explicitly labelled synthetic demo on 127.0.0.1:4182 with an in-memory database. It does not access production, has no real customer data, and must never be deployed. The production Worker has no demo-auth bypass.

Thirteen tests cover legacy request handling, access failure, forged headers, private data boundaries, atomic status history, stale edits, service create/edit/remove, archived-service submission rejection, catalogue escaping and retention. Browser testing confirmed reading a synthetic customer's message, completing their request and seeing the resulting history.


