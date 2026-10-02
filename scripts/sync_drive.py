"""Sync asset files from a Google Drive folder structure into the local Assets/ folder.

Expected Google Drive structure (under GOOGLE_DRIVE_FOLDER_ID):

    Assets/
    ├── Images/
    ├── Icons/
    ├── Photos/
    ├── Videos/
    ├── Logos/
    └── UI-Components/

Environment variables:
    GOOGLE_API_KEY        - JSON content of a Google service account key.
    GOOGLE_DRIVE_FOLDER_ID - ID of the root ("Gray Matter LLC") Drive folder.
    SYNC_DEBUG             - Optional. Set to "1"/"true" to enable verbose debug
                              logging of every Drive API query and result. Debug
                              logging is also always enabled for folder discovery
                              so sync issues are easy to diagnose from workflow logs.
"""

import io
import json
import os
import sys

from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

FOLDER_MIME_TYPE = "application/vnd.google-apps.folder"

# Asset subfolders to sync
ASSET_TYPES = ["Images", "Icons", "Photos", "Videos", "Logos", "UI-Components"]

DEBUG = os.environ.get("SYNC_DEBUG", "").lower() in ("1", "true", "yes")

files_synced = 0


def debug(message):
    """Print a debug message. Always shown so folder discovery issues are visible
    in workflow logs, with extra verbosity when SYNC_DEBUG is enabled."""
    print(f"[debug] {message}")


def list_child_folders(drive_service, parent_id):
    """Return every subfolder (id, name) directly under parent_id."""
    query = f"'{parent_id}' in parents and trashed=false and mimeType='{FOLDER_MIME_TYPE}'"
    if DEBUG:
        debug(f"Listing child folders with query: {query}")

    results = drive_service.files().list(
        q=query, spaces="drive", fields="files(id, name)"
    ).execute()
    return results.get("files", [])


def get_folder_id_by_name(drive_service, parent_id, folder_name):
    """Get folder ID by name within parent folder, logging what was found."""
    query = (
        f"'{parent_id}' in parents and name='{folder_name}' "
        f"and trashed=false and mimeType='{FOLDER_MIME_TYPE}'"
    )
    if DEBUG:
        debug(f"Searching for folder '{folder_name}' with query: {query}")

    results = drive_service.files().list(
        q=query, spaces="drive", fields="files(id, name)"
    ).execute()
    items = results.get("files", [])

    if items:
        debug(f"Found folder '{folder_name}' -> id={items[0]['id']}")
        if len(items) > 1:
            debug(
                f"Warning: {len(items)} folders named '{folder_name}' found under "
                f"parent {parent_id}; using the first match."
            )
        return items[0]["id"]

    # Not found: log the folders that *do* exist so the user can diagnose typos
    # or missing folders without digging through Drive manually.
    siblings = list_child_folders(drive_service, parent_id)
    if siblings:
        sibling_names = ", ".join(sorted(item["name"] for item in siblings))
        debug(
            f"Folder '{folder_name}' not found under parent {parent_id}. "
            f"Folders found there instead: {sibling_names}"
        )
    else:
        debug(
            f"Folder '{folder_name}' not found under parent {parent_id}. "
            f"No subfolders were found there at all."
        )
    return None


def ensure_local_folder(local_path):
    """Create the local folder if needed, and make sure empty folders are kept
    in git via a .gitkeep placeholder (git does not track empty directories)."""
    os.makedirs(local_path, exist_ok=True)


def mark_folder_contents(local_path, has_content):
    """Add/remove the .gitkeep placeholder depending on whether the folder has
    any synced files or subfolders, so empty Drive folders are still tracked."""
    gitkeep_path = os.path.join(local_path, ".gitkeep")
    if has_content:
        if os.path.exists(gitkeep_path):
            os.remove(gitkeep_path)
    else:
        if not os.listdir(local_path):
            open(gitkeep_path, "a").close()


