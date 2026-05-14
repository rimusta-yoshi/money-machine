"""
build_and_deploy.py
-------------------
Orchestrates the full pipeline:

  1. Extract next pending submission from Google Sheets
  2. Map raw data → siteConfig.ts
  3. Clone / update the template repo
  4. Write siteConfig.ts into the repo
  5. Run `npm install && npm run build`
  6. Deploy the dist/ folder to Netlify (or Cloudflare Pages)
  7. Send the client a confirmation email with their live URL
  8. Log the result back to Google Sheets

Run manually:          python build_and_deploy.py
Run all pending:       python build_and_deploy.py --all
Dry run (no deploy):   python build_and_deploy.py --dry-run

Requirements:
    pip install requests gitpython

Environment variables (set in .env or your CI secrets):
    SPREADSHEET_ID              Google Sheet ID
    GOOGLE_SERVICE_ACCOUNT_KEY  Path to service account JSON
    GITHUB_REPO_URL             https://github.com/rimusta-yoshi/money-machine.git
    NETLIFY_AUTH_TOKEN          Personal access token from app.netlify.com/user/applications
    NETLIFY_SITE_ID             Leave blank to create a new site per client
    SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS   For sending emails
    FROM_EMAIL                  Your business email address
    BASE_DOMAIN                 e.g. "yourbrand.com" (for subdomain links in email)
"""

import os
import sys
import json
import shutil
import logging
import argparse
import smtplib
import subprocess
import tempfile
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

import requests

# Local modules (same directory)
from extract_form_data import get_next_submission, get_all_pending_submissions, get_sheets_client
from map_to_template_vars import map_to_site_config, write_config_to_repo

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("pipeline.log"),
    ],
)
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────

GITHUB_REPO_URL    = os.getenv("GITHUB_REPO_URL", "https://github.com/rimusta-yoshi/money-machine.git")
NETLIFY_AUTH_TOKEN = os.getenv("NETLIFY_AUTH_TOKEN", "")
NETLIFY_TEAM_SLUG  = os.getenv("NETLIFY_TEAM_SLUG", "")   # optional: deploy under a team account
SPREADSHEET_ID     = os.getenv("SPREADSHEET_ID", "")
BASE_DOMAIN        = os.getenv("BASE_DOMAIN", "yourbrand.com")

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)

# ── Repo management ───────────────────────────────────────────────────────────

