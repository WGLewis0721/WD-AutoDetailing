---
name: quick-setup
description: Quick onboarding checklist for TRA3 [CLIENT_NAME] — first 48 hours, key decisions, resource provisioning
sources: [template]
aliases: []
---

## Week 1: Client discovery & decisions

### Gather requirements

- [ ] **Service offerings**: List all services, pricing per service, any add-ons (rush fee, premium wash, etc.)
- [ ] **Deposit model**: Fixed % of service price, or fixed amount per service? Deposit refundable if cancelled?
- [ ] **Scheduling constraints**: Lead time before booking? Same-day bookings allowed? Operating hours / days?
- [ ] **Payment processor preference**: Stripe (preferred, lower fees) or Square (existing account)?
- [ ] **Scheduling platform**: Cal.com (simpler, white-label) or Acuity (more complex, feature-rich)?
- [ ] **Business owner contact**: Primary phone for SMS confirmations. Any additional owners to notify?
- [ ] **Domain**: Is [DOMAIN.COM] already registered? Any DNS hosting in place?
- [ ] **Branding**: Logo, color scheme (dark luxury aesthetic preferred), any brand guidelines?

### Decision matrix

| Decision | Options | Recommended | Notes |
|----------|---------|-------------|-------|
| Payment processor | Stripe / Square | Stripe | Lower fees, better API, easier webhook testing |
| Scheduling | Cal.com / Acuity | Cal.com | Simpler white-label, fewer moving parts |
| SMS provider | Textbelt (only option) | Textbelt | Fixed cost, reliable, no account setup needed |
| Frontend hosting | GitHub Pages (only option) | GitHub Pages | Free, fast, integrates with Terraform workflow |
| Database | DynamoDB (only option) | DynamoDB | Serverless, scales with traffic, cost-effective |

## Week 1-2: Infrastructure provisioning

### GitHub repository setup

- [ ] Create repo: `WGLewis0721/[REPO_NAME]` (private or public)
- [ ] Clone AGT repo as template: `git clone git@github.com-WGLewis0721:WGLewis0721/AGT-2026.git [REPO_NAME]`
- [ ] Remove AGT-specific files: `rm -rf .git && git init`
- [ ] Update `.git/config` with `[CLIENT_ABBREV]` remote alias
- [ ] Create branch: `git checkout -b [CLIENT_ABBREV]-v2`
- [ ] Set up GitHub Pages: Settings → Pages → Deploy from `main` branch, `frontend/` folder

### AWS resources (via Terraform)

Run from `backend-integration/terraform/`:

- [ ] Copy `agt.tfvars` → `[client_abbrev].tfvars`, update all placeholders
- [ ] Initialize Terraform: `terraform init`
- [ ] Plan deployment: `terraform plan -var-file=[client_abbrev].tfvars`
- [ ] Apply: `terraform apply -var-file=[client_abbrev].tfvars`
- [ ] Outputs: note Lambda ARNs, API Gateway endpoint, DynamoDB table name, SSM parameter paths

### Payment processor setup

**Stripe:**
- [ ] Create Stripe account (or use existing)
- [ ] Create API key (restricted to this client if possible)
- [ ] Copy to SSM: `/tra3/[CLIENT_ABBREV]/prod/stripe_secret_key`
- [ ] Generate webhook secret, store in SSM: `/tra3/[CLIENT_ABBREV]/prod/stripe_webhook_secret`
- [ ] Add webhook endpoint in Stripe Dashboard: `https://[API_GATEWAY_ID].execute-api.us-east-1.amazonaws.com/prod/stripe-webhook`

**Square:**
- [ ] Create Square account (or use existing)
- [ ] Copy API key to SSM: `/tra3/[CLIENT_ABBREV]/prod/square_access_token`
- [ ] Generate webhook signature key, store in SSM: `/tra3/[CLIENT_ABBREV]/prod/square_webhook_secret`
- [ ] Add webhook endpoint in Square Dashboard: `https://[API_GATEWAY_ID].execute-api.us-east-1.amazonaws.com/prod/square-webhook`

### Scheduling platform setup

**Cal.com:**
- [ ] Create Cal.com account for business owner
- [ ] Create event type: "[SERVICE_TYPE] Booking" (30 min, sync w/ client calendar)
- [ ] Generate Cal.com API key, store in SSM: `/tra3/[CLIENT_ABBREV]/prod/calendar_api_key`
- [ ] Note event type ID (e.g., `evt_1234567`), store in SSM: `/tra3/[CLIENT_ABBREV]/prod/calendar_event_type`
- [ ] Test webhook: POST mock booking to Cal.com endpoint

