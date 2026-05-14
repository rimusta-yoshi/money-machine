"""
extract_form_data.py
--------------------
Reads the latest unprocessed row from a Google Sheet (populated by Google
Forms) and returns a clean Python dict of client data.

Requirements:
    pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client

Auth setup:
    1. Go to console.cloud.google.com → create a project
    2. Enable the Google Sheets API
    3. Create a Service Account → download the JSON key
    4. Share your Google Sheet with the service account email (viewer is enough)
    5. Set env var: GOOGLE_SERVICE_ACCOUNT_KEY=/path/to/key.json
"""

import os
import json
import logging
from datetime import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ── Configuration ────────────────────────────────────────────────────────────

SPREADSHEET_ID = os.getenv("SPREADSHEET_ID", "YOUR_SHEET_ID_HERE")
SHEET_NAME      = os.getenv("SHEET_NAME", "Form Responses 1")
KEY_FILE        = os.getenv("GOOGLE_SERVICE_ACCOUNT_KEY", "service_account.json")

# Column mapping: sheet column index (0-based) → internal field name
# Update these to match your actual Google Form question order.
# Column 0 is always the timestamp Google Forms adds automatically.
COLUMN_MAP = {
    0:  "submitted_at",
    1:  "business_name",
    2:  "tagline",
    3:  "owner_name",
    4:  "email",
    5:  "phone",
    6:  "address_line1",
    7:  "address_city",
    8:  "address_postcode",
    9:  "services",          # comma-separated list from the form
    10: "opening_hours",     # e.g. "Mon–Fri 9am–5pm"
    11: "about_text",
    12: "logo_drive_url",    # Google Drive file URL from file-upload question
    13: "hero_image_drive_url",
    14: "primary_colour",    # e.g. "#2a7ae2"
    15: "facebook_url",
    16: "instagram_url",
    17: "site_type",         # e.g. "plumber", "barber", "restaurant"
}

# Column used to track whether a row has been processed.
# Add a column called "Processed" to your sheet and note its index here.
PROCESSED_COL_INDEX = 18
PROCESSED_COL_LETTER = "S"   # A=0, B=1 ... S=18

# ── Sheets client ─────────────────────────────────────────────────────────────

def get_sheets_client():
    creds = service_account.Credentials.from_service_account_file(
        KEY_FILE,
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    return build("sheets", "v4", credentials=creds).spreadsheets()


# ── Core extraction ───────────────────────────────────────────────────────────

def fetch_all_rows(client) -> list[list]:
    """Pull every row from the sheet including the header."""
    result = client.values().get(
        spreadsheetId=SPREADSHEET_ID,
        range=f"{SHEET_NAME}",
    ).execute()
    return result.get("values", [])


def find_unprocessed_rows(rows: list[list]) -> list[tuple[int, list]]:
    """
    Return (sheet_row_number, row_data) for every row that has not yet been
    processed.  sheet_row_number is 1-based (matches the Sheets UI).
    Row 1 is the header, so data starts at row 2 / index 1.
    """
    unprocessed = []
    for i, row in enumerate(rows[1:], start=2):   # skip header
        # Pad the row in case trailing empty cells were not returned
        padded = row + [""] * (PROCESSED_COL_INDEX + 1 - len(row))
        already_done = padded[PROCESSED_COL_INDEX].strip().lower() in ("yes", "done", "true", "1")
        if not already_done:
            unprocessed.append((i, padded))
    return unprocessed


def row_to_dict(row: list) -> dict:
    """Convert a raw row list into a labelled dict using COLUMN_MAP."""
    data = {}
    for idx, field in COLUMN_MAP.items():
        value = row[idx].strip() if idx < len(row) else ""
        data[field] = value

    # Split services string into a proper list
    if data.get("services"):
        data["services_list"] = [s.strip() for s in data["services"].split(",") if s.strip()]
    else:
        data["services_list"] = []

    # Normalise logo/image URLs to direct-download format
    for url_field in ("logo_drive_url", "hero_image_drive_url"):
        data[url_field] = normalise_drive_url(data.get(url_field, ""))

    # Timestamp → ISO format
    try:
        dt = datetime.strptime(data["submitted_at"], "%m/%d/%Y %H:%M:%S")
        data["submitted_at_iso"] = dt.isoformat()
    except ValueError:
        data["submitted_at_iso"] = data["submitted_at"]

    return data


def normalise_drive_url(url: str) -> str:
    """
    Convert a Google Drive sharing URL to a direct-download URL so the
    build script can wget/requests.get it without needing auth.
    Sharing URL format:  https://drive.google.com/open?id=FILE_ID
    Direct format:       https://drive.google.com/uc?export=download&id=FILE_ID
    """
    if not url:
        return ""
    if "id=" in url:
        file_id = url.split("id=")[-1].split("&")[0]
        return f"https://drive.google.com/uc?export=download&id={file_id}"
    # Already a direct URL or unrecognised format — return as-is
    return url


def mark_row_processed(client, sheet_row: int):
    """Write 'done' into the Processed column for the given row."""
    cell = f"{SHEET_NAME}!{PROCESSED_COL_LETTER}{sheet_row}"
    client.values().update(
        spreadsheetId=SPREADSHEET_ID,
        range=cell,
        valueInputOption="RAW",
        body={"values": [["done"]]},
    ).execute()
    logger.info(f"Marked row {sheet_row} as processed.")


# ── Public API ────────────────────────────────────────────────────────────────

def get_next_submission() -> dict | None:
    """
    Return the next unprocessed form submission as a dict, and mark it
    processed in the sheet.  Returns None if nothing is waiting.
    """
    client = get_sheets_client()
    rows   = fetch_all_rows(client)
    queue  = find_unprocessed_rows(rows)

    if not queue:
        logger.info("No unprocessed submissions found.")
        return None

    sheet_row, row_data = queue[0]
    client_data = row_to_dict(row_data)
    mark_row_processed(client, sheet_row)

    logger.info(f"Extracted submission for: {client_data.get('business_name', 'unknown')}")
    return client_data


def get_all_pending_submissions() -> list[dict]:
    """Return ALL unprocessed submissions (useful for batch runs)."""
    client = get_sheets_client()
    rows   = fetch_all_rows(client)
    queue  = find_unprocessed_rows(rows)

    results = []
    for sheet_row, row_data in queue:
        client_data = row_to_dict(row_data)
        mark_row_processed(client, sheet_row)
        results.append(client_data)

    logger.info(f"Found {len(results)} pending submission(s).")
    return results


# ── CLI entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    submission = get_next_submission()
    if submission:
        print(json.dumps(submission, indent=2))
    else:
        print("Nothing to process.")
