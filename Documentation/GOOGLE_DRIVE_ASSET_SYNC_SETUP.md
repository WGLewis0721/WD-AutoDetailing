# Google Drive to GitHub Asset Sync Setup

This guide sets up automatic hourly syncing of assets from Google Drive to GitHub.

## Overview

```
Gray Matter LLC (Google Drive) → GitHub Actions (hourly) → WD-AutoDetailing Repo
```

Assets are organized by type in both Google Drive and the repo.

---

## Part 1: Google Drive Folder Structure

Create these folders in your **Gray Matter LLC** Google Drive folder:

```
Gray Matter LLC/
├── Assets/
│   ├── Images/
│   ├── Icons/
│   ├── Photos/
│   ├── Videos/
│   ├── Logos/
│   └── UI-Components/
└── [other folders...]
```

**Folder purposes:**
- **Images/** - Hero images, banners, backgrounds
- **Icons/** - Icon sets, SVGs, small graphics
- **Photos/** - Product photos, lifestyle shots
- **Videos/** - Video assets, clips
- **Logos/** - Brand logos, variations
- **UI-Components/** - Buttons, cards, components

---

## Part 2: GitHub Setup

### Step 1: Create GitHub Secrets

1. Go to your repo: **Settings → Secrets and variables → Actions**
2. Add these secrets:

| Secret Name | Value |
|---|---|
| `GOOGLE_DRIVE_FOLDER_ID` | `13juFb8UZGyI9Nd4qauhYV79jhvCpw1gt` |
| `GOOGLE_API_KEY` | *[See Step 2]* |

### Step 2: Get Google API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (name: "WD-AutoDetailing Asset Sync")
3. Enable **Google Drive API**:
   - Search "Google Drive API"
   - Click "Enable"
4. Create credentials (**Service Account**):
   - **Create Service Account**
   - Name: "github-asset-sync"
   - Grant role: **Editor**
5. Create JSON key:
   - Click the service account
   - **Keys** tab → **Add Key** → **JSON**
   - Copy the entire JSON content
6. Add to GitHub Secrets as `GOOGLE_API_KEY`

### Step 3: Share Google Drive Folder with Service Account

1. In the JSON key, find the `client_email`
2. Share the Gray Matter LLC folder with that email
3. Grant **Editor** access

---

## Part 3: Repo Structure Setup

Your GitHub repo will look like this:

```
WD-AutoDetailing/
├── Assets/
│   ├── Images/
│   ├── Icons/
│   ├── Photos/
│   ├── Videos/
│   ├── Logos/
│   └── UI-Components/
├── Documentation/
└── .github/
    └── workflows/
        └── sync-google-drive-assets.yml
```

The `.github/workflows/sync-google-drive-assets.yml` workflow runs every hour and:
1. Checks Google Drive for new/updated files
2. Downloads them to the `Assets/` folder (organized by type)
3. Commits and pushes changes to GitHub

The sync logic lives in [`scripts/sync_drive.py`](../scripts/sync_drive.py). It recurses
into subfolders, prints debug logs of every folder it searches for/finds (set
`SYNC_DEBUG=1`, already enabled in the workflow, for the most detail), and keeps
empty Drive folders tracked in git via a `.gitkeep` placeholder.

---

## Part 4: Verify Setup

1. The workflow runs automatically **every hour**
2. Check **Actions** tab in your repo to see sync status
3. New assets appear in `Assets/` folder within 5-15 minutes

---

## Troubleshooting

**Workflow fails to authenticate:**
- Verify `GOOGLE_API_KEY` secret is the full JSON content
- Check service account has Editor access to folder

**Files not syncing:**
- Verify folder ID matches `GOOGLE_DRIVE_FOLDER_ID`
- Ensure files are in `Assets/` subfolder in Google Drive
- Check workflow logs in Actions tab - the script logs every folder it searches
  for and what it actually finds (prefixed with `[debug]`), which makes it easy
  to spot typos or missing folders

**Wrong file organization:**
- Verify folder names in Google Drive match expected types
- Workflow auto-sorts by parent folder name

---

## How to Share This Process

To show someone else how to set this up:

1. Share this document
2. Share the GitHub workflow file (`.github/workflows/sync-google-drive-assets.yml`)
3. Have them follow **Part 1** (Google Drive folders)
4. Have them follow **Part 2** (GitHub secrets)
5. Everything else is automatic!

---

## File Organization Reference

| Google Drive Folder | Syncs To | File Types |
|---|---|---|
| `Assets/Images/` | `Assets/Images/` | JPG, PNG, WEBP, SVG |
| `Assets/Icons/` | `Assets/Icons/` | SVG, PNG, ICO |
| `Assets/Photos/` | `Assets/Photos/` | JPG, PNG, RAW |
| `Assets/Videos/` | `Assets/Videos/` | MP4, WebM, MOV |
| `Assets/Logos/` | `Assets/Logos/` | PNG, SVG, EPS |
| `Assets/UI-Components/` | `Assets/UI-Components/` | PNG, SVG, Figma exports |

---

## Next Steps

1. ✅ Create Google Drive folders (Part 1)
2. ✅ Set up GitHub secrets (Part 2)
3. ✅ Merge workflow file to repo
4. ✅ Test by adding a file to Google Drive
5. ✅ Verify it appears in repo within 1 hour
