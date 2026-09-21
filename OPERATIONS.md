# Founder operations and release boundaries

## Reviewing real enquiries

The form saves to the `enquiries` table in `nath-official-enquiries`. It does not send an automatic email or WhatsApp notification. During working hours, the Founder must review new enquiries in the authenticated Cloudflare D1 console. Keep that account protected with MFA. Do not give general staff infrastructure access; a scoped staff application remains future work.

Status values: `new`, `contacted`, `in_progress`, `closed`. Use the exact reference when updating a record. Set `updated_at=datetime('now')` on every update. When closing, set `closed_at=datetime('now')`; when reopening, set `closed_at=NULL`. This is required for the daily 90-day retention job. Example (replace the placeholder with the intended reference, never run a broad update):

```sql
UPDATE enquiries SET status='closed', updated_at=datetime('now'), closed_at=datetime('now') WHERE reference='NOS-EXACT_REFERENCE';
```

The public lookup returns only a general status after an exact reference/mobile match. Sensitive details, quotes, payments and documents are not exposed. Customers without a match should contact the Founder.

## Launch checks

- Build and tests pass; preview request save, duplicate retry, status match/mismatch and real 404 response verified.
- Confirm both domains point to the intended Worker and HTTPS redirects work. Zone-level minimum TLS remains an account setting to verify separately.
- Review bilingual wording, contact details, business charges and policies. Never publish invented business registration numbers, payment account details or approval guarantees.
- Maintain a daily enquiry-review routine. Automatic notification providers are not configured.
- Verify production database backup/restore arrangements before treating this as a complete service-processing platform. D1 service capabilities are not proof that a 30-day independent backup policy has been established.

## Features intentionally unavailable

No online payments, payment-proof upload, private document upload, staff login, automatic SMS/email, customer OTP, quote acceptance, invoices or claimed government approvals. These need the approved full MVP implementation and external providers. This release handles public information and initial enquiries only.

Existing legacy databases are preserved. Do not merge or delete legacy customer records without a separate migration plan.

## Source and deployment

Use pull requests and require Website checks before merge. Configure Founder review on the GitHub production environment and repository branch protection. Publishing from local Wrangler uses the signed-in account; this does not automatically configure GitHub deployment secrets. Keep credentials out of Git and chat.

For rollback, record the current Worker version before each release. Restore a verified previous deployment using Cloudflare's version controls; do not roll back database schemas blindly. New schema changes must remain compatible with the previous release.
