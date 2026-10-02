# System Context

```
Visitor -> GitHub Pages (static files) -> HTML/CSS
                |
                +-- Book buttons -> Square Appointments (calendar, payments, confirmations)
                +-- Call/Text   -> tel:/sms: (client phone)

Google Drive Assets/ -> GitHub Action (every 5 min) -> repo Assets/
GitHub push -> GitHub Action -> GitHub Pages (URL in the run summary)
```

## Boundaries
- **Square owns** services, availability, bookings, payments, customer messages. The site never calls the Square API.
- **The site owns** copy, prices shown, photos, SEO.
- **No secrets in the repo.** The static site needs none; Drive sync uses its own service-account secrets.

## Single sources of truth (in `site/`)
- `src/data/site.ts`: name, phone, booking URL, service area
- `src/data/menu.ts`: packages, size add-ons, extras (prices)
- `src/styles/tokens.css`: colors, spacing, type

## Tradeoffs
Prices on the site are copied from the client's flier and can drift from Square. Update both together.
