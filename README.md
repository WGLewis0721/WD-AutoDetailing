# Mirror Finish Mobile Detailing - Website

Public website and booking app for **Mirror Finish Mobile Detailing** (Montgomery, AL), built by Gray Matter.

Live site: `https://wglewis0721.github.io/WD-AutoDetailing/` (GitHub Pages; a custom domain will be pointed at it later).

## What is built (Round 1)

- **Marketing site** (`/`): white-dominant design with black bands and gold accents (60 / 30 / 10). Hero, packages, vehicle-size pricing, add-ons, how it works, recent work, service area, "not ready yet" options, and a sticky Book bar on mobile. Every Book button goes to `/book`.
- **Booking app** (`/book`): five steps with a live summary.
  1. **Vehicle:** year, make and model (about 35 makes). The size class and size charge are detected automatically, with a body-style fallback for unlisted vehicles. A simple 3D vehicle (sedan, coupe, hatchback, SUV, truck, van) shows the size.
  2. **Build:** choose a package (Deluxe, Exterior, Interior) and add-ons. The total, the 20% deposit and the balance update live.
  3. **When:** month calendar and time slots.
  4. **Details:** name, phone, email and service address.
  5. **Deposit:** review and book, then a confirmation with a shareable **Detail Pass**, add-to-calendar file, a reward card and "keep exploring" options.
- **Design system:** one tokens file, a small set of shared components, and a build check (`npm run check:tokens`) that fails if a colour is hard-coded outside the tokens.
- **Imagery:** hero and section images generated with Higgsfield, plus real photos from the client's Instagram in the gallery.

## Preview limits (not live yet)

- Availability is **sample data** and **no payment is taken**. The page shows a "PREVIEW" banner.
- Square checkout, real availability, and creating the booking in Square (Round 2) need a small server component, because GitHub Pages only serves static files. Where that runs is still to be decided.
- The reward ("$10 off your next detail") is placeholder text. Package time estimates and the make/model size mapping need confirming.

## Project documents

| Document | Location |
|---|---|
| Website build plan (original plan; hosting is now GitHub Pages) | [`Documentation/WEBSITE_BUILD_PLAN.md`](Documentation/WEBSITE_BUILD_PLAN.md) |
| Grayscale wireframes: marketing options and the booking flow | [`design/wireframes/index.html`](design/wireframes/index.html), [`design/wireframes/booking.html`](design/wireframes/booking.html) |
| Google Drive to GitHub asset sync | [`GOOGLE_DRIVE_ASSET_SYNC_SETUP.md`](Documentation/GOOGLE_DRIVE_ASSET_SYNC_SETUP.md), [`ASSET_WORKFLOW_QUICK_START.md`](Documentation/ASSET_WORKFLOW_QUICK_START.md), [`GOOGLE_DRIVE_SYNC_LESSONS_LEARNED.md`](Documentation/GOOGLE_DRIVE_SYNC_LESSONS_LEARNED.md), [`GOOGLE_DRIVE_SYNC_SETUP_CHECKLIST.md`](Documentation/GOOGLE_DRIVE_SYNC_SETUP_CHECKLIST.md) |
| Client onboarding docs | [`Documentation/new-client-*.md`](Documentation) |

The plan and wireframes are also in the client's Google Drive folder.

## Layout

```
site/                 Astro project (static site)
  src/pages           index (marketing), book (booking app), 404
  src/lib             pricing, vehicles, 3D viewer, booking logic (+ tests)
  src/data            site details and the price list (single source of truth)
  src/styles          tokens.css (colours/spacing) and shared styles
design/wireframes/    Grayscale wireframes
Assets/               Images etc. synced from Google Drive every 5 minutes
Documentation/        Plans and how-tos
.github/workflows/    Site CI/CD (GitHub Pages) and Drive sync
```

## Develop

```bash
cd site
npm install
npm run dev        # http://localhost:4321 and on your network for phone testing
npm test           # pricing tests
npm run build      # token check + production build in site/dist
```

## Deploy

Pushing to `main` runs **Site CI/CD**: type check, tests, build, link checks, then a publish to GitHub Pages. The URL is in the `deploy` job summary.

One-time setup: **Settings > Pages > Source = GitHub Actions**. For branch previews, allow the branch under **Settings > Environments > github-pages > Deployment branches**.
