---
name: overview
description: TRA3 deployment for [CLIENT_NAME] — business context, service model, deployment targets, and current build state
sources: [template]
aliases: [[CLIENT_ABBREV], [BUSINESS_NAME]]
---

## Purpose & context

- [CLIENT_NAME] is a [SERVICE_TYPE] business in [LOCATION].
- TRA3 is a white-label booking automation platform handling the deposit-to-confirmation flow.
- Client's booking experience: customer lands on their site → picks service + add-ons → sees deposit calculated in real time → pays securely through [PAYMENT_PROCESSOR] → gets redirected to schedule on [SCHEDULING_PLATFORM] → both customer and business owner get detailed SMS confirmation within seconds.
- Gray Matter LLC operates TRA3 as a recurring engagement: infrastructure hosting (AWS), SMS automation (Textbelt), payment processing (Stripe or Square), scheduling platform integration, and ongoing support.
- Core positioning: [CLIENT_NAME] owns the booking experience under their brand; Gray Matter owns the automation platform.

## Architecture overview

- **Frontend**: Dark luxury static site hosted on GitHub Pages (domain: [DOMAIN.COM])
- **Payments**: [PAYMENT_PROCESSOR] (Stripe preferred; Square as alternative)
- **Scheduling**: [SCHEDULING_PLATFORM] (Cal.com primary, Acuity Scheduling as alternative)
- **SMS**: Textbelt for SMS dispatch to customer and business owner
- **Backend**: Serverless AWS stack (Lambda Python 3.11, API Gateway, DynamoDB, S3, SSM Parameter Store, CloudWatch)
- **Infrastructure as Code**: Terraform for all AWS resources, version-controlled in GitHub
- **Version control**: GitHub repo `WGLewis0721/[REPO_NAME]`, SSH alias `github.com-WGLewis0721`

## Booking flow architecture

1. Customer visits [DOMAIN.COM]
2. Selects service and add-ons (frontend pricing Lambda computes deposit in real time)
3. Enters full booking details (customer name, email, phone; address; appointment date/time)
4. Pays deposit through [PAYMENT_PROCESSOR] (webhook triggers booking confirmation Lambda)
5. Redirected to [SCHEDULING_PLATFORM] to confirm appointment slot
6. Within seconds: SMS to customer (booking summary + balance due) and business owner (customer contact + appointment details)

## Current deployment state

### Live in production

- Frontend: [DOMAIN.COM] active (GitHub Pages)
- Pricing Lambda: `tra3-[CLIENT_ABBREV]-prod-pricing-api` operational
- Payment intake Lambda: `tra3-[CLIENT_ABBREV]-prod-booking-webhook` operational
- DynamoDB table: `tra3-[CLIENT_ABBREV]-prod-bookings` (stores all booking records)
- SSM parameters: `/tra3/[CLIENT_ABBREV]/prod/` namespace

### Ready to ship

- Booking confirmation SMS Lambda (fires on [PAYMENT_PROCESSOR] webhook)
- Webhook secret rotation and security hardening
- [SPECIFIC_FEATURES_FOR_THIS_CLIENT]

### On the horizon

1. **Booking record persistence** - DynamoDB write to capture every booking (booking_id, timestamp, customer name/email/phone, service, addons, address, appointment_date, deposit_paid, balance_due, source, environment, status); also export CloudWatch Logs to S3 for tax/legal retention.
2. **Multi-[ROLE] SMS notification** - support sending booking SMS to multiple business owners (comma-separated phone list, loop and send).
3. **Admin bookings dashboard** - dark luxury aesthetic, stat cards, searchable/sortable booking table with expandable rows, Bearer token auth against SSM.
4. **[CLIENT_SPECIFIC_FEATURE]**

## Key AWS resources

| Resource | Name | Purpose |
|----------|------|---------|
| Lambda (pricing) | `tra3-[CLIENT_ABBREV]-prod-pricing-api` | Real-time deposit calculation from service/addon selection |
| Lambda (webhook) | `tra3-[CLIENT_ABBREV]-prod-booking-webhook` | Payment webhook intake and SMS dispatch |
| API Gateway | `[APIGW_ID]` | HTTP endpoint for pricing and payment callbacks |
| DynamoDB table | `tra3-[CLIENT_ABBREV]-prod-bookings` | Booking record persistence (read/write access) |
| SSM Parameter Store | `/tra3/[CLIENT_ABBREV]/prod/*` | Environment variables, secrets, webhooks (read access) |
| CloudWatch Logs | `/aws/lambda/tra3-[CLIENT_ABBREV]-prod-*` | Execution logs and booking audit trail |

## GitHub repo setup

- Repository: `WGLewis0721/[REPO_NAME]`
- Remote alias: `[CLIENT_ABBREV]` (set in `.git/config`)
- Branch strategy: `main` (production), `[CLIENT_ABBREV]-v2` (development/feature work)
- Key directories:
  - `frontend/` - static HTML/CSS/JS for [DOMAIN.COM]
  - `backend-integration/lambda/` - Python Lambda code
  - `backend-integration/terraform/` - AWS infrastructure definitions
  - `docs/` - architecture and deployment runbooks
  - `scripts/` - PowerShell deployment automation

## Build gotchas (inherited from AGT build experience)

- OneDrive file-lock trap: repo stored under OneDrive can cause conflicts during builds
- Layer requirements path: `bootstrap-layer.ps1` reads from `backend-integration/layer/requirements.txt` (not client-specific paths)
- manylinux2014 pip flags required for Lambda-compatible builds on Windows
- API Gateway permissions must be explicitly granted in Terraform (not assumed from wiring)
- Signed HMAC webhook testing: fire locally signed HMAC-SHA256 payloads directly at API Gateway endpoint
- Webhook secrets must be machine-random; store in SSM before deployment
- [PAYMENT_PROCESSOR] event names and SDK import paths (client-specific)

## Workflow & escalation

- **Design & verify**: Claude (architecture planning)
- **Execute**: VS Code Claude Code or Copilot Agent Mode (file editing, terminal, Lambda builds)
- **Review & merge**: William approves diffs before commit/push to GitHub
- **Deployment**: PowerShell `deploy.ps1` script with environment guards and rollback markers
- **Debugging**: diagnose root cause before writing fix prompts; parallel analysis (Claude + ChatGPT) for complex issues

---

## Pre-launch checklist

- [ ] Frontend live on GitHub Pages (domain verified)
- [ ] Pricing Lambda operational (test with curl or Postman)
- [ ] Payment webhook secret rotated and stored in SSM
- [ ] SMS templates validated (customer + business owner)
- [ ] DynamoDB schema finalized and table created
- [ ] API Gateway permissions tested (CORS, auth headers, HMAC verification)
- [ ] [SCHEDULING_PLATFORM] webhook secret generated and stored
- [ ] End-to-end booking flow tested (payment → SMS → scheduling redirect)
- [ ] CloudWatch alarms set (webhook failures, Lambda errors, quota breaches)
- [ ] Incident runbook documented

## Post-launch monitoring

- [ ] Daily CloudWatch Logs review (first week)
- [ ] Weekly booking volume and success rate report
- [ ] SMS delivery confirmation (Textbelt logs)
- [ ] [PAYMENT_PROCESSOR] settlement reconciliation
- [ ] Customer feedback review (phone/email)
