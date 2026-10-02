# Quick Setup (new client site)

## Once per client (about 10 min)
1. Copy this repo's `site/` structure; edit `src/data/site.ts` (name, phone, `bookingUrl`, service area) and `src/data/menu.ts`.
2. GitHub: Settings > Pages > Source = **GitHub Actions**.
3. For branch previews, allow the branch under Settings > Environments > github-pages > Deployment branches.
4. Set `SITE_URL` in `.github/workflows/site.yml` to the Pages URL (`https://<owner>.github.io/<repo>`).

## Local
```bash
cd site
npm install
npm run dev      # http://localhost:4321 (also on your LAN for phone testing)
npm run build    # outputs site/dist
```

## Deploy
Push to a branch or `main`. The Site CI/CD workflow checks, tests and builds the site, then publishes a path-independent copy to GitHub Pages. Open the run, then the `deploy` job summary for the URL.

## Custom domain (later)
Repo Settings > Pages > Custom domain, then add the DNS records GitHub lists at the domain registrar/DNS host. Update `SITE_URL`.

## Assets
Drop images into Drive `Assets/Images` etc. The sync copies image/video/PDF files into the repo `Assets/` folder every 5 minutes. Copy chosen photos into `site/src/assets/` so Astro optimizes them.
