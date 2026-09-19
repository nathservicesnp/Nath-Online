# Nath Online Services

Initial customer website foundation for **Nath Online Services — All Services, One Place**, based in Butwal and serving customers across Nepal.

## Included in this foundation

- Responsive customer-facing website
- Service catalogue for government, utility, ticketing, banking/remittance and education support
- Service-request form with clear privacy warnings
- Device-local demonstration tracking flow
- Click-to-WhatsApp and telephone contact
- Accessibility basics, metadata and favicon
- Automated type checking, tests and production build on GitHub
- Cloudflare Pages deployment workflow

The request form deliberately does **not** upload documents, collect payment, or send data to a server. These functions require the approved production database, private object storage, staff authentication, audit logging and privacy controls.

## Local development

```bash
npm install
npm run dev
```

Production checks:

```bash
npm run typecheck
npm test
npm run build
```

## Cloudflare deployment

The Cloudflare Pages project is named `nath-online`. For Cloudflare's direct GitHub integration, use:

- Build command: `npm run build`
- Deploy command: `npm run deploy:cloudflare`
- Build output directory: `dist`
- Root directory: `/`

The optional GitHub Actions deployment workflow requires these repository environment secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Never commit Cloudflare credentials to this repository.

Connect the custom domain only after staging validation and Founder approval.

## Next approved implementation stages

1. Technical review and Founder approval of the MVP architecture.
2. Production API and database schema.
3. Private document storage and malware scanning.
4. Staff authentication with mandatory 2FA and audit logs.
5. Payment evidence and authorized manual verification.
6. Transactional email and provider-independent SMS notifications.
7. Staging, security, accessibility and recovery testing.
