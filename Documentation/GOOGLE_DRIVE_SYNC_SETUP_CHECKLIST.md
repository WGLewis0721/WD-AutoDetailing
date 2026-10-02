# Google Drive to GitHub Sync - Setup Checklist

Use this checklist to quickly set up Google Drive to GitHub sync for any future project.

---

## Phase 1: Google Cloud Setup (15 minutes)

- [ ] **Create Google Cloud Project**
  - Go to [Google Cloud Console](https://console.cloud.google.com/)
  - Create new project (name: "{ProjectName} Asset Sync")

- [ ] **Enable Google Drive API**
  - Search "Google Drive API"
  - Click "Enable"

- [ ] **Create Service Account**
  - Go to "Service Accounts"
  - Click "Create Service Account"
  - Name: `github-asset-sync`
  - Grant role: **Editor**

- [ ] **Generate JSON Key**
  - Open the service account
  - Go to "Keys" tab
  - Click "Add Key" → "Create new key" → **JSON**
  - Download and save the JSON file securely

- [ ] **Note Service Account Email**
  - In the JSON file, find: `"client_email": "...@iam.gserviceaccount.com"`
  - Copy this email address

- [ ] **Share Google Drive Folder with Service Account**
  - Open your Google Drive folder
  - Click "Share"
  - Paste the service account email
  - Set permission to **Editor**
  - Click Share

---

## Phase 2: GitHub Setup (10 minutes)

- [ ] **Add GitHub Secrets**
  - Repo → Settings → Secrets and variables → Actions
  - Click "New repository secret"

- [ ] **Add Secret 1: DRIVE_FOLDER_ID**
  - Name: `DRIVE_FOLDER_ID`
  - Value: Your Google Drive folder ID (from folder URL)
  - Click "Add secret"

- [ ] **Add Secret 2: GCP_SA_KEY**
  - Name: `GCP_SA_KEY`
  - Value: **Entire contents** of the JSON key file
  - Make sure it starts with `{` and ends with `}`
  - Click "Add secret"

- [ ] **Verify Secrets Are Set**
  - You should see both secrets in the list
  - They show `●●●●●●●●` (hidden for security)

---

## Phase 3: Repository Setup (5 minutes)

- [ ] **Create Folder Structure**
  - Create `/Assets/` folder in repo root
  - Create subfolders:
    - `Assets/Images/`
    - `Assets/Icons/`
    - `Assets/Photos/`
    - `Assets/Videos/`
    - `Assets/Logos/`
    - `Assets/UI-Components/`

- [ ] **Create Matching Google Drive Folders**
  - In your Google Drive folder, create:
    - `Assets/` (main folder)
    - `Assets/Images/` (subfolder)
    - `Assets/Icons/` (subfolder)
    - etc.

- [ ] **Add `.gitkeep` files** (so empty folders are tracked)
  ```bash
  touch Assets/.gitkeep
  touch Assets/Images/.gitkeep
  touch Assets/Icons/.gitkeep
  # ... for each subfolder
  ```

- [ ] **Commit and push**
  ```bash
  git add Assets/
  git commit -m "Add Assets folder structure"
  git push origin main
  ```

---

## Phase 4: GitHub Actions Workflow (5 minutes)

- [ ] **Create workflow file**
  - Path: `.github/workflows/sync-google-drive-assets.yml`
  - Copy from: `/Documentation/GOOGLE_DRIVE_ASSET_SYNC_SETUP.md` reference workflow

- [ ] **Ensure workflow includes:**
  ```yaml
  permissions:
    contents: write
  ```

- [ ] **Check cron schedule**
  - `* * * * *` for every minute (testing)
  - `0 * * * *` for every hour (production)

- [ ] **Commit workflow**
  ```bash
  git add .github/workflows/sync-google-drive-assets.yml
  git commit -m "Add Google Drive sync workflow"
  git push origin main
  ```

---

## Phase 5: Testing (10 minutes)

- [ ] **Add test file to Google Drive**
  - Go to Google Drive → Your Folder → Assets → Images/
  - Upload a test image file

- [ ] **Trigger workflow manually**
  - GitHub → Actions tab
  - Click "Sync Google Drive Assets" workflow
  - Click "Run workflow" button
  - Select "main" branch
  - Click "Run workflow"

- [ ] **Monitor workflow logs**
  - Watch the run in real-time
  - Look for:
    - ✓ Service Account authenticated
    - ✓ Assets folder found
    - ✓ Files downloaded (with file names)
    - ✓ Git commit created
    - ✓ Push successful

- [ ] **Verify files in repo**
  - Go to Code tab
  - Check `/Assets/Images/` folder
  - Test file should appear

---

## Phase 6: Production Setup (5 minutes)

- [ ] **Test automatic sync**
  - Add another file to Google Drive
  - Wait for scheduled workflow to run (check Actions tab)
  - Verify file appears in repo

- [ ] **Configure production schedule**
  - Edit workflow file
  - Change cron to desired schedule:
    - `*/5 * * * *` = every 5 minutes
    - `0 * * * *` = every hour
    - `0 6 * * *` = daily at 6 AM

- [ ] **Commit production settings**
  ```bash
  git add .github/workflows/sync-google-drive-assets.yml
  git commit -m "Set production sync schedule"
  git push origin main
  ```

---

## Troubleshooting Checklist

If workflow fails:

- [ ] **Check GitHub Secrets**
  - Verify `DRIVE_FOLDER_ID` is set
  - Verify `GCP_SA_KEY` is set
  - Make sure JSON is complete (not truncated)

- [ ] **Check Service Account Access**
  - Verify folder is shared with service account email
  - Check permission is set to "Editor" (not Viewer)

- [ ] **Check Folder Structure**
  - Verify `Assets/` folder exists in Google Drive
  - Verify subfolders exist (Images/, Icons/, etc.)

- [ ] **Check GitHub Permissions**
  - Verify `permissions: contents: write` in workflow

- [ ] **Review Workflow Logs**
  - Look for specific error messages
  - Search for "❌" in logs

- [ ] **Common errors:**
  - `403 Permission denied` → Add `permissions: contents: write`
  - `File not found` → Check `DRIVE_FOLDER_ID` secret
  - `JSONDecodeError` → Re-paste full JSON key without extra quotes

---

## Quick Reference

| Component | Location | Example |
|-----------|----------|---------|
| Workflow | `.github/workflows/sync-google-drive-assets.yml` | GitHub Actions |
| Secrets | Settings → Secrets and variables → Actions | DRIVE_FOLDER_ID, GCP_SA_KEY |
| Assets | `/Assets/Images/`, `/Assets/Icons/`, etc. | Repo root |
| Google Drive | Gray Matter LLC → Assets → subfolders | Google Drive |

---

## Time Estimate

| Phase | Time |
|-------|------|
| Phase 1: Google Cloud | 15 min |
| Phase 2: GitHub | 10 min |
| Phase 3: Repository | 5 min |
| Phase 4: Workflow | 5 min |
| Phase 5: Testing | 10 min |
| Phase 6: Production | 5 min |
| **Total** | **50 min** |

---

## Support

For detailed troubleshooting, see: `Documentation/GOOGLE_DRIVE_SYNC_LESSONS_LEARNED.md`

For full setup guide, see: `Documentation/GOOGLE_DRIVE_ASSET_SYNC_SETUP.md`

For quick start, see: `Documentation/ASSET_WORKFLOW_QUICK_START.md`
