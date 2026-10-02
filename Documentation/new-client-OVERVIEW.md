# New Client Website: Overview

How Gray Matter builds a small-business website on the Standard Delivery Stack. First used for **Mirror Finish Mobile Detailing (MGM)**.

## What we deliver
A fast, static marketing site that sends visitors to the client's existing booking tool. No custom backend.

| Piece | Choice |
|---|---|
| Site | Astro (static) + TypeScript in `site/` |
| Hosting | Cloudflare Workers (assets-only), free `*.workers.dev` first, custom domain later |
| Booking and payments | Client's existing Square Appointments page (single `BOOKING_URL`) |
| Contact | `tel:` / `sms:` links, no JavaScript needed |
| CI/CD | GitHub Actions: check, build, preview, deploy |
| Assets | Google Drive `Assets/` synced to the repo every 5 minutes |

## What we do not build
Custom booking, payments, databases, SMS/email automation, or admin screens. If a client needs those, it is a separate scoped project.

## Process (three approval gates)
1. Research and Design Brief, filled from client sources.
2. Wireframes (grayscale). **Gate 1:** client picks a layout.
3. Build, preview URL. **Gate 2:** client reviews on phone and desktop.
4. QA, then **Gate 3:** written go-live approval, merge to `main`, deploy.

## Where things live
- Plan: `WEBSITE_BUILD_PLAN.md`; wireframes: `WEBSITE_WIREFRAMES.html`
- Asset sync: `GOOGLE_DRIVE_ASSET_SYNC_SETUP.md`
- Other client docs in this folder: `new-client-SYSTEM-CONTEXT.md`, `-QUICK-SETUP.md`, `-WAYS-OF-WORKING.md`, `-BUILD-LESSONS.md`
