# Mirror Finish Mobile Detailing - Website

Public website for **Mirror Finish Mobile Detailing** (Montgomery, AL), built by Gray Matter.

- **Stack:** Astro (static) + TypeScript, hosted on GitHub Pages and deployed by GitHub Actions. The run summary shows the site URL.
- **Booking:** stays on the existing Square Appointments site (`https://mirror-finish-mobile-detailing.square.site/`). No custom backend, no AWS.
- **Contact:** call/text 334-652-2601.

## Project documents

| Document | Location |
|---|---|
| Website build plan (architecture, timeline, gates, CI/CD, risks) | [`Documentation/WEBSITE_BUILD_PLAN.md`](Documentation/WEBSITE_BUILD_PLAN.md) |
| Wireframes, 3 grayscale options (open in a browser) | [`design/wireframes/index.html`](design/wireframes/index.html) (copy: [`Documentation/WEBSITE_WIREFRAMES.html`](Documentation/WEBSITE_WIREFRAMES.html)) |
| Google Drive to GitHub asset sync | [`Documentation/GOOGLE_DRIVE_ASSET_SYNC_SETUP.md`](Documentation/GOOGLE_DRIVE_ASSET_SYNC_SETUP.md), [`ASSET_WORKFLOW_QUICK_START.md`](Documentation/ASSET_WORKFLOW_QUICK_START.md), [`GOOGLE_DRIVE_SYNC_LESSONS_LEARNED.md`](Documentation/GOOGLE_DRIVE_SYNC_LESSONS_LEARNED.md), [`GOOGLE_DRIVE_SYNC_SETUP_CHECKLIST.md`](Documentation/GOOGLE_DRIVE_SYNC_SETUP_CHECKLIST.md) |

The same plan and wireframes are in the client's Google Drive folder (Mirror Finish Mobile Detailing MGM - Website Design).

## Layout

```
site/                 Astro project (static site)
design/wireframes/    Grayscale wireframes
Assets/               Images, logos, etc. synced from Google Drive every 5 min
Documentation/        Plans and how-tos
.github/workflows/    Drive sync (and, once built, site CI/deploy)
```

## Develop

```bash
cd site
npm install
npm run dev      # local preview
npm run build    # static output in site/dist
```

Deploy: push to a branch or `main`; the Site CI/CD workflow builds and publishes to GitHub Pages. One-time setup: Settings > Pages > Source = GitHub Actions (and allow the branch under Settings > Environments > github-pages for branch previews).

> The older `Documentation/new-client-*.md` files describe a previous AWS booking template and describe the process; hosting is currently GitHub Pages.
