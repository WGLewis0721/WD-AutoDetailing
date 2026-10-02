# Plan: Mirror Finish Mobile Detailing website, live in ~2 hours

> **Update:** hosting is now GitHub Pages deployed by GitHub Actions. Cloudflare is paused and removed from the repo. The Cloudflare sections below are the original plan.

## Context
Build the real public website for Mirror Finish Mobile Detailing (Montgomery, AL). Today it is a one-page Square Online site with Square template placeholders still showing (San Francisco address, 555 phone, fake hours). The new site replaces the marketing layer and **keeps Square Appointments as the booking engine** (no new backend). Deploy: GitHub Actions to Cloudflare Workers.

Decisions confirmed by William:
- **No TRA3.** TRA3 = the AWS Lambda/DynamoDB/SNS/Textbelt booking template described in the repo `README.md` and `Documentation/new-client-*.md`. None of it gets built. Those docs get **rewritten** for the Cloudflare + Square build.
- **Menu:** publish the price-list menu **plus** the Feb 2025 "additional services".
- **Cloudflare:** account ready; William adds the API token + Account ID as GitHub secrets at the start.
- **Hosting:** free `*.workers.dev` address at launch; custom domain later (separate 10-min step).
- **Wireframe first** (before any visual design or code).

## Workflow found in Drive (the process this plan follows)
- `Gray Matter WebForge Design Loop > 00 - START HERE` (Drive path: 04 - Operations & SOPs / SOP Library / Service Delivery / Website Design Toolkit): research, then wireframes, then brand/mockup, then build, QA, AI developer handoff. Content integrity rule: never invent facts/testimonials. Centralize tokens + content. No unauthenticated admin surface.
- `SOP - Business Websites` §15-16: default factory is GitHub starter, Claude Code build, GitHub Actions, **Cloudflare deploy**; do not custom-build booking/payments; written approval at three gates (structure, visual direction, staging build); client folder 01-07; QA gate; handoff.
- `SOP - Standard Delivery Stack`: simplest reliable mechanism; client owns production accounts; no secrets in repo; human approval before publishing.
- Drive client workspace already exists (`Projects / Mirror Finish Mobile Detailing MGM - Website Design`) with the Research & Design Brief, DESIGN.md / IMPLEMENTATION_PROMPT.md / ASSET_SOURCING.md starters.

## Architecture (no backend)
```
Visitor -> Cloudflare Worker (static assets, global edge) -> static HTML/CSS/JS
                                   |
                                   +-- "Book" buttons -> Square Appointments (existing square.site booking + payments)
Phone/text CTAs -> tel:/sms: 334-652-2601 (work with no JavaScript)
```
- **Framework:** Astro (static output) + TypeScript. Zero client JS by default, tiny bundle, strong Lighthouse, good Actions support (Node/npm).
- **Worker:** assets-only Worker (`wrangler.jsonc` with `assets.directory = ./dist`, `not_found_handling = 404-page`). No Worker script, no KV/D1/R2.
- **Square integration:** single `BOOKING_URL` constant (`https://mirror-finish-mobile-detailing.square.site/`). Every Book button links there. No Square API, no webhooks, no secrets. Square keeps calendar, payments, confirmations.
- **Single source of truth:** `site/src/data/menu.ts` (packages, size add-ons, extras), `site/src/data/site.ts` (name, phone, service area, booking URL), `site/src/styles/tokens.css` (colors/type/spacing).

## Repo layout (branch `claude/confident-brown-clnb7u`)
```
site/                      Astro project (own package.json, wrangler.jsonc)
  src/{pages,components,data,styles,assets}
  public/{_headers,robots.txt,favicon}
design/wireframes/         grayscale wireframe HTML/SVG + contact sheet
.github/workflows/site.yml CI + preview + deploy
.github/workflows/sync-google-drive-assets.yml  (existing; small tweak below)
Documentation/             rewritten docs (README + 5 new-client-*.md)
```
Reuse as-is: existing Drive-sync workflow and `Assets/Images/{logo.webp,car.webp}` (real Mirror Finish logo: black/gold/white swoosh; real interior photo).

