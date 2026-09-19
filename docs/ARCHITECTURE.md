# Initial architecture

## Current foundation

The current application is a Vite + React + TypeScript static frontend designed for Cloudflare Pages. It contains no production customer database and no secrets. Demonstration requests are kept only in the visitor's browser.

## Target MVP architecture

- **Frontend:** Cloudflare Pages, served through `www.nathonline.com.np` after approval.
- **API:** Cloudflare Worker with strict request validation, authorization, rate limiting and audit events.
- **Database:** Production relational database selected after technical review, with migrations, least-privilege access and backups.
- **Documents:** Private object storage with encryption, malware scanning and expiring authorized access.
- **Admin:** Separate authenticated staff surface with mandatory 2FA and role-based permissions.
- **Notifications:** Provider-independent email and SMS adapters; click-to-WhatsApp initially.
- **Payments:** Manual verification first, with immutable verification audit records.

## Security boundary

The public frontend must never contain database credentials, service tokens, staff secrets or unrestricted document URLs. All sensitive operations will pass through the authenticated API.

## Data lifecycle

Customer data will be minimized, purpose-bound, access-controlled and retained only for approved periods. Production implementation requires a final privacy notice, retention schedule, backup/recovery procedure and customer correction/deletion process.
