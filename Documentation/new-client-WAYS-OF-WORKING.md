# Ways of Working

## Rules
- **Content integrity:** never invent services, prices, hours, reviews or claims. Anything not confirmed by the client stays off the site.
- **Wireframe first**, then design, then build. Written client approval at each gate.
- **Booking stays on the client's tool.** Link to it; do not rebuild it.
- **Client owns production accounts** (GitHub, Square, domain). Secrets live in GitHub, never in the repo.
- **Simplest reliable mechanism.** Static site, no backend.
- **Human approval before publishing.**

## Branches and commits
- Work on a feature branch; preview deploys come from branches, production from `main`.
- Small commits with clear messages.

## Review checklist before Gate 3
- All Book links equal the Square URL; phone links work.
- Prices match the client's current flier and Square.
- Hours, address and email only if confirmed.
- Lighthouse performance, accessibility and SEO all green; mobile and keyboard pass.
- No secrets or `localhost` in the built output.
