# NATH ONLINE SERVICES

**All Services, One Place** — official website repository for **www.nathonline.com.np**.

Responsive, dependency-free HTML, CSS and JavaScript. Includes six pages, service-specific WhatsApp links, a working mobile menu, accessible navigation, native expandable FAQs, privacy/terms/disclaimer/business information, SVG brand mark/favicon, metadata, sitemap, robots.txt, custom 404 and automated GitHub Pages deployment. No database, payment collection, analytics, document uploads, third-party fonts or cookies are added by the website.

## 1. Preview and check locally

Install Node.js 22 or later. In this repository folder run:

```sh
npm test
npm run build
npm start
```

Open http://127.0.0.1:4173. No `npm install` is needed: there are no external dependencies. `npm start` serves `public/`; `npm run build` copies those exact files into `dist/`. Stop preview with Ctrl+C. Never keep customer documents, IDs or payment details in this repository.

## 2. Create your GitHub repository

1. Sign in to GitHub and create a repository named `nath-online-services` (public works with free GitHub Pages).
2. Upload the **contents of this folder**, including `public`, `scripts`, `package.json`, and `.github/workflows/pages.yml`. Do not upload the surrounding project folder or ZIP as the website. The workflow must be at the repository root under `.github/workflows/`.
3. Use `main` as the default branch. In **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source.
4. Open **Actions → Deploy website to GitHub Pages → Run workflow**. Future commits to `main` publish automatically. The build validates links before uploading `dist/`.
5. In **Settings → Pages → Custom domain**, enter `www.nathonline.com.np` and save. The repository includes the matching `public/CNAME`.

If you use Git locally:

```sh
git init -b main
git add .
git commit -m "Create Nath Online Services website"
git remote add origin https://github.com/YOUR-GITHUB-USERNAME/nath-online-services.git
git push -u origin main
```

Replace `YOUR-GITHUB-USERNAME` with your account or organisation. Authenticate through GitHub’s supported sign-in flow; never put tokens in files. This delivery does not create a remote repository or change live DNS.

## 3. Connect the domain

First verify ownership in your GitHub account/organisation **Settings → Pages** by following GitHub’s domain verification instructions and adding its unique TXT record at your DNS provider. Keep that record. Then set the repository custom domain **before** changing web DNS.

In the authoritative DNS dashboard for `nathonline.com.np`, use:

| Type | Host / Name | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | YOUR-GITHUB-USERNAME.github.io |

The CNAME target is your GitHub account domain, **without** `https://`, a repository name, or a trailing path. Some DNS dashboards require the full hostname instead of `@` or `www`. Use the default TTL or 3600 seconds. Replace conflicting web-hosting records for these names; preserve MX/TXT records used for email and verification. Do not create wildcard records. This switches web traffic away from your existing host, so keep a copy of its current DNS configuration first.

IPv6 is optional. If used, add all four AAAA records at `@`: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`. Remove stale AAAA records pointing at another web host. With both domains correctly configured and `www` selected in Pages, the apex redirects to `www`.

## 4. Turn on HTTPS and verify

Allow DNS propagation (up to 24 hours or your provider’s stated interval). Wait for the Pages DNS check and certificate provisioning, then enable **Enforce HTTPS** in Settings → Pages. Test:

- `https://www.nathonline.com.np` loads the home page.
- `https://nathonline.com.np` redirects to the www address.
- HTTP redirects to HTTPS and the browser reports a valid certificate.
- CSS, favicon, legal pages, menu, call/WhatsApp links and FAQs work on a phone.
- `/sitemap.xml` and `/robots.txt` load; an unknown URL shows the custom 404.

If HTTPS remains unavailable, check conflicting A/AAAA/CNAME records, the exact CNAME target, domain verification, and any restrictive CAA rules with your DNS provider. Do not disable certificate validation. GitHub’s current instructions are authoritative:

- [Managing a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [Verifying a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)
- [Securing Pages with HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)

DNS guidance checked 9 September 2026. No live DNS or ownership checks were performed for this delivery.

## 5. Use your existing static host instead

If you prefer your already purchased hosting, upload the **contents of `dist/`** into its public web directory after building. It needs only static file hosting. Configure its custom domain, TLS certificate, apex-to-www redirect and custom 404 using that host’s dashboard. Use **that host’s DNS values instead of the GitHub table**. `CNAME` is for GitHub Pages and may be omitted on other hosts. No PHP or server application is required. Configure sensible cache headers: short/no-cache HTML, modest caching for assets (filenames are not fingerprinted).

## 6. Update content later

The deployable source of truth is **`public/`**. Edit files directly in GitHub, commit to `main`, and the workflow publishes them. Do not edit `dist/`; it is regenerated.

| Change | File |
| --- | --- |
| Home, services, prices, hours, location | `public/index.html` |
| Privacy / terms / disclaimer / business details | Corresponding `.html` file in `public/` |
| Colour, spacing, mobile layout | `public/assets/site.css` |
| Mobile menu behaviour | `public/assets/site.js` |
| Brand mark / favicon | `public/assets/logo.svg` |
| Domain | `public/CNAME`, canonical/OG URLs, `sitemap.xml`, `robots.txt`, 404 home link |

Shared header/footer is deliberately present in every HTML page so all pages work without JavaScript. Update all pages when changing shared details. `scripts/generate.mjs` is the initial authoring utility, **not** part of the build: running it overwrites HTML. If you choose template-based maintenance, edit it first, run `node scripts/generate.mjs`, then review every generated change. Otherwise edit public HTML only.

The original reusable N monogram uses navy, blue and a red accent, with no government symbols. Replace it with a supplied official logo when available. Text is English with Nepali highlights, not a full language switch. Social tags support title/description sharing; no fabricated preview photo or office image is included.

## Operational launch details

The site accurately says to call for exact office directions because a street address was not provided. Add a verified address and map link when available. Do not invent registration/PAN numbers, testimonials, government affiliations, payment account details or guaranteed turnaround times. Keep optional service availability and payment methods current.

The included policy text describes this static site and the intended customer-assistance process. Ensure real document handling, retention, consent, cancellations and refunds follow those statements before accepting customers; update the policy if you add forms, analytics, payment systems or a backend. [Nepal’s Privacy Act, 2075](https://lawcommission.gov.np/content/12261/12261-the-privacy-act-2075/) is an official reference; the site makes no claim of legal certification.

## Validation

`npm test` checks page metadata, unique IDs, all local links and section anchors, plus domain/contact/price consistency. It does not test external WhatsApp delivery, DNS, certificates, or replace manual accessibility/device review. The site remains usable without JavaScript; JavaScript enhances only the mobile menu.
