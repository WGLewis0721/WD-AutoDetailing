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
- **Not done:** Lighthouse and the design-guidelines audit.

## Round 4 (hero loop, vehicle renders)
- **Hero loop.** An 8-second silent loop in the hero frame. William chose highest quality over length because it loops. Direction: quiet luxury, a dark charcoal pavilion with a wet floor, one band of light on black paint, and an African American detailer seen only as forearm and gloved hand.
  - **Beats:** gold-ferrule brush on the wheel, snow foam with a mitt, a water jet sheeting the foam off, then a microfiber towel crossing the lens.
  - **Look:** no text, logo, audio or end card.
- **How it was made.**
  - **Keyframe:** a 2K opening keyframe (GPT Image 2.5, using the site's hero SUV as reference; Higgsfield job `c3fd1854`).
  - **Drafts:** Seedance 2.5 drafts at 480p (`2e587646`, `bea8d7e0`, `23ec41c8`), with Seedance 2.0 as an A/B test (`4c625cd5`).
  - **Final:** the approved draft finalised at 1080p (`715dd4b9`, delivered 1440×1440). Finalising keeps the exact take that was reviewed.
  - **Why each draft was rejected:**
    - Draft 1: a grey mist "flash" and an open loop.
    - Draft 2: skin tone and a bright rinse.
    - Seedance 2.0: synthetic-looking foam, and it can't finalise the same take.
  - **Spend:** about 195 credits (keyframe 2.75, four drafts 96, final 96).
- **Encoding.** `site/scripts/encode-hero-loop.sh master.mp4`:
  - It drops the one-frame keyframe flash, so the calm empty-fender ending cuts cleanly into the empty-wheel opening.
  - Outputs: 1080 square VP9 WebM (1.7 MB) and H.264 MP4 (2.6 MB, faststart, no audio track), plus a poster from the first frame.
  - The video and poster share `object-fit: cover`, so the fade-in from the still is invisible in the 4:5 desktop and 4:3 phone frames.
  - The script starts the video only when it is on screen, and never under reduced motion or Save-Data (`preload="none"` until then).
- **Vehicle renders on one plate.** Each Higgsfield edit had re-rendered the driveway slightly differently; the hatchback's background matched the sedan's at only 0.73 SSIM. That made the house shift during a crossfade.
  - **Fix:** each render is now aligned to the clean 4K plate (ORB features + homography). Its car and shadow are masked from the difference and composited back onto that one plate.
  - **Result:** backgrounds now match at 0.996 or better, so only the car changes.

## Round 5 (whole-car hero film, layout for every screen, vehicle switching)
- **Hero film, v2.** The 8-second fender macro was replaced by an 18-second, 9-shot loop of the whole car, built from the client's five reference reels (196 shots analysed: the reels change angle every ~2s and cover exterior, interior and a reveal).
  - **Exterior (10s):** foam cannon wide shot, wheel brush, mitt stripe through the foam on the hood, rinse sheeting off the door, low glamour shot of the front.
  - **Interior (8s):** steam on the steering wheel, a detail brush in the vents, vacuum lines in the carpet, a leather seat wipe, then the clean SUV in the driveway.
  - **The loop** closes on a match cut: the clean SUV in the driveway, then the same angle covered in foam.
- **Obsessive consistency.** Every shot uses the same black SUV (`suv-standard`, the size-picker render), the same mid-century driveway plate, and one detailer: a Black man with deeply melanated skin, black long-sleeve shirt and nitrile gloves. Two 2K anchor keyframes (exterior `5ffb2430`, interior `7d1b755c`) were made with GPT Image 2.5 from the size-picker car, the driveway plate and the site's interior image, then fed to Seedance 2.5 as references.
  - **Drafts:** exterior `5e767057` was rejected for fake tire lettering and the detailer at the frame edge, then `a90429e3` was approved. Interior `4dbd4f26` was approved first time.
  - **Finals:** exterior `d3394a73` and interior `4470688d`, both at 1080p, 16:9.
  - **Post fix:** faint embossed lettering on one tire sidewall (wheel shot, 1.8 to 4.0s) was softened in post with a feathered blur, so it reads as depth of field.
  - **Spend:** about 300 credits (keyframes 11, drafts 81, finals 216).
- **Encoding.** `site/scripts/encode-hero-loop.sh exterior.mp4 interior.mp4` joins the films and writes a 1920x1080 VP9 WebM (4.2 MB) and H.264 MP4 (4.8 MB, faststart, no audio track), plus the poster.
- **Hero layout by screen shape, not device.** One stylesheet covers desktops, tablets, foldables (inner and cover screens) and candy-bar phones.
  - **Wider than ~1.15:1** (desktop, landscape tablet, unfolded foldable in landscape, landscape phone): the film fills the hero. The headline and price form sit over a left-hand scrim sized to the copy column.
  - **Portrait shapes:** the film is an edge-to-edge band (square on phones, 4:3 on portrait tablets and unfolded foldables) with the headline over its lower edge. The lead, form and trust list follow on white.
  - **Header:** the full nav shows from 1024px. Below 480px, "Text us" becomes an icon button. Below 360px (foldable cover screens), the logo mark carries the brand.
  - **Verified** at 1440x900, 1024x768, 768x1024, 882x736, 736x882, 344x882 and 390x844: the film plays in every one, and none scrolls sideways.
- **Vehicle switching.** The flash when changing body style came from fading a whole new photo over the old one: for half a second both cars showed through each other. Now:
  - the driveway is one fixed layer;
  - each size class is a transparent cut-out of the car and its shadow (`public/models/<key>-car[@2x].webp`), aligned to that driveway;
  - the old car eases out, and 150 ms later the new one eases in and settles from a 1% offset;
  - this applies on the home size finder and in booking, verified frame by frame.

## Round 6 (live Square checkout, Square catalog as the price list)
- **Same workflow as the AGT site, without AWS.** Pay sends only the customer's choices to `api/create-checkout.ts`, a Vercel function (project `mirror-finish-checkout`, Gray Matter team). It:
  - re-prices the order from `site/src/data/menu.ts`;
  - works out each car's size from its make and model;
  - creates a Square Payment Link that lists every package, size charge and add-on, minus a "Balance due after your detail" discount, so the card is charged exactly the 20% deposit.

  Square then returns the customer to `/book/?paid=REF`, which shows their Detail Pass. The website itself stays on GitHub Pages.
- **Square catalog is the source of truth for prices.** It was read through the Square connector on 2026-10-03.
  - **Price changes:** Deluxe $200, Exterior $100, Interior $100, Headlight Restoration $50. Interior Deep Treatment ($75) and Paint and Glass Decontamination ($40) already matched.
  - **Add-ons:** Pet Hair and Stain Removal ($75) was added. Shampoo & Steam was removed, because it is not in Square.
  - **Catalog links:** packages and add-ons go to checkout as the real catalog items, so Square reports show them by name. `checkout.test.ts` fails if `menu.ts` drifts from the catalog prices.
- **Size charges** (+$20 small, +$40 standard, +$60 large) are not in the Square catalog. They go to checkout as their own lines named "Vehicle size: ...".
- **Switching it on:**
  1. Put the Square access token in the Vercel project as `SQUARE_ACCESS_TOKEN` (sensitive). The production environment is already set to use the live account, and previews use Square's test mode.
  2. Deploy from `main`.
  3. Set the GitHub repo variable `CHECKOUT_URL` to `https://<vercel-domain>/api/create-checkout`.

  Until then the booking page stays in preview mode.
- **Not yet built:**
  - the paid booking does not land on the Square Appointments calendar;
  - the times shown are still sample availability.

  Next would be a Square webhook (`payment.updated`), which reads the order metadata the function writes (ref, appointment, customer, vehicles), plus real availability.
- **Live since 2026-10-03.** The function is at `https://mirror-finish-checkout-gray-matter5.vercel.app/api/create-checkout`, and the site build points at it (`site.yml`).
  - **Verified:** one test link on the live Square account listed the real catalog items ($450 order, $360 balance discount, $90 charged). The live booking flow was then run from vehicle to Pay, through Square, and back to the Detail Pass.
  - **First deploy fix:** Vercel compiled the function as CommonJS, so loading the shared pricing code failed. A root `package.json` (`type: module`) and explicit `.js` import paths fixed it.
  - **Test links left behind:** three, with references MF-75F7E76D, MF-7BD4B89E and MF-59DC65A2. They are unpaid draft orders with no charge, and can be deleted in Square.
  - **Switching back to preview mode:** set the repo variable `CHECKOUT_URL` to a single space and re-run the site workflow.

## Round 7 (Service Agreement gate, agreements and bookings saved to a database)
- **Gate before booking, as on the AGT site.** `/book` opens with the Service Agreement & Waiver (version 1.0.0, AGT's seven clauses worded for Mirror Finish). The booking tool stays inert behind it until the customer answers.
  - **Agree:** recorded, and the booking opens.
  - **Decline:** recorded too, then offers to book by text.
  - **Review step:** the agreement is linked so the customer can reread it.
  - **Text changes:** the text lives in `site/src/data/agreement.ts`. Bump `version` when any clause changes and everyone is asked again.
- **What is recorded** (`POST /api/agreement` to `mf_agreements`):
  - the decision;
  - the time the customer answered and the time the server recorded it;
  - the agreement version and a SHA-256 fingerprint of the exact clause text;
  - the IP address and browser, taken server-side;
  - the page.

  The server refuses answers to an older or altered text (409). These are the six ESIGN/UETA fields AGT's waiver plan calls for.
- **Checkout requires it.** `/api/create-checkout` checks for an accepted agreement on the current version before Square is called (428 otherwise, and the page shows the gate again).
  - **What is saved:** after Square creates the link, the whole build goes to `mf_bookings`: customer, address, appointment, each car's vehicle, size, package, add-ons and line prices, totals, the agreement id and the Square link and order ids.
  - **Square note:** the payment note also carries the agreement version and id.
  - **If the save fails:** the customer still goes to Square, and the failure is logged.
- **Database.** Supabase project "Studigo" (`blltmplsbabnklmnhmwv`), as the client chose.
  - **Tables:** Mirror Finish tables are prefixed `mf_`.
  - **Access:** RLS is on with no policies and anon/authenticated grants are revoked, so only the server's secret key can read or write them.
  - **Vercel settings:** the project has `SUPABASE_URL`; `SUPABASE_SECRET_KEY` is added by the client (Supabase, Project Settings, API Keys, secret key).
