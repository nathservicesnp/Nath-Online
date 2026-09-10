# NATH ONLINE SERVICES

**All Services, One Place** — https://www.nathonline.com.np

Mobile-first website with sidebar navigation, animated service cards, Rs. 100 starting assistance charge, WhatsApp/phone/Facebook links, enquiry form, careers expression of interest and a guided service assistant. Nath is an independent assistance provider in Butwal, Nepal.

## Current hosting

GitHub repository: https://github.com/nathservicesnp/Nath-Online

Cloudflare Worker: nath-online. Production branch: main. Cloudflare builds and deploys new commits automatically. The frontend uses plain HTML/CSS/JavaScript. The form API runs in worker.mjs and stores basic details in Cloudflare D1. No AI model, payment processing or document upload is included.

1. Edit source files in public/, or worker.mjs for server changes.
2. Run `node scripts/check.mjs` and `node scripts/test-worker.mjs`.
3. Run `node scripts/build.mjs` to rebuild dist/.
4. Commit to main in GitHub.
5. Check Cloudflare → Workers & Pages → nath-online → Builds for success.
6. Verify the live website and a form submission when changing forms.

Read [CLOUDFLARE.md](CLOUDFLARE.md) for hosting/DNS and [ADMIN.md](ADMIN.md) for private enquiry review. GitHub Pages/static-only hosting cannot run the form database API.

## Local preview

Install Node.js 22 or later, then run `node scripts/serve.mjs`. Visit http://127.0.0.1:4173. This previews public/; local static preview does not save submissions. To test the Worker and local D1 with Wrangler, apply migrations locally and use `npx wrangler dev` after building. Local test data stays separate from production.

## Updating content

| What | Where |
| --- | --- |
| Services, prices, hours, careers and form | public/index.html |
| Privacy, terms, disclaimer and business details | Corresponding public/*.html |
| Main design and animations | public/assets/site.css |
| Sidebar, form and assistant layout | public/assets/upgrade.css |
| Guided answers, menu and submission logic | public/assets/upgrade.js |
| Other page interactions | public/assets/site.js |
| Logo and favicon | public/assets/logo.svg |
| Validation and database insert | worker.mjs |
| Hosting and database bindings | wrangler.jsonc |

public/ is the source of truth. dist/ is generated. Legacy generate/refresh/upgrade scripts are one-time authoring utilities: do not rerun them because they can overwrite current pages. Shared headers and footers exist on every page and must be edited consistently.

Keep the fee note clear: assistance starts at Rs. 100, varies by process/time and is agreed before work. Official fees, tickets, website projects, design work and ad spend are separate quotes. Do not invent vacancies, government affiliations, guarantees, customer reviews or registration numbers.

Never put customer information, credentials or documents in this public repository. Check the private dashboard regularly; email notifications are not configured. Review retention monthly as explained in ADMIN.md.
