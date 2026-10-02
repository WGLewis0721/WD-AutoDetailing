# Mirror Finish Mobile Detailing (MFMD-MGM)

A TRA3 booking automation system for **Mirror Finish Mobile Detailing** in Montgomery, AL.

**Client:** Mirror Finish Mobile Detailing  
**Repo:** [WD-AutoDetailing](https://github.com/WGLewis0721/WD-AutoDetailing)  
**Payment Processor:** Square Appointments + Payments  
**Build Status:** In Progress  

---

## Quick Start

1. **Read the full instructions:** Open [`MFMD-MGM-PROJECT-INSTRUCTIONS.md`](./MFMD-MGM-PROJECT-INSTRUCTIONS.md)
2. **Run Week 1 checklist:** Client discovery, AWS setup, secrets management
3. **Week 2–4:** Frontend build, Lambda webhooks, testing & launch

---

## Services & Pricing

| Service | Price | Deposit |
|---------|-------|---------|
| Exterior Detail | $140 | $70 |
| Interior Detail | $175 | $87.50 |
| Full Detail | $220 | $110 |
| Add-Ons | +$60–$80 | +50% |

**All services require 50% deposit at booking.**

---

## System Architecture

```
Customer Books → Square Appointments API → Lambda Webhook → DynamoDB
                                         ↓
                         SMS Notification (SNS → Twilio)
```

### AWS Resources (Prod Environment)
- **Lambda:** booking-webhook, sms-notifier, reminder-schedule
- **DynamoDB:** bookings, customers
- **SNS:** SMS notifications
- **API Gateway:** HTTPS endpoint for Square webhooks
- **Naming:** `tra3-mfmd-prod-*`

---

## Key Files

| File | Purpose |
|------|---------|
| [`MFMD-MGM-PROJECT-INSTRUCTIONS.md`](./MFMD-MGM-PROJECT-INSTRUCTIONS.md) | **START HERE** — Complete architecture, pricing, AWS resources, build gotchas, week-by-week roadmap, checklists |
| `frontend/` | React/Vite site + Square booking widget |
| `lambda/` | Node.js functions (webhook handler, SMS notifier) |
| `terraform/` | Infrastructure-as-code (DynamoDB, Lambda, SNS, API Gateway) |
| `.github/workflows/deploy.yml` | GitHub Actions CI/CD pipeline |

---

## Build Phases

### Phase 1: Foundation (Weeks 1–4)
- AWS infrastructure provisioning
- Frontend + booking widget
- Lambda webhooks + SMS notifications
- Launch to production

### Phase 2: Enhancements (Post-Launch)
- Custom form fields (vehicle color, priority)
- Business admin dashboard (view bookings, manage cancellations)
- Automated invoice generation

### Phase 3: Integration (Future)
- Google Calendar sync for technician schedules
- Customer portal (reschedule, view history)
- Payment recovery (automated invoice for balance due)

---

## Development Workflow

### Local Setup
```bash
cd frontend && npm install
cd ../lambda && npm install
terraform init
```

### Deploy
```bash
# Test
npm test

# Lambda local testing
sam local start-api

# Deploy to AWS
terraform apply
github Actions → automated on push to main
```

### Testing Gates (Before Merge)
- [ ] Unit tests pass
- [ ] Lambda tested locally
- [ ] No secrets in code
- [ ] IAM policies least-privilege
- [ ] SMS format validated
- [ ] DynamoDB schema matches

---

## Known Gotchas

**See [`MFMD-MGM-PROJECT-INSTRUCTIONS.md`](./MFMD-MGM-PROJECT-INSTRUCTIONS.md#build-gotchas-hard-won) for detailed gotchas:**

1. **Lambda:** Cold starts, dependency errors — use layers
2. **DynamoDB:** Throttling on high volume — use on-demand billing initially
3. **Square:** Webhook signature validation, credential storage
4. **SNS→Twilio:** Manual subscription step (can't automate)
5. **SMS:** Phone number format (E.164), no null values

---

## Post-Launch Monitoring

### CloudWatch Dashboard
Monitor daily (first month):
- Lambda invocation count & duration
- Lambda error rate (target: 0%)
- DynamoDB consumed capacity
- SNS message publishing
- API Gateway 4XX/5XX errors

### Alert Thresholds
- Lambda errors > 5% → page on-call
- DynamoDB throttle events > 0 → scale capacity
- API Gateway 5XX > 10/hour → check logs

---

## Support

**New to TRA3 booking builds?** Start with the instructions file above.

**Specific issue?** Reference sections:
- Architecture → `MFMD-MGM-PROJECT-INSTRUCTIONS.md#architecture-overview`
- AWS Setup → `MFMD-MGM-PROJECT-INSTRUCTIONS.md#aws-resources-prod-environment`
- Troubleshooting → `MFMD-MGM-PROJECT-INSTRUCTIONS.md#build-gotchas-hard-won`
- Pre-Launch → `MFMD-MGM-PROJECT-INSTRUCTIONS.md#pre-launch-checklist`

---

**Status:** Ready for Phase 1 build  
**Last Updated:** 2026-10-02  
**Built by:** Gray Matter Web Studio