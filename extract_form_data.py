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

# Maps Google Form question text (column header) → internal field name.
# Form branching means column positions vary per trade — never use index-based mapping.
HEADER_MAP = {
    "Timestamp":                                    "submitted_at",
    "What is your trade?":                          "site_type",
    "What style suits your business?":              "style_theme",
    "Business Name":                                "business_name",
    "Phone Number":                                 "phone",
    "Email Address":                                "email",
    "Town / City Served":                           "address_city",
    "Full Address":                                 "address_line1",
    "Postcode":                                     "address_postcode",
    "Services Offered":                             "services",
    "Opening Hours":                                "opening_hours",
    "About Your Business":                          "about_text",
    "Years in Business":                            "years_in_business",
    "Primary Brand Colour":                         "primary_colour",
    "Logo":                                         "logo_drive_url",
    "Hero / Banner Photo":                          "hero_image_drive_url",
    "Facebook URL":                                 "facebook_url",
    "Instagram URL":                                "instagram_url",
    "Would you like a gallery section?":            "want_gallery",
    "Would you like a testimonials section?":       "want_testimonials",
    "Would you like to show opening hours?":        "want_opening_hours",
    "Would you like a trust/credentials section?":  "want_trust",
    "Contact preference":                           "contact_preference",
    "Sticky call bar?":                             "want_sticky_bar",
    "Certifications held":                          "certifications",
    "Do you offer emergency callouts?":             "emergency_callouts",
    "Gas Safe registered?":                         "gas_safe",
}

# Column we add manually to track processing — stays index-based (our own column, not a form question)
PROCESSED_COL_INDEX  = 18
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


def row_to_dict(row: list, headers: list) -> dict:
    """Convert a raw row to a labelled dict by matching column header text against HEADER_MAP."""
    data = {field: "" for field in HEADER_MAP.values()}  # all fields default to ""
    for col_idx, header_text in enumerate(headers):
        field_name = HEADER_MAP.get(header_text.strip())
        if field_name and col_idx < len(row):
            data[field_name] = row[col_idx].strip()

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
    Handles both URL formats produced by Google Forms file-upload questions:
      /file/d/FILE_ID/view?...   (format from Google Forms uploads)
      /open?id=FILE_ID           (older sharing link format)
    Direct format: https://drive.google.com/uc?export=download&id=FILE_ID
    """
    if not url:
        return ""
    if "/file/d/" in url:
        file_id = url.split("/file/d/")[1].split("/")[0]
        return f"https://drive.google.com/uc?export=download&id={file_id}"
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

    if len(rows) < 2:
        logger.info("No submissions found.")
        return None

    headers = rows[0]
    queue   = find_unprocessed_rows(rows)

    if not queue:
        logger.info("No unprocessed submissions found.")
        return None

    sheet_row, row_data = queue[0]
    client_data = row_to_dict(row_data, headers)
    client_data["_sheet_row"] = sheet_row  # threaded through to log_result_to_sheet()
    mark_row_processed(client, sheet_row)

    logger.info(f"Extracted submission for: {client_data.get('business_name', 'unknown')}")
    return client_data


def get_all_pending_submissions() -> list[dict]:
    """Return ALL unprocessed submissions (useful for batch runs)."""
    client = get_sheets_client()
    rows   = fetch_all_rows(client)

    if len(rows) < 2:
        logger.info("No submissions found.")
        return []

    headers = rows[0]
    queue   = find_unprocessed_rows(rows)

    results = []
    for sheet_row, row_data in queue:
        client_data = row_to_dict(row_data, headers)
        client_data["_sheet_row"] = sheet_row
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
