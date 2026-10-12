# Mirror Finish — mirrorfinishmgm.com launch handoff

**Status: STAGED ONLY — DO NOT MERGE BEFORE DOMAIN REGISTRATION AND GITHUB PAGES DOMAIN OWNERSHIP CONFIGURATION.**

Primary requested domain: **https://mirrorfinishmgm.com**  
Canonical host: apex without `www`  
Current live/rollback site: https://wglewis0721.github.io/WD-AutoDetailing/  
Repository: https://github.com/WGLewis0721/WD-AutoDetailing  
Deployment: GitHub Actions → GitHub Pages; booking API hosted on Vercel (keep it hosted there).

## Verified registrar situation (Oct 9, 2026)

Cloudflare Registrar reported `mirrorfinishmgm.com` **registrable** at **US $10.46 for the first year**, estimated standard renewal **US $10.46/year**. That is a live quote, not a guaranteed future price. The existing connected Cloudflare account also holds Gray Matter domains. Domain registration is a charge to the account's configured payment method and can be non-refundable. **Wait for explicit user approval of the exact $10.46 purchase and renewal preference before making the paid Registrar API call.** Do not transfer another domain or create an unrelated Cloudflare account.

## Step-by-step cutover, after approved registration

1. Register `mirrorfinishmgm.com` to the correct existing Cloudflare account, with registrant ownership and renewal settings approved by the user. Check the Registrar registration status until successful; never claim ownership before confirmation.
2. Set up the apex custom domain for `WGLewis0721/WD-AutoDetailing` in **Settings → Pages → Custom domain = `mirrorfinishmgm.com`**. GitHub Pages uses a custom GitHub Actions publishing workflow, so adding a `CNAME` to the repository alone is **not sufficient**; Pages settings are authoritative. Verify the GitHub owner domain using GitHub's provided TXT challenge if required/recommended (do not invent verification tokens). The available GitHub connector may not have Pages Administration write permission; if so, request one user UI action instead of falsely claiming it has been applied.
3. Only after configuring the site on GitHub Pages, configure **DNS only** (Cloudflare proxy OFF) for these records in the registered domain's Cloudflare zone:
   
   | Type | Host | Value | Proxy |
   |---|---|---|---|
   | A | @ | 185.199.108.153 | DNS only |
   | A | @ | 185.199.109.153 | DNS only |
   | A | @ | 185.199.110.153 | DNS only |
   | A | @ | 185.199.111.153 | DNS only |
   | CNAME | www | wglewis0721.github.io | DNS only |

   Do not set a wildcard CNAME or wildcard A. Preserve default Cloudflare registrar nameservers. Do not create speculative MX/TXT records or overwrite email-related DNS.
4. Set Vercel's **`ALLOWED_ORIGINS`** to include both `https://mirrorfinishmgm.com` and the existing `https://wglewis0721.github.io` while the previous site remains available. Keep existing secret keys server-only. The Vercel API is intentionally a different origin; this is the browser CORS allowlist, not a requirement to move the API. Update `SITE_URL` at the Vercel project only if relevant to actual callback links, ensuring the API still routes to the real site.
5. Merge the prepared GitHub PR updating `.github/workflows/site.yml` `SITE_URL` to the new apex hostname **only after DNS/GitHub authorization is ready**. The existing build uses `Astro.site` for canonical URLs, SEO/social metadata and the sitemap. All booking buttons and preview paths must still work from the new root, not from `/WD-AutoDetailing/`.
6. Verify GitHub Pages deploy succeeded, apex and www resolve correctly, `https://mirrorfinishmgm.com/`, `https://mirrorfinishmgm.com/book/` and images load, and HTML canonical/sitemap use the new domain. Wait for GitHub's automatic HTTPS certificate and enable **Enforce HTTPS** in repository Pages settings once available. `www` should redirect to the canonical apex.
7. Test an **uncharged** booking request (not a real payment): agreement, Square read-only availability, booking request storage in Supabase, branded order card, SMS and calendar draft. Square seller-level Bookings **write** is blocked by subscription and the website deposit switch **must remain disabled**. Do not turn on `SQUARE_BOOKING_LAUNCH_APPROVED` in any environment as part of a domain migration.

## Rollback

Do not delete the old GitHub Pages repository URL or lose its current content. If the custom domain is not working, temporarily restore the original GitHub Pages custom-domain setting and set `SITE_URL` back to `https://wglewis0721.github.io/WD-AutoDetailing`. Leave the original Square/Supabase integrations and keys untouched.

## Source-of-truth reminders

- UI/hosting: `site/` built by `.github/workflows/site.yml`; `site/scripts/make-relative.mjs` produces the Pages artifact.
- Backend API: `api/` on Vercel project `mirror-finish-checkout`.
- Supabase bookings: dedicated Mirror Finish project.
- Brand: Mirror Finish Mobile Detailing, Montgomery, AL; phone and price/service catalog are in `site/src/data/site.ts` and `site/src/data/menu.ts`.

Official docs: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
