# Cloudflare production hosting

This repository uses Cloudflare Workers with static assets and D1, connected to GitHub. It is not a Cloudflare Pages project.

## Existing project

- Repository: nathservicesnp/Nath-Online, branch main
- Worker: nath-online
- Build: node scripts/build.mjs
- Deploy: npx wrangler deploy --assets=dist
- Preview/version command: npx wrangler versions upload --assets=dist
- Database: nath-enquiries, binding DB
- Static binding: ASSETS
- Submission rate limiter: REQUEST_LIMITER

## Reproduce the deployment

1. Put public/, scripts/, worker.mjs, wrangler.jsonc, migrations/ and package.json at the repository root.
2. In Cloudflare Workers & Pages, create a Worker connected to that GitHub repository. Set the branch and commands above. Use Node 22 or later.
3. Create a D1 database only if setting up a separate deployment. Apply migrations/0001_requests.sql through its Console, then put its ID/name in wrangler.jsonc. Keep the existing database for ordinary production updates.
4. Deploy and verify the assigned workers.dev address. Follow ADMIN.md to review submissions.
5. Add both domain names below under Worker Settings → Domains & Routes → Add → Custom domain.

## DNS and HTTPS

The nathonline.com.np zone uses these assigned registrar nameservers:

- ainsley.ns.cloudflare.com
- rocco.ns.cloudflare.com

Keep these at the domain provider. The zone must be active in Cloudflare. Preserve all mail/verification records.

| Hostname | Configuration |
| --- | --- |
| nathonline.com.np | Worker custom domain for nath-online |
| www.nathonline.com.np | Worker custom domain for nath-online |

Cloudflare creates/manages the required DNS records and certificates when adding Worker custom domains. Do not replace them with GitHub Pages A records or guess a CNAME target. Wait for certificate activation and DNS propagation, then test both HTTPS URLs. Canonical SEO URLs use www. Both names can serve the site; an apex-to-www redirect is optional and must preserve paths/query strings.

For a different account, use that zone's assigned nameservers and database ID, and update the allowed origins in worker.mjs. Never copy API tokens into GitHub. GitHub Pages can serve static files only; moving there would require a separate backend and revised form configuration.

Official references: https://developers.cloudflare.com/workers/static-assets/ and https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
