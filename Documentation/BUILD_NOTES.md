# Build Notes - Mirror Finish Mobile Detailing

Notes on what was built, why, and which references informed it. Written to be honest about what was actually read.

## Design direction
"Ivory showroom, black instrument panel, gold used only as an accent." Colour split is **white 60 / black 30 / gold 10**, defined once in `site/src/styles/tokens.css`. Display type is a serif (Instrument Serif, with italic emphasis words); body type is Manrope (variable). Both are self-hosted through Fontsource. Gold is used for fills, rules and accents; text on white stays black because gold text on white fails contrast.

Consistency rules: one tokens file, one set of components (`.btn`, `.card`, `.chip`, `.field`), a 4/8px spacing scale, and a build check (`npm run check:tokens`) that fails if a colour is hard-coded outside the tokens file.

## What was built
- **Marketing site** (`/`): hero with an instant-price quick start (make and model carry into the booking app), scrolling service-area strip, packages, size-class pricing with silhouettes, add-ons menu, three-step process, photo mosaic, service area, FAQ, final call to action, sticky mobile bar.
- **Booking app** (`/book`): five steps (vehicles, build, when, details, deposit) with a live order summary and a 3D vehicle on a dark "showroom" stage.
- **Up to 4 cars per order**: each car has its own vehicle, size class, package and add-ons. Price is the sum; the 20% deposit is taken once on the grand total (integer cents, rounded once). Scheduling is one detailer back to back: only start times where the whole order fits inside working hours are offered (8 AM to 6 PM, Monday to Saturday, a placeholder in `site/src/data/site.ts`). No multi-car discount.
- **3D vehicles**: six body styles (sedan, coupe, hatchback, SUV, truck, van). Each is a Higgsfield image-to-3D mesh (Tripo H3.1, textured GLB, about 1.2 MB each) generated from a Higgsfield studio render, in `site/public/models/`. They are body-style stand-ins, not exact trims, and the texture is baked from one view so the back and sides are softer than the front. If a mesh or WebGL is unavailable, the matching studio render is shown instead.
- **Preview mode**: availability is sample data and no payment is taken. Square checkout, real availability and the reward offer are Round 3.

## Imagery
Higgsfield (`gpt_image_2_5`) generated the hero, paint close-up, interior and Detail Pass art, plus the six studio renders used to build the 3D models. Gallery photos are the client's real Instagram photos. Nothing generated is presented as the client's own work.

## References

