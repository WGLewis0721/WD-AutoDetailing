---
name: system-context
description: System context reference for new Claude project — architecture diagram, decision log, client-specific details
sources: [template]
aliases: [context]
---

## TRA3 [CLIENT_NAME] System Architecture

```
┌─────────────────┐
│  Customer      │
│  Visits        │
│ [DOMAIN.COM]  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  GitHub Pages (Frontend)            │
│  - Dark luxury UI                   │
│  - Service + addon selection        │
│  - Booking form (customer details)  │
│  - Stripe/Square checkout button    │
└────────┬────────────────────────────┘
         │
         ├─────────────────────┐
         │                     │
         ▼                     ▼
    [PRICING LAMBDA]     [PAYMENT PROCESSOR]
    (Real-time          (Stripe/Square)
     deposit calc)          │
                            ▼
                   [PAYMENT WEBHOOK SECRET]
                            │
                            ▼
                    ┌──────────────────────────┐
                    │  API Gateway /webhook   │
                    │  (HMAC verification)   │
                    └───────────┬──────────────┘
                                │
                                ▼
                    ┌────────────────────────────┐
                    │  Booking Webhook Lambda   │
                    │  (Python 3.11)            │
                    │  - Verify HMAC            │
                    │  - Parse payment event    │
                    │  - Write to DynamoDB      │
                    │  - Fire SMS to customer   │
                    │  - Fire SMS to owner      │
                    └────────┬───────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
    [DynamoDB]          [Textbelt SMS]      [SCHEDULING PLATFORM]
    (Booking             (Customer +         (Cal.com/Acuity)
     records)            Owner notify)        (Book appt slot)
```

## Client-specific details

**Business name**: [CLIENT_NAME]
**Service type**: [SERVICE_TYPE]
**Location**: [LOCATION]
**Domain**: [DOMAIN.COM]
**Repo**: `WGLewis0721/[REPO_NAME]`
**AWS region**: `us-east-1` (or [REGION])
**Payment processor**: [PAYMENT_PROCESSOR] (Stripe/Square)
**Scheduling platform**: [SCHEDULING_PLATFORM] (Cal.com/Acuity)
**Business owner phone**: [OWNER_PHONE] (SMS notifications)

## Service offerings

| Service | Price | Deposit | Add-ons |
|---------|-------|---------|---------|
| [SERVICE 1] | $[PRICE] | [DEPOSIT] | [LIST ADDONS] |
| [SERVICE 2] | $[PRICE] | [DEPOSIT] | [LIST ADDONS] |
| [SERVICE 3] | $[PRICE] | [DEPOSIT] | [LIST ADDONS] |

## AWS resources summary

| Name | Type | Purpose | Key notes |
|------|------|---------|-----------|
| `tra3-[CLIENT_ABBREV]-prod-pricing-api` | Lambda | Deposit calculation | Python 3.11, ~200ms response |
| `tra3-[CLIENT_ABBREV]-prod-booking-webhook` | Lambda | Payment webhook handler | Verifies HMAC, writes DB, sends SMS |
| `tra3-[CLIENT_ABBREV]-prod-bookings` | DynamoDB | Booking records | On-demand billing, TTL 90 days |
| `/tra3/[CLIENT_ABBREV]/prod/*` | SSM Parameter Store | Secrets & config | API keys, webhook secrets, phone numbers |

## Decision log

### Architecture

- **Why Lambda + DynamoDB?** Serverless eliminates infrastructure management. Per-request pricing aligns with variable booking volume.
- **Why [SCHEDULING_PLATFORM]?** [REASON: Cal.com = simpler white-label; Acuity = more features but complex]
- **Why [PAYMENT_PROCESSOR]?** [REASON: Stripe = lower fees + better API; Square = existing account or reader integration]
- **Why Textbelt for SMS?** No account setup, pay-per-SMS, reliable delivery, supports two-way SMS (future).

### Booking flow

- **No booking stored in payment processor**: Payment processor only handles payment, TRA3 owns booking record in DynamoDB. Single source of truth = TRA3.
- **SMS fires after DynamoDB write**: Ensures booking is persisted even if SMS fails. Manual SMS can be sent if delivery fails.
- **Deposit model**: [FIXED %] of service price. Refund policy: [CLIENT_POLICY].
- **Scheduling redirect**: Customer directed to [SCHEDULING_PLATFORM] AFTER payment. Appointment slot confirmed by customer there. (Alternative: auto-book slot via platform API, but [REASONING].)

