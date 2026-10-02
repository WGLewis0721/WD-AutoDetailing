# Build Lessons (Mirror Finish Mobile Detailing)

## Drive to GitHub sync
- Push by `GITHUB_TOKEN` needs `permissions: contents: write` (else 403).
- Detect new files with `git ls-files --others --exclude-standard`; `git diff --quiet` misses them.
- Drive calls need `supportsAllDrives=True`; the folder must be shared with the service account.
- Cron `* * * * *` never ran; GitHub's minimum is 5 minutes (`*/5 * * * *`), and runs can be delayed.
- Only top-level files in each asset folder sync, not subfolders. Pushes by the sync bot do not trigger other workflows.
- Sync only image/video/PDF files so notes and JSON in Drive do not land in the repo; large screenshots bloat the repo.

## Content
- Client material conflicted (older menu $100+/$150+ vs current flier $60/$40/$40). Always confirm which source is current and use the newest.
- The Square page showed template placeholders (address, phone, hours); fix those in Square because customers land there.
- Business name varied (Mobile Detailing vs Mobile Car & Truck Detailing vs Detailing and Restoration). Pick one and confirm.

## Build
- The logo file is square (1020x1020); sizing it as a wide banner distorts it.
- Lazy-loaded images look blank in full-page screenshots unless you scroll first.
- Sandbox Chromium cannot verify external TLS; test on localhost and check the live site with `curl`.
- The generic TRA3/AWS booking template is not used for Cloudflare + Square builds.
