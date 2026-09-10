# Reviewing enquiries privately

Sign in to Cloudflare using your business account. Open Storage & databases → D1 → nath-enquiries → Explore Data → requests.

New service requests and career expressions of interest appear in the same table. Use kind to distinguish them. Review name, phone, interest and message; contact the person during business hours. Change status from new to contacted, in_progress or closed as appropriate.

There is no public customer list or public database password. Access is controlled by your Cloudflare account. Give staff only the account permissions they need and enable two-factor authentication. Never copy customer records into GitHub, website files or public screenshots.

Review records monthly. Delete closed enquiries and career expressions of interest within 90 days unless the customer agrees to longer retention or retention is legally required. This is a manual process; no automatic deletion job is configured. Handle privacy requests through +977 9867302353. Cloudflare backup retention may differ.

Forms collect basic details and consent only. Do not request identity documents, passwords, OTPs, bank details or payments in the form. No email notifications are configured: check this private dashboard regularly.

The guided service assistant uses fixed approved answers, makes no model API calls and stores no chat history. Cloudflare hosting/database usage remains subject to account limits.

## Deployment

The GitHub main branch builds with `node scripts/build.mjs` and deploys with `npx wrangler deploy --assets=dist`. Keep worker.mjs, wrangler.jsonc, migrations and public in the repository. The D1 database ID is a resource identifier, not a password.

The current database schema is in migrations/0001_requests.sql and was applied through the Cloudflare Console. For a new database, apply that schema before enabling forms and update wrangler.jsonc. Do not re-create or replace the production database during ordinary website updates.

Run `node scripts/check.mjs`, `node scripts/test-worker.mjs` and `node scripts/build.mjs` before publishing. GitHub Pages alone cannot run the form API; use the configured Cloudflare Worker for the complete website.