### Security

- **Webhook secret rotation**: Before go-live and every 90 days. Stored in SSM (never in code).
- **API Gateway + HMAC**: All webhook requests verified with HMAC-SHA256. Replay protection via timestamp check (5-min window).
- **IAM roles**: Lambda has minimal permissions (read SSM, write DynamoDB, write CloudWatch Logs).
- **No customer payment data in logs**: Lambda sanitizes logs before writing CloudWatch. Card numbers never logged.

## Known limitations & workarounds

- **No SMS scheduling**: SMS fires immediately on payment success. To send at specific time (e.g., 24-hour reminder), use separate Lambda + EventBridge (future feature).
- **No partial refunds**: Refund flow manual via payment processor dashboard. Auto-refund Lambda is backlog item.
- **Single booking at a time**: No concurrent bookings from same customer. If needed, add concurrency check to webhook Lambda.
- **[SCHEDULING_PLATFORM] availability**: If [SCHEDULING_PLATFORM] is down, customer still sees success page but cannot book slot. Manual follow-up required.

## Deployment & promotion path

**Development** → **Staging** → **Production**

### Development (Local)

- Branch: `[CLIENT_ABBREV]-dev`
- Payment processor: Stripe/Square sandbox
- Lambda env vars: `ENVIRONMENT=dev`
- Testing: Fire mock events locally, verify Lambda logs

### Staging (AWS)

- Branch: `[CLIENT_ABBREV]-staging`
- Payment processor: Stripe/Square sandbox (or separate live account)
- Lambda env vars: `ENVIRONMENT=staging`
- Testing: Full end-to-end flow, real SMS delivery (to test number)
- Approval: William reviews Terraform plan, verifies no production resource changes

### Production (AWS)

- Branch: `main`
- Payment processor: Stripe/Square production
- Lambda env vars: `ENVIRONMENT=prod`
- Monitoring: CloudWatch alarms, daily log review (Week 1), weekly thereafter
- Escalation: Any Lambda errors → page William immediately

## Common Copilot prompts

```
Work on branch [CLIENT_ABBREV]-v2. Review docs/system-context.md first.

Update [SERVICE_NAME] pricing in Lambda:
- Old price: $[OLD]
- New price: $[NEW]
- New deposit: [DEPOSIT]

Acceptance criteria:
- [ ] Pricing Lambda tested with mock event
- [ ] DynamoDB schema unchanged
- [ ] Frontend pricing.html updated to match

Generate summary of changes. Do not commit or push.
```

```
Work on branch [CLIENT_ABBREV]-v2. Review docs/system-context.md and build-lessons.md first.

Add [FEATURE_NAME]:
[DETAILED FEATURE DESCRIPTION]

Architecture notes:
- Uses Lambda + [SERVICE]
- Integrates with [EXTERNAL_API]
- Persists to DynamoDB table [TABLE_NAME]

Acceptance criteria:
- [ ] Lambda code handles [EDGE_CASE]
- [ ] Error logging to CloudWatch
- [ ] Test event fires without errors
- [ ] No changes to production infrastructure

Do not commit or push.
```

## Monitoring & alerting

### CloudWatch alarms (auto-created by Terraform)

- Lambda errors > 1: Page on-call (William)
- Lambda duration > 10s: Log and monitor (performance degradation signal)
- API Gateway 5xx > 5/min: Page on-call
- DynamoDB throttling: Page on-call
- Textbelt SMS failures > 3: Daily summary email

### Logs to monitor

- `/aws/lambda/tra3-[CLIENT_ABBREV]-prod-pricing-api` - Real-time pricing requests
- `/aws/lambda/tra3-[CLIENT_ABBREV]-prod-booking-webhook` - Payment events, SMS status
- Textbelt dashboard - SMS delivery status, bounce rates

## First 7 days post-launch

- **Day 1**: Monitor pricing Lambda (volume, latency, errors)
- **Days 2-3**: Full end-to-end booking tests (payment → SMS → scheduling)
- **Days 4-7**: Production monitoring, customer feedback, edge case handling

If critical issue found, use rollback pattern: revert Lambda code, restore previous `.zip` from S3.
