---
name: ways-of-working
description: Workflow, prompt/output preferences, and the tool stack for TRA3 [CLIENT_NAME] deployment
sources: [template]
aliases: []
---

## Workflow

- **Design and verify in Claude** → architecture, planning, approval
- **Execute in VS Code Copilot / Claude Code** → file editing, terminal commands, Lambda builds
- **Verify diffs before committing** → William reviews all changes before git push
- **Debugging approach**: diagnose root cause first, then write fix prompts; parallel architectural analysis (Claude + ChatGPT) on complex corruption issues
- **Multi-tool environment**: Claude (architecture/planning) + VS Code Claude Code (file editing/terminal) + GitHub Copilot (VS Code + browser) operating simultaneously

## Output and prompt preferences

- **Complete, non-truncated outputs**: exact file content (not diffs), explicit constraints, verification steps
- **Deliver complete PowerShell command blocks and Copilot prompts** with checklist-style acceptance criteria
- **Single consolidated commands** (one-liners) over multi-step breakdowns where possible
- **Standard Copilot prompt header**: work on branch `[CLIENT_ABBREV]-v2`, review `docs/system-context.md` and skill docs first, generate post-task summary, **wait for explicit commit/push instruction before running any git commands**
- **No commits or pushes** until William reviews and approves

## Tools & resources

- **Frontend**: GitHub Pages, static HTML/CSS/JS
- **Payments**: [PAYMENT_PROCESSOR] (Stripe preferred)
- **Scheduling**: [SCHEDULING_PLATFORM] (Cal.com or Acuity)
- **SMS**: Textbelt
- **Backend**: AWS Lambda Python 3.11, API Gateway, DynamoDB, S3, SSM Parameter Store, CloudWatch
- **IaC**: Terraform
- **Version control**: GitHub (`WGLewis0721/[REPO_NAME]`), SSH alias `github.com-WGLewis0721`, remote named `[CLIENT_ABBREV]`
- **Dev environment**: VS Code + WSL (Ubuntu on Windows), repos typically under OneDrive (note: file-lock risk)
- **AI coding tools**: Claude (architecture), VS Code Claude Code, claude.ai/code, GitHub Copilot

## Prompt structure for Copilot

```
Do not commit, do not push, do not create branches.

Work on branch [CLIENT_ABBREV]-v2. Review docs/system-context.md and skill docs first.

[TASK DESCRIPTION]

Acceptance criteria:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

Generate a post-task summary with file changes and test results.
Wait for explicit instruction before committing.
```

## Key build constraints

- Lambda must target Python 3.11 (matching production runtime)
- manylinux2014 pip flags required for Windows Lambda builds
- Terraform manages all AWS resources (nothing manual in Console)
- Webhook secrets stored in SSM Parameter Store (never hardcoded)
- All environment variables separated by ENVIRONMENT (prod/staging/dev)
- CloudWatch Logs → S3 export for audit trail retention

## Verification gates

Before any merge to main:
1. Lambda code tested locally (SAM local or mock events)
2. Terraform validated (`terraform plan` outputs reviewed)
3. Webhook payloads signed and verified (HMAC-SHA256)
4. SMS delivery tested (Textbelt sandbox or production)
5. DynamoDB queries tested (boto3 client against live table)
6. API Gateway endpoint tested (curl with auth headers)
7. End-to-end booking flow tested (payment → SMS → confirmation)
