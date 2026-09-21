# Nath Online Services — official website

English and Nepali public website for Nath Online Services, Butwal, Nepal. Built as lightweight static HTML/CSS/JavaScript, served by a Cloudflare Worker with D1 enquiry storage.

## Included

- 34 bilingual public pages: home, service catalogue, six service guides, process, pricing, request, tracking, about, contact, FAQ, privacy and terms; two error pages.
- Light/dark theme, responsive navigation, search, accessible forms and service preselection.
- Real server-side request saving; repeat submissions with the same retry key do not duplicate records.
- General status lookup by high-entropy reference plus mobile number; no personal details returned.
- HTTPS/canonical routing, CSP, request size/origin/validation/rate limits, automatic deletion of enquiries 90 days after recorded closure.

## Local use

Use Node 24 and pnpm 11.19.0. Run `pnpm install --frozen-lockfile`, `pnpm run check`, `pnpm exec wrangler d1 migrations apply DB --local`, then `pnpm dev`. Local data stays separate from both remote databases.

## Release

Preview and production have separate D1 bindings. Apply migrations only to the intended database, then verify the request/lookup flow using synthetic data in preview. Run the production dry run before release. The GitHub release workflow is manual, depends on passing checks and uses the production environment. Configure its dedicated token and Founder approval rules before relying on it. No automatic push-to-production workflow is included.

See [OPERATIONS.md](OPERATIONS.md) for enquiry review and release limitations. A public website release is not completion of the full service-management MVP: staff application authentication/MFA, document scanning/storage, customer SMS OTP, quotes/invoices and payment verification are not implemented here. No UI claims those features are available.
