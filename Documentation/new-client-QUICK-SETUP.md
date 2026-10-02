# Quick Setup (new client site)

## Once per client (about 15 min)
1. Copy this repo's `site/` structure; edit `src/data/site.ts` (name, phone, `bookingUrl`, service area) and `src/data/menu.ts`.
2. Cloudflare: create an API token from the **Edit Cloudflare Workers** template; copy the Account ID; make sure the account has a workers.dev subdomain.
3. GitHub repo secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
4. Set `name` in `site/wrangler.jsonc` to the client slug.
5. Create the GitHub environment `production` (add a required reviewer if the client wants a manual gate).

## Local
```bash
cd site
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs site/dist
```

## Deploy
- Push to a branch: CI runs and uploads a preview version.
- Merge to `main`: CI runs and deploys to production.
- Manual: `cd site && npx wrangler deploy` (needs the two env vars locally).

## Custom domain (later)
Cloudflare dashboard > Workers > the worker > Settings > Domains and Routes > Add custom domain. Update `SITE_URL` and `public/robots.txt`.

## Assets
Drop images into Drive `Assets/Images` etc. The sync copies image/video/PDF files into the repo `Assets/` folder every 5 minutes. Copy chosen photos into `site/src/assets/` so Astro optimizes them.
