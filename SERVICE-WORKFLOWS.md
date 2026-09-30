# Named service workflows — 30 September 2026

This change extends the current Nath app at b74f0f2. The repository has replaced the earlier Phase 1 history and already contains management, passkeys, quotes, tracking and conversations. Those features and the production configuration are preserved.

## Delivered

Five distinct bilingual catalogue entries: business-pan, nid, passport, driving-license and hib. The existing other service remains available. Existing category pages and service records are retained. Business PAN has a four-step assistance guide and an official IRD source link; NID, passport, licence and HIB currently offer enquiry assistance without unverified eligibility, document, fee or timing claims.

The existing request flow preselects the service, shows its task options and stores its distinct service ID and title for the staff dashboard. Business PAN prompts ask about business type, registration and existing PAN without collecting the PAN number. HIB prompts explicitly exclude medical information and identity/insurance numbers. No new uploads or government integrations are introduced.

## Data and pricing

0010_named_services.sql adds pricing_mode (from or quote) and inserts the five services without overwriting existing IDs. Existing rows keep their current starting-price behaviour; new entries display charges confirmed after review on cards, detail and dynamic pricing pages. The existing non-null starting_price column retains its default for compatibility; it is not a customer quote when pricing_mode=quote. Admin editing of a numeric starting price does not switch quote mode. A future price-publication change must deliberately review that mode too.

Do not rerun the historical seed migration to deploy these entries. Apply 0010 through the normal migration runner, first to an isolated preview database. The older seed generator deliberately stays limited to original categories.

## Validation and deployment gate

28 tests pass, including per-service intake, retry deduplication, stored service identity, quote-only display in both languages, safe guidance and hidden-service rejection. The generated 48 HTML files pass internal-link and metadata checks. Wrangler packaging passes. All ten migrations applied successfully to an isolated local D1 database. Browser inspection confirmed Business PAN guide, form preselection and task/guidance text.

No remote migrations, preview deployment, production deployment or release settings changes have been made in this change. Before publication, review the PR, apply migration 0010 to preview, test the named services there, then obtain production release approval. Existing requests must remain readable. Roll back code if needed; the additive column and inserted records can remain. Do not delete customer requests or drop tables for rollback.

## Source boundary

IRD FAQ https://ird.gov.np/faq/?gid=98 checked 2026-09-30 supports the limited Business PAN process summary. The page describes online submission followed by printout/submission-number and document handling at the relevant office. The app does not claim one document checklist fits all business types or promise approval. Nath's workflow steps are service-design choices, not government rules. Further service-specific official checklists remain subject to verification before publishing.
