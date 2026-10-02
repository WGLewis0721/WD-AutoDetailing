---
name: build-lessons
description: Hard-won build gotchas and architecture principles — read before touching Lambda builds, Terraform, Square/Stripe, or webhooks
sources: [template]
aliases: [TRA3-Build-Runbook]
---

## Build gotchas (learned from AGT / FOLD)

### Repository & workspace

- **OneDrive file-lock trap**: Repo stored under OneDrive can cause file lock conflicts during builds. If seeing permission errors during `bootstrap-layer.ps1` or Terraform runs, check if OneDrive is syncing the repo folder.
- **git config remote alias**: Set up remote alias in `.git/config` for easy pushes:
  ```
  [remote "[CLIENT_ABBREV]"]
    url = git@github.com-WGLewis0721:WGLewis0721/[REPO_NAME].git
    fetch = +refs/heads/*:refs/remotes/[CLIENT_ABBREV]/*
  ```
  Then use `git push [CLIENT_ABBREV] branch-name` instead of long URLs.

### Lambda builds (Python 3.11)

- **Layer requirements path**: `bootstrap-layer.ps1` reads from `backend-integration/layer/requirements.txt` — not client-specific requirements files.
- **manylinux2014 pip flags required on Windows**:
  ```
  pip install --platform manylinux2014_x86_64 --implementation cp --python-version 311 --only-binary=:all: -r requirements.txt -t .
  ```
  Without these flags, compiled bindings fail at Lambda runtime.
- **Force-redeploy pattern**: Delete Lambda zip files before running `deploy.ps1` to ensure fresh builds:
  ```
  rm backend-integration/lambda/tra3_[CLIENT_ABBREV]_prod_*.zip
  ./deploy.ps1 -Client [CLIENT_ABBREV] -Environment prod
  ```
- **SDK import path for [PAYMENT_PROCESSOR]**: 
  - Stripe: `from stripe import Stripe` (v9+)
  - Square: `from square import Square` (v42+), not `from square.client import Client`
- **Event name mapping**:
  - Stripe: `payment_intent.succeeded`
  - Square: `payment.updated` with `status == "COMPLETED"` (not `payment.completed`)

### Terraform & AWS infrastructure

- **API Gateway permissions**: Permissions must be explicitly granted in Terraform, not assumed from wiring:
  ```hcl
  resource "aws_lambda_permission" "api_invoke" {
    statement_id  = "AllowAPIGatewayInvoke"
    action        = "lambda:InvokeFunction"
    function_name = aws_lambda_function.booking_webhook.function_name
    principal     = "apigateway.amazonaws.com"
    source_arn    = "${aws_api_gateway_rest_api.tra3_api.execution_arn}/*/*"
  }
  ```
- **Environment variable decoupling**: Use a dedicated `SQUARE_ENVIRONMENT` Terraform variable, decoupled from AWS `ENVIRONMENT` variable. Square uses `production` and `sandbox`; AWS uses `prod`, `staging`, `dev`.
- **DynamoDB schema finalization before Terraform**: Define full schema (GSI, TTL, billing mode) before first `terraform apply` — adding these post-deployment requires table replacement.
- **SSM Parameter Store paths**: Use consistent naming:
  ```
  /tra3/[CLIENT_ABBREV]/prod/stripe_secret_key
  /tra3/[CLIENT_ABBREV]/prod/stripe_webhook_secret
  /tra3/[CLIENT_ABBREV]/prod/textbelt_api_key
  /tra3/[CLIENT_ABBREV]/prod/calendar_webhook_secret
  ```

### Webhooks & payment processing

- **Webhook secrets must be machine-random**: Never use default or reused secrets. Generate with:
  ```bash
  openssl rand -hex 32
  ```
  Store in SSM Parameter Store before Lambda deployment.
- **Signed HMAC webhook testing**: Test webhooks by firing locally signed HMAC-SHA256 payloads directly at API Gateway endpoint, bypassing sandbox limitations:
  ```python
  import hmac, hashlib, json, requests
  from datetime import datetime
  
  webhook_secret = "your-secret-here"
  payload = {"type": "payment.updated", "status": "COMPLETED"}
  timestamp = str(int(datetime.now().timestamp()))
  
  msg = f"{timestamp}.{json.dumps(payload)}"
  signature = hmac.new(
    webhook_secret.encode(), msg.encode(), hashlib.sha256
  ).hexdigest()
  
  headers = {
    "X-Webhook-Signature": signature,
    "X-Webhook-Timestamp": timestamp
  }
  
  requests.post("https://your-api-gateway-url/webhook", json=payload, headers=headers)
  ```
- **Webhook payload validation**: Always validate timestamp freshness (within 5 minutes) and signature before processing payment.
- **DynamoDB writes on payment success**: Add booking record write after payment verification, before SMS dispatch. This ensures atomicity and audit trail.

### SMS & notification flow

- **Textbelt API key**: Store in SSM, retrieve at Lambda runtime via boto3 secrets manager call.
- **SMS templates**: Define in Lambda code (not SSM) for version control. Test with mock numbers first (Textbelt provides sandbox mode).
- **Multi-recipient SMS**: Use comma-separated phone list in SSM, loop and send to each with try/except per number (one failure shouldn't block others).

### Debugging & rollback

- **CloudWatch Logs → S3 export**: Set up log group subscription filter to archive older logs monthly for tax/legal compliance.
- **Rollback pattern**: Keep previous Lambda zip files in S3; update function code source via Terraform if rollback needed.
- **Claude Code auto-commits**: Prepend "Do not commit, do not push, do not create branches" to every agent prompt. VS Code Claude Code respects this more reliably than Copilot Chat.

## Architecture principles

- **Anti-over-engineering**: Keep every system as simple as its requirements allow. No extra queues, databases, or services.
- **Security and bloat hygiene**: Applied at every major build session. Review IAM policies, remove unused Lambda layers, trim dependency lists.
- **Single source of truth**: Payment processor (Stripe) or scheduling platform (Cal.com/Acuity) owns booking data; TRA3 persists to DynamoDB and sends confirmations.
- **Fail-open on SMS**: If SMS dispatch fails, log error but don't fail the entire booking flow. Customer still sees success page; manual SMS can be sent later.
- **No manual AWS Console work**: All infrastructure defined in Terraform. Console changes are not version-controlled and will be overwritten on next `terraform apply`.