| Source | How it was used | What was actually read |
|---|---|---|
| agt-detailing.com (A Gentlemen's Touch, Montgomery AL) | Booking pattern: size-tier cards, add-on pills, live summary panel, deposit shown on the pay button, sticky total. We kept the idea and avoided its weaknesses (free-text vehicle, calendar before package, inconsistent prices, emoji icons). | Raw HTML and inline JS of the home and booking pages. It has no avatar, RPG or DoorDash mechanics; that feel is our design. |
| github.com/WGLewis0721/AGT-2026 | Reference for backend patterns planned for Round 3: server-side repricing, Square Payment Link with an idempotency key, webhook signature check, 20% deposit with balance on site. TRA3 (its AWS stack) is not implemented. | Repo cloned and read. It is GitHub Pages plus AWS, not Cloudflare. |
| NHTSA vPIC API (vpic.nhtsa.dot.gov/api) | Confirmed makes and models are available but body class and size are not, so the make/model to size-class table is our own and needs a spot check. | Endpoints tested live. |
| three.js (GLTFLoader, RoomEnvironment) | Renders the 3D vehicles. | Library documentation and examples. |
| Google model-viewer and Kenney Car Kit | Considered for the 3D vehicle; not used. Higgsfield meshes gave closer, rounder results. | Pages read; not shipped. |
| Higgsfield (gpt_image_2_5, Tripo H3.1 image-to-3D) | Imagery and 3D meshes. | Generated in this project. |
| academy.techpresso.co Claude design prompts | Prompt patterns applied during design: user-flow mapping, form UX (field order, validation, input types), micro-interaction states, contrast checks. | Page read. |
| styles.refero.design | The method of describing a style as a mood sentence plus tokens (used for "Design direction" above). | The popular-styles index was read. No individual style was copied. |
| aura.build U-shape architecture design system | Requested as a reference. | **Not read.** The page is JavaScript-rendered and returned no usable content from this environment, so nothing from it is claimed. |
| Refero MCP (Round 3) | Booking-flow gaps: service-area check before anything else (IKEA flow 8270), notes on the review step, "closed / fully booked" day states and a persistent summary (Fresha flow 2322), declined-payment and lost-slot states (Airbnb 6002 and District 13008). | Full step detail for flows 2322 and 8270. Step lists only for 6002 and 13008. Search-preview descriptions only for styles (BMW, Atoms, Rivian, Arc); no full style was pulled, so nothing visual on `/` is attributed to Refero. |
| Client sources: Square site, Google/Facebook/Instagram material, price fliers | Prices, package inclusions, service area, branding and SEO wording. | Square page data and the client's flier and menu images. The Google Business Profile could not be read from this environment. |

## Decisions and open items
- Hosting is GitHub Pages deployed by GitHub Actions; Cloudflare is paused. The Square deposit and booking step needs a small server component (GitHub Pages is static only). Where it runs is undecided.
- Time estimates per package, the make/model size mapping, the Headlight Restoration price ($100 from the Feb 1 menu vs $50 in older posts), and the reward offer need the client's confirmation.
- Lighthouse was not run in this environment. Run it against the deployed URL.

## Round 3 (booking gaps, size models, SEO)
- **Service area first.** Step 1 of `/book` and the hero quick form ask for the town. "Somewhere else" stops the flow with a text-us link. The address step is now street, town and 5-digit ZIP. No ZIP-to-town table is used, because the client has only confirmed town names.
- **Notes for the detailer** on the details step, shown on review, the Detail Pass and the calendar file.
- **Calendar says why.** Days are marked closed, fully booked or open, with a legend and a tooltip.
- **Payment outcomes.** The deposit step has processing, declined (nothing booked, retry or text) and slot-taken (back to the calendar, build kept). Preview mode simulates them with `/book?demo=declined` and `/book?demo=taken`. Round 3's Square work replaces the timer in `payDeposit()`; a hold timer was left out because the hold length is a Square and business decision.
- **Changing a booking.** The confirmation says to text the business with the reference. The cancellation and reschedule policy is `TODO: client to supply`.
- **One 3D mesh per size class.** Eleven meshes in `site/public/models/` (sedan, coupe, hatch, suv, suv-standard, suv-large, truck-small, truck, truck-hd, van, van-cargo). The five new ones were generated in Higgsfield from renders styled after a Grand Cherokee, Suburban, Tacoma, F-350 dually and Sprinter, then compressed with gltf-transform (about 650 KB each). Every mesh is scaled to a typical real length (`bodyStyles[].length` in `vehicles.ts`), so a 3-row SUV is visibly larger than a crossover. The standard-SUV render has a seven-slot grille and the cargo van a small star-like emblem; regenerate those two if the client wants no resemblance to a real brand.
- **Home page size finder.** "Priced to your vehicle" reuses the booking picker (make and model, or body style) with one 3D vehicle and the four prices. Still renders of the same meshes (`site/src/assets/sizes/`) show until three.js loads, which only happens on desktop when the section is near the viewport. Desktop gives the stage most of the screen and lets you drag to rotate; phones keep the stills (no three.js) and swipe on the stage to step through body styles.
- **Hero.** "Mirror Finish" is capitalised, the keyword line sits inside the H1, and the image has a looping light sweep with a slow drift (CSS only, off under reduced motion).
- **SEO.** Canonical, Open Graph and sitemap URLs were pointing at the host root and dropping `/WD-AutoDetailing`; they now use the full site URL. The sitemap and `robots.txt` are generated by `src/pages/sitemap.xml.ts` and `robots.txt.ts`. Structured data is one graph: `AutomotiveBusiness` (the old `AutoDetailing` type does not exist in schema.org) with service area, phone and an offer catalog built from `menu.ts`, plus `WebSite`, `FAQPage` and a breadcrumb on `/book`. Titles and descriptions lead with "mobile car detailing in Montgomery, AL". The 404 page was rebuilt and set to noindex. Street address and opening hours are left out of the markup until the client confirms them.
- **Not done:** Lighthouse, a mobile screenshot pass of the new sections, and the design-guidelines audit.
