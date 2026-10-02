# Asset Workflow Quick Start

## For You: Daily Workflow

1. **Generate/capture assets** (Gemini, Facebook Muse, photos, etc.)
2. **Upload to Google Drive** → Gray Matter LLC → Assets → [Images/Icons/Photos/Videos/Logos/UI-Components]
3. **Done!** GitHub syncs automatically every hour

That's it. No manual repo uploads needed.

---

## For Others: Show Them How

### 5-Minute Setup

1. **Read the full guide:**
   - `/Documentation/GOOGLE_DRIVE_ASSET_SYNC_SETUP.md`

2. **They do once:**
   - Create Google Drive folder structure (Part 1)
   - Set up GitHub secrets (Part 2)
   - Share the workflow file

3. **Then they use:**
   - Upload files to Google Drive
   - Workflow syncs automatically

---

## What Gets Synced

**From Google Drive:**
```
Gray Matter LLC/
└── Assets/
    ├── Images/      → Syncs to repo Assets/Images/
    ├── Icons/       → Syncs to repo Assets/Icons/
    ├── Photos/      → Syncs to repo Assets/Photos/
    ├── Videos/      → Syncs to repo Assets/Videos/
    ├── Logos/       → Syncs to repo Assets/Logos/
    └── UI-Components/ → Syncs to repo Assets/UI-Components/
```

**To GitHub:** Same structure in `Assets/` folder

---

## File Types Supported

- **Images:** JPG, PNG, WEBP, SVG, GIF
- **Icons:** SVG, PNG, ICO, ICNS
- **Photos:** JPG, PNG, RAW, HEIC
- **Videos:** MP4, WebM, MOV, MKV
- **Logos:** PNG, SVG, EPS, PDF
- **UI-Components:** PNG, SVG, Figma exports

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Nothing syncing | Check GitHub Actions logs (Repo → Actions tab) |
| Permissions error | Re-share Google Drive folder with service account email |
| Files in wrong folder | Ensure they're in correct subfolder (Images/, Icons/, etc.) |
| Sync runs but no commit | Files might already exist - check repo manually |

---

## How It Works (Technical)

- **Trigger:** Every hour (or manually via GitHub Actions)
- **Authentication:** Google Service Account (stored as GitHub Secret)
- **Process:** Download files from Drive → Organize by type → Commit → Push
- **Result:** Your repo Assets/ stays in sync with Google Drive

---

## Next Steps

1. ✅ Follow full setup in `GOOGLE_DRIVE_ASSET_SYNC_SETUP.md`
2. ✅ Test: Add a file to Google Drive Assets/Images/
3. ✅ Wait up to 1 hour (or trigger manually)
4. ✅ Verify it appears in your repo Assets/Images/
