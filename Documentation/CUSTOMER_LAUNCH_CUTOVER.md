# Mirror Finish — production booking cutover

## State as of October 9, 2026

Implementation branch: \`fix/customer-booking-readiness-20261009\`.

**Do not enable customer deposit checkout yet.** Square deposits were previously
possible without a stored agreement or real appointment availability. The new
backend code fails closed until the dependencies below are configured. The
old publicly deployed checkout remains on the previous main branch until a
verified deployment replaces it.

## Dedicated Supabase project — provisioned October 9, 2026

- Project: **Mirror Finish** (`potuicptomrjmtarlrpt`, `us-east-1`).
- API base: `https://potuicptomrjmtarlrpt.supabase.co`.
- Organization: Apex (only accessible Supabase organization).
- Supabase creation cost quotation: $0/month, within the account's free project allocation.
- The existing APEX application database (`fnmxlmjrkgojowpzrcwa`) was paused by the owner to release the active-project slot; it has not been deleted or altered as part of this work.
- The migration in `supabase/migrations/20261009_mirror_finish.sql` was applied successfully.
- `mf_agreements` and `mf_bookings` have RLS enabled, no public policies, and have been verified in the new database.
- Legacy same-named tables in Studigo contained zero rows when checked on October 9; no customer rows needed copying.
- The existing Vercel `SUPABASE_URL` environment variable now points at Mirror Finish for Production and Preview.

**Still required:** Create or copy a *new project's* `sb_secret_...` credential from the Mirror Finish Supabase dashboard and set Vercel's `SUPABASE_SECRET_KEY` as a **Sensitive** Production-only environment variable. The Supabase connector cannot retrieve secret keys, only publishable keys. Do not paste private keys into GitHub or chat.

The REST database helper uses `apikey: sb_secret_...` **without** an `Authorization: Bearer` header, as opaque Supabase secret keys are not JWTs. The dedicated-project URL and new key must belong to the **same project**.

## Vercel — mirror-finish-checkout

The dedicated project is provisioned. Check/complete the following environment configuration:
- \`SUPABASE_URL\`: the new Mirror Finish project URL
- \`SUPABASE_SECRET_KEY\`: the **new** project's server secret (\`sb_secret_...\`)
- \`SQUARE_ACCESS_TOKEN\`: Square seller production token (already configured)
- \`SQUARE_LOCATION_ID\`, \`SQUARE_ENV=production\` (already configured)
- \`SITE_URL\`, \`ALLOWED_ORIGINS\`: verified custom site URL and origin once known
- \`SQUARE_APPOINTMENT_TEAM_MEMBER_ID\`: **bookable** Square detailer/team-member ID
- \`SQUARE_APPOINTMENT_DELUXE_VARIATION_ID\` and \`SQUARE_APPOINTMENT_DELUXE_VERSION\`
- \`SQUARE_APPOINTMENT_EXTERIOR_VARIATION_ID\` and \`SQUARE_APPOINTMENT_EXTERIOR_VERSION\`
- \`SQUARE_APPOINTMENT_INTERIOR_VARIATION_ID\` and \`SQUARE_APPOINTMENT_INTERIOR_VERSION\`
- \`SQUARE_WEBHOOK_SIGNATURE_KEY\`: from the Square Webhooks subscription, sensitive
- \`SQUARE_WEBHOOK_URL\`: **exact** public \`https://.../api/square-webhook\` subscription URL

Appointment variation IDs must be Square **Appointments service** variation IDs
(not the checkout catalog item IDs). The version is the corresponding catalog
object version. The merchant account must permit API appointment creation.
Square seller-level bookings generally require an eligible paid Appointments plan.
Booking times are interpreted in **America/Chicago** for Montgomery, Alabama.

In Square Developer Console subscribe to \`payment.created\` and \`payment.updated\`
and copy the subscription signature key. Webhook authenticity must use the exact
notification URL + raw request body. Never add this key to GitHub.

## Supported online scheduling scope

In this first conservative integration, automatic Square appointments are only
supported for **one vehicle, one package, and no add-ons**. Multi-vehicle and
add-on combinations require a human scheduling confirmation. This avoids taking
a deposit for a duration not matched to an Appointments service. The site
preserves full quotes and points customers to SMS for manual scheduling.

GET \`/api/health\` returns 503 plus the names (never values) of missing config
variables. Even if it returns 200, an end-to-end Square API smoke test is
required to verify the paid plan, team permissions and actual service mapping.

## Customer acceptance test — no live paid test without approval

1. Use the new dedicated Supabase tables. From the website, accept the agreement
   and verify an \`mf_agreements\` accepted row was recorded.
2. Select a Square-available, real service slot. Verify the API response is from
   Square, and a fake/unavailable slot is rejected before a link can be created.
3. Start hosted checkout; verify \`mf_bookings\` has \`checkout_created\`.
4. Use **Square sandbox** for payment and webhook replay tests where possible,
   then approved live low-value test only if needed. Verify Square's signature and
   reject forged events.
5. After a successful completed deposit, verify \`mf_bookings.status='confirmed'\`,
   \`square_booking_id\` is set, and the booked time appears in Square Appointments.
6. Confirm duplicate webhooks do not double-create appointments.
7. Confirm database outage, Square permission denial and unavailable slots do
   **not** produce new payable checkout links.
8. Verify a production redeployment consumed changed Vercel env values.

## Custom domain

The connected Cloudflare account currently holds only
\`graymatterdigitalsolutions.com\` and \`wglewis.dev\`. Neither has been identified
as Mirror Finish's purchased domain. **Do not change these unrelated domains**.
Once the correct domain is added to Cloudflare, add its GitHub Pages DNS record,
configure it in GitHub Pages Settings (required for Actions deployments),
set the Astro site URL, and Vercel \`SITE_URL\`/\`ALLOWED_ORIGINS\`.

GitHub Actions Pages does not require a committed \`CNAME\` when deployed from an
Actions workflow; Pages Settings owns the custom domain. Do not assume adding
\`CNAME\` alone changes the domain.

## Housekeeping

- The Refero API token shared in a chat should be revoked and replaced **in
  Refero's account console**. The connected Refero plugin is read-only and cannot
  rotate tokens directly; do not copy an exposed token into another secret store.
- The three disposable Square Payment Links should only be deactivated after
  cross-checking none represents a genuine customer deposit.
- Keep the placeholder reward and vehicle size configuration unchanged until
  business approval.
- Lighthouse and visual QA are required after the domain cutover; do not claim
  completed performance measurements from code-only checks.
