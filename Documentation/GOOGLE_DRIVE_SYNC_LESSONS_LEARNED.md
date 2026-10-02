# Google Drive to GitHub Sync - Lessons Learned

## Executive Summary
Successfully implemented automatic syncing of assets from Google Drive to GitHub using GitHub Actions. This document captures what worked, what didn't, and best practices for future implementations.

---

## What Worked ✅

### 1. **Service Account Authentication**
- ✅ Google Cloud Service Account with Drive API access
- ✅ JSON key credentials stored as GitHub Secrets
- ✅ `supportsAllDrives=True` and `includeItemsFromAllDrives=True` parameters critical for folder access

### 2. **GitHub Actions Workflow Structure**
- ✅ Inline Python script (embedded in workflow) simpler than external files
- ✅ Scheduled cron job (`* * * * *` for every minute) runs reliably
- ✅ Manual workflow_dispatch trigger for testing

### 3. **File Detection & Commit**
- ✅ Detecting untracked files requires: `git ls-files --others --exclude-standard`
- ✅ `git diff --quiet` alone doesn't catch new files
- ✅ Always stage with `git add Assets/` before commit

### 4. **GitHub Permissions**
- ✅ `permissions: contents: write` required in workflow
- ✅ Allows `github-actions[bot]` to push commits
- ✅ Without this, push fails with 403 error

---

## What Didn't Work ❌

### 1. **Initial Python Script Issues**
- ❌ Custom Python script without `supportsAllDrives=True` couldn't access shared folders
- ❌ Missing error output capture in workflow logs
- ❌ `python sync_drive.py` vs `sync_drive_v2.py` naming mismatch

### 2. **Git Change Detection**
- ❌ `if git diff --quiet` only detects modified files, not new files
- ❌ Downloaded files were "Untracked" and not committed
- ❌ Solution: Check for untracked files with `git ls-files --others --exclude-standard`

### 3. **GitHub Actions Permissions**
- ❌ Forgot to add `permissions: contents: write`
- ❌ Resulted in 403 "Permission denied" errors
- ❌ Workflow would download files but fail at push

### 4. **Multiple Secret Names**
- ❌ Initially had `GOOGLE_API_KEY` and `GCP_SA_KEY` (duplicate secrets)
- ❌ Had `GOOGLE_DRIVE_FOLDER_ID` and `DRIVE_FOLDER_ID` (duplicate secrets)
- ❌ Solution: Support all variants with fallback logic: `or os.environ.get()`

---

## Best Practices for Future Projects

### 1. **Google Cloud Setup**
```
✅ Create service account with Drive API enabled
✅ Generate JSON key (store securely)
✅ Share target folders with service account email
✅ Test access before deploying workflow
```

### 2. **GitHub Secrets Configuration**
```
Secret Name          | Value
--------------------|---------------------------
DRIVE_FOLDER_ID      | Google Drive folder ID
GCP_SA_KEY           | Full JSON key content
GOOGLE_DRIVE_FOLDER_ID | (Backup for compatibility)
GOOGLE_API_KEY       | (Backup for compatibility)
```

### 3. **Workflow Best Practices**
```yaml
# ALWAYS include these
name: Sync Google Drive Assets
permissions:
  contents: write

# Test with workflow_dispatch first
on:
  workflow_dispatch:  # Manual trigger for testing
  schedule:
    - cron: '* * * * *'  # Production schedule
```

### 4. **Git Operations**
```bash
# ✅ Check for BOTH modified AND new files
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    echo "No changes"
else
    git add Assets/
    git commit -m "Sync assets from Google Drive [automated]"
    git push origin main
fi
```

### 5. **Debugging Strategy**
```
Priority 1: Check GitHub Secrets (echo $SECRET_NAME)
Priority 2: Verify service account can access folders
Priority 3: Check API parameters (supportsAllDrives)
Priority 4: Review git diff output
Priority 5: Monitor workflow logs in real-time
```

---

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `json.JSONDecodeError` | Invalid secret | Paste full JSON key, no extra quotes |
| `404 File not found` | Missing folder ID | Verify `DRIVE_FOLDER_ID` secret is set |
| `403 Permission denied` | Missing git permissions | Add `permissions: contents: write` |
| `No changes to commit` | Untracked files not detected | Use `git ls-files --others` check |
| `Asset folder not found` | Service account lacks access | Share folder with service account email |

---

## Workflow Efficiency

### Cron Schedule Options
- `* * * * *` - Every minute (good for testing, heavy on API quota)
- `*/5 * * * *` - Every 5 minutes (balanced)
- `0 * * * *` - Every hour (light usage)
- `0 6 * * *` - Daily at 6 AM (minimal quota)

### API Quota Considerations
- Each workflow run = 1 quota unit per folder traversal
- Download operations = 1 quota unit per file
- Estimate: 100 files/day = 100+ quota units/day
- Google Drive API has generous free tier (1M+ quota/day)

---

## Reusable Template for Future Projects

```yaml
name: Sync Google Drive Assets

on:
  workflow_dispatch:
  schedule:
    - cron: '* * * * *'

permissions:
  contents: write

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - run: pip install google-auth-oauthlib google-api-python-client
      
      - run: python << 'SCRIPT'
          # Python sync logic here
          # (See sync-google-drive-assets.yml for reference)
        SCRIPT
        env:
          GCP_SA_KEY: ${{ secrets.GCP_SA_KEY }}
          DRIVE_FOLDER_ID: ${{ secrets.DRIVE_FOLDER_ID }}
      
      - run: |
          git config --local user.email "action@github.com"
          git config --local user.name "Asset Sync Bot"
          
          if [ -z "$(git ls-files --others --exclude-standard)" ]; then
              echo "No new files"
          else
              git add Assets/
              git commit -m "Sync assets [automated]"
              git push origin main
          fi
```

---

## Key Takeaways

1. **Service Account Access** - Most critical issue; ensure folder is shared with the service account email
2. **Git Change Detection** - Untracked files require special handling
3. **GitHub Permissions** - Workflow needs explicit write access
4. **API Parameters** - `supportsAllDrives=True` is essential for shared folders
5. **Fallback Logic** - Support multiple secret name variants for flexibility
6. **Real-Time Logging** - Use `echo` statements extensively for debugging

---

## Resources Used

- [Google Drive API Python Client](https://developers.google.com/drive/api/v3/quickstart/python)
- [GitHub Actions Permissions](https://docs.github.com/en/actions/security-guides/automatic-token-authentication)
- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)

---

## Next Steps for Enhancement

- [ ] Add file change detection (only sync modified files)
- [ ] Implement file compression before sync
- [ ] Add email notifications on sync failures
- [ ] Create sync dashboard showing latest syncs
- [ ] Add selective folder syncing (sync only specific types)
- [ ] Implement rollback on failed commits