def sync_folder(drive_service, parent_id, local_path, folder_label):
    """Recursively sync files (and subfolders) from a Google Drive folder into
    local_path, handling folders that are empty (no files and/or no subfolders)
    without raising errors."""
    global files_synced

    ensure_local_folder(local_path)

    # Get all files (non-folders) in this folder.
    query = f"'{parent_id}' in parents and trashed=false and mimeType!='{FOLDER_MIME_TYPE}'"
    if DEBUG:
        debug(f"Listing files in '{folder_label}' with query: {query}")

    items = []
    page_token = None
    while True:
        results = drive_service.files().list(
            q=query,
            spaces="drive",
            fields="nextPageToken, files(id, name, modifiedTime)",
            pageSize=100,
            pageToken=page_token,
        ).execute()
        items.extend(results.get("files", []))
        page_token = results.get("nextPageToken")
        if not page_token:
            break

    debug(f"Found {len(items)} file(s) in '{folder_label}'")

    if not items:
        print(f"  No files found in {folder_label}")
    else:
        for item in items:
            try:
                file_path = os.path.join(local_path, item["name"])

                # Download file
                request = drive_service.files().get_media(fileId=item["id"])
                file_handler = io.BytesIO()
                downloader = MediaIoBaseDownload(file_handler, request)

                done = False
                while not done:
                    status, done = downloader.next_chunk()

                # Write to disk
                with open(file_path, "wb") as f:
                    f.write(file_handler.getvalue())

                files_synced += 1
                print(f"  \u2713 Synced: {item['name']}")

            except Exception as e:
                print(f"  \u2717 Error syncing {item['name']}: {str(e)}")

    # Recurse into any subfolders so nested (and potentially empty) folders are
    # also mirrored locally instead of being silently skipped.
    subfolders = list_child_folders(drive_service, parent_id)
    debug(f"Found {len(subfolders)} subfolder(s) in '{folder_label}'")

    for subfolder in subfolders:
        sub_local_path = os.path.join(local_path, subfolder["name"])
        sub_label = f"{folder_label}/{subfolder['name']}"
        sync_folder(drive_service, subfolder["id"], sub_local_path, sub_label)

    # If this folder ended up with nothing synced (no files, no subfolders),
    # keep it tracked in git with a placeholder instead of leaving it empty
    # and invisible to version control.
    mark_folder_contents(local_path, has_content=bool(items or subfolders))


def main():
    creds_json = os.environ.get("GOOGLE_API_KEY")
    if not creds_json:
        print("ERROR: GOOGLE_API_KEY environment variable is not set")
        sys.exit(1)

    folder_id = os.environ.get("GOOGLE_DRIVE_FOLDER_ID")
    if not folder_id:
        print("ERROR: GOOGLE_DRIVE_FOLDER_ID environment variable is not set")
        sys.exit(1)

    creds_dict = json.loads(creds_json)
    credentials = Credentials.from_service_account_info(
        creds_dict, scopes=["https://www.googleapis.com/auth/drive"]
    )
    drive_service = build("drive", "v3", credentials=credentials)

    # Ensure Assets folder exists locally
    ensure_local_folder("Assets")

    # Get Assets folder ID from the root Drive folder
    assets_folder_id = get_folder_id_by_name(drive_service, folder_id, "Assets")

    if not assets_folder_id:
        print("ERROR: Assets folder not found in Google Drive root folder")
        sys.exit(1)

    print(f"Found Assets folder: {assets_folder_id}\n")

    # Sync each known asset type folder
    for asset_type in ASSET_TYPES:
        type_folder_id = get_folder_id_by_name(drive_service, assets_folder_id, asset_type)

        if type_folder_id:
            print(f"Syncing {asset_type}...")
            local_path = f"Assets/{asset_type}"
            sync_folder(drive_service, type_folder_id, local_path, asset_type)
        else:
            print(f"Skipping {asset_type} - folder not found")

    print(f"\n\u2713 Sync complete! {files_synced} files synced.")


if __name__ == "__main__":
    main()