def clone_template(work_dir: Path) -> Path:
    """
    Clone the template repo into a temp folder inside work_dir.
    Returns the path to the cloned repo root.
    """
    repo_dir = work_dir / "repo"
    logger.info(f"Cloning {GITHUB_REPO_URL} → {repo_dir}")
    result = subprocess.run(
        ["git", "clone", "--depth", "1", GITHUB_REPO_URL, str(repo_dir)],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(f"git clone failed:\n{result.stderr}")
    return repo_dir


# ── Build ─────────────────────────────────────────────────────────────────────

def build_site(repo_dir: Path) -> Path:
    """
    Run npm install + npm run build inside the repo.
    Returns the path to the built dist/ folder.
    """
    logger.info("Installing npm dependencies...")
    _run(["npm", "install", "--prefer-offline"], cwd=repo_dir)

    logger.info("Building site...")
    _run(["npm", "run", "build"], cwd=repo_dir)

    dist = repo_dir / "dist"
    if not dist.exists():
        raise RuntimeError(f"Build succeeded but dist/ not found at {dist}")
    logger.info(f"Build complete → {dist}")
    return dist


def _run(cmd: list[str], cwd: Path):
    result = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Command {cmd} failed:\n{result.stderr}")
    if result.stdout:
        logger.debug(result.stdout)


# ── Netlify deployment ────────────────────────────────────────────────────────

def deploy_to_netlify(dist_dir: Path, site_name: str) -> dict:
    """
    Deploy the dist/ folder to Netlify using the Deploy API.

    If NETLIFY_SITE_ID env var is set, deploys to that existing site.
    Otherwise creates a new site with the given site_name.

    Returns a dict with keys: site_id, deploy_id, deploy_url, site_url
    """
    headers = {
        "Authorization": f"Bearer {NETLIFY_AUTH_TOKEN}",
        "Content-Type": "application/json",
    }

    # Step 1: Get or create the Netlify site
    site_id = os.getenv("NETLIFY_SITE_ID", "")
    if not site_id:
        logger.info(f"Creating new Netlify site: {site_name}")
        payload = {"name": site_name}
        if NETLIFY_TEAM_SLUG:
            payload["account_slug"] = NETLIFY_TEAM_SLUG
        resp = requests.post(
            "https://api.netlify.com/api/v1/sites",
            headers=headers,
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
        site_data = resp.json()
        site_id   = site_data["id"]
        site_url  = site_data["url"]
        logger.info(f"Created site {site_id} → {site_url}")
    else:
        resp = requests.get(
            f"https://api.netlify.com/api/v1/sites/{site_id}",
            headers=headers, timeout=30,
        )
        resp.raise_for_status()
        site_url = resp.json()["url"]

    # Step 2: Create a zip of the dist/ folder and upload
    zip_path = _zip_dist(dist_dir)
    logger.info(f"Uploading {zip_path} to Netlify site {site_id}...")

    with open(zip_path, "rb") as f:
        resp = requests.post(
            f"https://api.netlify.com/api/v1/sites/{site_id}/deploys",
            headers={
                "Authorization": f"Bearer {NETLIFY_AUTH_TOKEN}",
                "Content-Type": "application/zip",
            },
            data=f,
            timeout=120,
        )
    resp.raise_for_status()
    deploy_data = resp.json()

    result = {
        "site_id":    site_id,
        "deploy_id":  deploy_data["id"],
        "deploy_url": deploy_data.get("deploy_url", ""),
        "site_url":   deploy_data.get("url", site_url),
    }
    logger.info(f"Deployed → {result['site_url']}")
    return result


def _zip_dist(dist_dir: Path) -> Path:
    """Zip the dist/ folder and return the path to the zip file."""
    zip_path = dist_dir.parent / "site.zip"
    shutil.make_archive(str(zip_path.with_suffix("")), "zip", str(dist_dir))
    return zip_path


# ── Email notification ────────────────────────────────────────────────────────

def send_confirmation_email(config: dict, site_url: str):
    """Email the client their new live site URL."""
    if not SMTP_USER or not SMTP_PASS:
        logger.warning("SMTP credentials not set — skipping email.")
        return

    business_name = config["businessName"]
    client_email  = config["email"]
    owner_name    = config["ownerName"] or "there"

    subject = f"Your new website is live — {business_name}"
    body = f"""Hi {owner_name},

Great news — your new website is live! 🎉

  {site_url}

Here's what happens next:
  • Check everything looks correct — contact us if anything needs tweaking.
  • If you have a custom domain, reply to this email and we'll help you set it up.
  • Save this email — it's got your site link and our contact details.

If you'd like any changes, just reply to this email with the details.

Thanks for choosing us,
The {FROM_EMAIL.split('@')[0].title()} Team
"""

    msg = MIMEMultipart()
    msg["From"]    = FROM_EMAIL
    msg["To"]      = client_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, client_email, msg.as_string())
        logger.info(f"Confirmation email sent to {client_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {client_email}: {e}")


# ── Result logging ────────────────────────────────────────────────────────────

def log_result_to_sheet(config: dict, deploy_result: dict):
    """
    Write the live URL and deploy timestamp back into the Google Sheet
    so you have a record against each submission.
    This assumes you have added 'Site URL' and 'Deployed At' columns
    to your sheet (adjust column letters as needed).
    """
    # This is a simplified implementation — wire up properly using
    # the same Sheets client from extract_form_data.py
    logger.info(
        f"[Sheet logging] {config['businessName']} → {deploy_result['site_url']}"
    )
    # TODO: call client.values().update(...) with site_url and timestamp
    #       using the row number stored alongside the submission


# ── Orchestrator ──────────────────────────────────────────────────────────────

def process_submission(raw_data: dict, dry_run: bool = False) -> dict | None:
    """
    Full pipeline for a single submission.
    Returns the deploy result dict, or None on failure.
    """
    business_name = raw_data.get("business_name", "unknown")
    logger.info(f"=== Processing: {business_name} ===")

    with tempfile.TemporaryDirectory(prefix="money-machine-") as tmp:
        work_dir = Path(tmp)

        try:
            # 1. Clone template
            repo_dir = clone_template(work_dir)

            # 2. Map data → config
            config = map_to_site_config(raw_data, output_dir=repo_dir)

            # 3. Write siteConfig.ts into repo
            write_config_to_repo(config, repo_dir)

            if dry_run:
                logger.info("Dry run — skipping build and deploy.")
                logger.info(f"Config that would be used:\n{json.dumps(config, indent=2)}")
                return {"dry_run": True, "config": config}

            # 4. Build
            dist_dir = build_site(repo_dir)

            # 5. Deploy
            site_name     = config["siteSlug"]
            deploy_result = deploy_to_netlify(dist_dir, site_name)

            # 6. Email client
            send_confirmation_email(config, deploy_result["site_url"])

            # 7. Log back to sheet
            log_result_to_sheet(config, deploy_result)

            logger.info(f"=== Done: {business_name} → {deploy_result['site_url']} ===")
            return deploy_result

        except Exception as e:
            logger.error(f"Pipeline failed for {business_name}: {e}", exc_info=True)
            return None


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Money Machine build pipeline")
    parser.add_argument("--all",     action="store_true", help="Process all pending submissions")
    parser.add_argument("--dry-run", action="store_true", help="Skip build and deploy")
    args = parser.parse_args()

    if args.all:
        submissions = get_all_pending_submissions()
    else:
        submission = get_next_submission()
        submissions = [submission] if submission else []

    if not submissions:
        logger.info("Nothing to process. Exiting.")
        sys.exit(0)

    results = []
    for raw in submissions:
        result = process_submission(raw, dry_run=args.dry_run)
        results.append(result)

    succeeded = sum(1 for r in results if r and not r.get("dry_run") or r and r.get("dry_run"))
    logger.info(f"Processed {succeeded}/{len(results)} submission(s).")


if __name__ == "__main__":
    main()