## Timeline (120 min, with three approval gates)
| Min | Step | Who |
|---|---|---|
| 0-10 | **Prereqs:** create Cloudflare API token ("Edit Cloudflare Workers" template) and copy Account ID; add `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` as GitHub repo secrets; register the account's workers.dev subdomain if not done | William |
| 0-10 | Scaffold Astro + wrangler config; commit tokens from logo palette (black, gold #B08D57-ish sampled from logo, white) | Claude |
| 10-35 | **Wireframes (3, grayscale, mobile + desktop):** A Book-first one-pager; B Price-first (menu + size selector above fold); C Photo-led story. Same required actions in each: Book, call/text, see prices, see service area. Labeled CTA placement + mobile behavior. Saved to `design/wireframes/` and Drive `03 Wireframes` (SVG/HTML as text) | Claude |
| 35-45 | **GATE 1:** William picks a wireframe (written OK in chat) | William |
| 45-90 | **Build** chosen layout: header + sticky mobile Book bar, hero, packages, vehicle-size add-ons, extra services, how it works (we come to you), gallery (curated IG-pack images), service area (8 towns), contact/Book footer; SEO (title/meta/OG, JSON-LD `LocalBusiness`, sitemap, robots), accessibility, `_headers` security headers | Claude |
| 60-75 | CI workflow green on the branch; first **preview** deploy (`wrangler versions upload`) | Claude |
| 90-100 | **GATE 2:** William reviews the preview URL on phone + desktop; fixes batched in one round | William |
| 100-115 | QA: Lighthouse, link check, Book button click-through to Square, mobile/keyboard checks, content-integrity pass | Claude |
| 115-120 | **GATE 3 (go-live approval)**, merge to `main`, production deploy to workers.dev, smoke test | William + Claude |

## CI/CD design (`.github/workflows/site.yml`)
- Triggers: push to the dev branch and `main` (paths: `site/**`, `design/**`, workflow file) plus manual dispatch. Note: pushes made by the Drive-sync bot use `GITHUB_TOKEN`, so they do **not** trigger deploys (intended).
- Job `quality`: `actions/setup-node` (Node 22, npm cache), `npm ci`, `astro check` (TypeScript), `astro build`, link check (`lychee`), Lighthouse CI against `dist` (budget: performance/a11y/SEO >= 90), upload `dist` artifact.
- Job `preview` (non-main branches): `cloudflare/wrangler-action` with `command: versions upload` for a preview URL.
- Job `deploy` (main only, `environment: production`, `needs: quality`): `cloudflare/wrangler-action` `deploy`, `workingDirectory: site`, secrets from GitHub. Concurrency group so deploys never overlap.
- Least-privilege `permissions: contents: read`.
- Small tweak to the Drive-sync workflow: only sync image/video extensions, so the `.md/.json` files now sitting in Drive `Assets/Images` are not committed to the repo.

## Content rules (from the Research & Design Brief)
- Name shown: **Mirror Finish Mobile Detailing** (matches logo, Square title, Facebook). Tagline from client: "Schedule an hour of TLC for your vehicle".
- Menu (verify at Gate 2): Deluxe $60, Exterior $40, Interior $40; size add-ons Sedan/Coupe $0, Hatchback/Crossover/Small SUV/Truck $20, Standard SUV/Truck $40, Minivan/Van $60; extras Paint & Glass Cleanse $40, Pet Hair & Stain $50, Bodily Fluid $40, Headlight Restoration $50 (1 hr), 6-Point Inspection $20, Steam Upholstery $10, Spot Stain $10; Clear Coat Restoration shown as "price on request". "Express" omitted (not on the current price list).
- Package inclusions use the price-list wording; the unresolved caption conflicts (Exterior contents, Spot Stain $15 vs $10) go on a pre-launch confirm list.
- **Not published unless William confirms:** hours, street address, public email (the personal Gmail), testimonials/reviews (none exist). Contact = phone/text + Book.
- Images: curated, optimized subset (webp) of the Instagram-pack photos plus the real logo/photo; flagged as launch-quality until full-resolution originals are swapped in.

## Outside the 2 hours (William, parallel)
- Fix the Square Online page's template placeholders (address, phone, hours) in the Square dashboard, since customers land on that booking page.
- Custom domain: attach later in Cloudflare (Workers > Settings > Domains).

## Docs (rewrite, no TRA3)
- `README.md`: new overview (stack, how to run/deploy, links); drop the AWS architecture and the conflicting $140/$175/$220 prices.
- `Documentation/new-client-{OVERVIEW,SYSTEM-CONTEXT,QUICK-SETUP,WAYS-OF-WORKING,BUILD-LESSONS}.md`: rewritten for Cloudflare Workers + Square + GitHub Actions for this client (no Lambda/Terraform/DynamoDB/SMS). BUILD-LESSONS is filled with what actually goes wrong during this build.
- Drive handoff: fill `DESIGN.md` / `IMPLEMENTATION_PROMPT.md` / `ASSET_SOURCING.md` in `07 Design Direction / 04 AI Developer Handoff`; wireframes into `03 Wireframes`.

## Risks
- Cloudflare token/permissions or workers.dev subdomain not set up -> blocks deploy (mitigated by doing it in minutes 0-10).
- Menu/price conflicts -> mitigated by the confirm list at Gate 2.
- Instagram-size images look soft on large screens -> keep hero on the logo/real photo; swap in originals later.
- Square page itself still shows placeholders until fixed in Square.
- Sandbox Chromium rejects the proxy CA for external sites; local preview/screenshots use `localhost`, and the live workers.dev check uses `curl` plus Lighthouse in CI.

## Verification
1. `cd site && npm ci && npx astro check && npm run build` pass locally.
2. `npx wrangler deploy --dry-run` (assets config valid) and `npx wrangler dev` serves `dist`; Playwright screenshots at 390px and 1440px against localhost.
3. `grep` the built `dist` to confirm every Book link equals `BOOKING_URL`, `tel:`/`sms:` links present, no `localhost`, no secrets.
4. CI green on the branch (type check, build, link check, Lighthouse >= 90); preview URL opens.
5. After Gate 3: production workers.dev URL returns 200 over HTTPS (`curl -I`), 404 page works, `_headers` applied, Book click lands on the Square booking page, and a real test booking path is walked through (without paying).
6. Repo scan: no secrets, no AWS/TRA3 references remain in README/docs.