**Acuity:**
- [ ] Create Acuity account
- [ ] Set up appointment type matching services
- [ ] Generate API key, store in SSM: `/tra3/[CLIENT_ABBREV]/prod/acuity_api_key`
- [ ] Document webhook payload schema before Lambda coding

### SMS setup

- [ ] Textbelt account ready (no setup needed; pay per SMS)
- [ ] Business owner phone verified in Textbelt sandbox
- [ ] Store in SSM: `/tra3/[CLIENT_ABBREV]/prod/textbelt_api_key`

## Week 2-3: Frontend & Lambda builds

### Frontend customization

- [ ] Copy AGT `frontend/` → new client structure
- [ ] Update `index.html`: client logo, brand colors, service descriptions
- [ ] Update `pricing.html`: package names, prices, deposit %
- [ ] Update `booking.html`: form labels, booking form fields (address, vehicle type, etc.)
- [ ] Update API endpoints: replace AGT API Gateway URL with [CLIENT_ABBREV] URL
- [ ] Deploy to GitHub Pages: `git push [CLIENT_ABBREV] [CLIENT_ABBREV]-v2:main`

### Pricing Lambda

- [ ] Copy from AGT `backend-integration/lambda/pricing/`
- [ ] Update service/addon definitions (replace AGT-specific items)
- [ ] Update Lambda function name in Terraform (matches deploy script)
- [ ] Test locally: `python pricing_function.py` with mock event
- [ ] Deploy: `./deploy.ps1 -Client [CLIENT_ABBREV] -Environment prod`

### Booking webhook Lambda

- [ ] Copy from AGT `backend-integration/lambda/booking_webhook/`
- [ ] Update [PAYMENT_PROCESSOR] event parsing (Stripe vs Square)
- [ ] Update SMS message templates (customer + business owner)
- [ ] Update DynamoDB write schema to match booking table
- [ ] Test webhook signature verification: fire signed test payload
- [ ] Deploy: `./deploy.ps1 -Client [CLIENT_ABBREV] -Environment prod`

## Week 3-4: Testing & launch

### Pre-launch testing checklist

- [ ] **Frontend load**: [DOMAIN.COM] loads, all assets serve, no CORS errors
- [ ] **Pricing calculation**: Select service/addons, deposit calculates correctly
- [ ] **Stripe/Square payment**: Test payment flow (use sandbox keys), success/error handling
- [ ] **Webhook delivery**: Pay with sandbox card, Lambda fires, logs confirm receipt
- [ ] **SMS dispatch**: Customer + business owner SMS arrive within 5 seconds, content correct
- [ ] **Scheduling redirect**: After payment, redirected to Cal.com/Acuity, booking slot visible
- [ ] **DynamoDB persistence**: Query booking table, all fields present and correct
- [ ] **Error recovery**: Test network failure, webhook replay, payment failure scenarios
- [ ] **CloudWatch monitoring**: Alarms configured for Lambda errors, webhook failures, quota breaches

### Launch day

- [ ] Notify business owner: system live, test a real booking if possible
- [ ] Monitor CloudWatch Logs (first 24 hours): no errors, all workflows completing
- [ ] Validate payment deposits arriving in Stripe/Square account
- [ ] Check SMS logs (Textbelt): confirm delivery to customer + business owner
- [ ] Get feedback: user experience, any bugs or edge cases

## Post-launch (Week 4+)

### Recurring tasks

- [ ] **Daily (Week 1)**: Review CloudWatch Logs for errors, check Textbelt delivery logs
- [ ] **Weekly**: Monitor booking volume, success rate, customer feedback
- [ ] **Monthly**: Reconcile payment processor settlements, export DynamoDB records to S3
- [ ] **Quarterly**: Analyze booking trends, identify optimization opportunities

### Feature backlog (in order of priority)

1. **Booking record dashboard**: Admin view of all bookings (dark luxury UI)
2. **Multi-owner SMS**: Support multiple business owner phones per booking
3. **Cancellation flow**: Customer-initiated booking cancellation with SMS notification
4. **Email confirmations**: Async email to customer (backup to SMS)
5. **Payment plan support**: Split deposits + balance due across multiple payments
6. **Custom branding**: Client-specific SMS message templates via SSM

## Troubleshooting quick links

- **Lambda build fails**: Check OneDrive file locks, delete `.zip` files, re-run `deploy.ps1`
- **Webhook not firing**: Verify secret in SSM matches webhook config in payment processor dashboard
- **SMS not sending**: Check Textbelt API key in SSM, verify recipient phone number format
- **API Gateway CORS errors**: Verify CORS config in Terraform, check browser console
- **DynamoDB query fails**: Verify IAM role permissions for Lambda, check table name in Lambda code
