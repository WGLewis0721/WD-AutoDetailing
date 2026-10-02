# Handoff - Mirror Finish Mobile Detailing (read this first in a new session)

## Who and what
Client: Mirror Finish Mobile Detailing (Montgomery, AL), run by William Lewis. Built by Gray Matter. Repo: `WGLewis0721/WD-AutoDetailing`. Live: GitHub Pages `https://wglewis0721.github.io/WD-AutoDetailing/` (deployed by `.github/workflows/site.yml` on push to `main`). Dev branch used so far: `claude/confident-brown-clnb7u` (merged to `main` through Round 2).

## State (Round 2 shipped, preview mode)
- Astro static site in `site/`: marketing page `/` and booking app `/book` (5 steps, up to 4 cars, 3D vehicles from Higgsfield GLBs in `site/public/models/`). Design: white 60 / black 30 / gold 10, tokens in `site/src/styles/tokens.css`, check with `npm run check:tokens`. Prices in `site/src/data/menu.ts` (cents) feed `site/src/lib/pricing.ts`; tests: `npm test`.
- Availability is sample data and **no payment is taken** (PREVIEW banner). Square checkout/booking is **not built**.
- Docs: `README.md`, `Documentation/BUILD_NOTES.md` (references: what was actually read vs not), `WEBSITE_BUILD_PLAN.md` (original plan), asset-sync docs, wireframes in `design/wireframes/`.
- Google Drive (client folder `Projects / Mirror Finish Mobile Detailing MGM - Website Design`, id `1bHERb-jHmd_DzsyjCz2IBpR95Z4Z3p2s`): plan, wireframes, research brief, handoff files. Drive `Assets/` syncs to repo `Assets/` every 5 min via `.github/workflows/sync-google-drive-assets.yml` (images/video/pdf only).

## Decisions made
- No TRA3 (AWS Lambda/DynamoDB/SSM template) anywhere. Cloudflare is **paused and removed**; hosting is GitHub Pages. A custom domain may later point at Pages through Cloudflare DNS.
- Booking engine stays Square (Appointments). Planned: 20% deposit via Square hosted checkout, then create the Square booking so Square notifies customer and detailer (no Twilio/email service). Needs a small server piece because Pages is static; **where it runs is undecided**.
- Multi-car: each car priced on its own, no discount, deposit = 20% of grand total, one detailer back to back, only start times where the whole order fits (placeholder hours 8 AM to 6 PM Mon to Sat in `site/src/data/site.ts`).
- Prices: Deluxe $60, Exterior $40, Interior $40; size add-ons +$0/+20/+40/+60; extras Shampoo & Steam $75, Interior Deep Treatment $75, Paint & Glass Decontamination $40, Headlight Restoration $100 (from the Feb 1 menu; older posts said $50).
- Name on site: "Mirror Finish Mobile Detailing" (SEO also "... MGM"). Phone/text 334-652-2601.

## Open items for William
Square developer app and location, plus where the server piece runs; real reward offer (current "$10 off" is placeholder); package time estimates; make/model size mapping spot check; Headlight price; Google Business Profile details (could not be read); hours/address/email not published until confirmed; custom domain.

## Not yet studied
Aura U-shape and Refero web-apps pages were unreadable earlier. William is connecting the Refero MCP (https://api.refero.design/mcp) for a new session; use it to pull booking/web-app references and compare against `/` and `/book`, then update `BUILD_NOTES.md`.

## Gotchas learned
- Pages deploys use a path-independent copy (`site/scripts/make-relative.mjs`); keep new root-absolute links compatible (`data-home`, `data-book`) or extend that script. Models load via `import.meta.url`.
- GitHub Pages must have Source = GitHub Actions (already working on `main`).
- Don't use `pkill -f` in the sandbox shell (kills the shell). Higgsfield image model rate-limits at 6 parallel requests.
- Never put tokens in the repo. A Refero bearer token was pasted in chat once; rotate it.
