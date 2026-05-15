"""
ci_queue.py
-----------
CI helper for Workflow 1 (extract-and-queue).

Reads the next unprocessed submission from Google Sheets, maps it to the
siteConfig shape, and saves it as submissions/pending/{slug}.json.

Sets GitHub Actions step outputs:
  slug, business_name, trade_id, submitted_at

Exits 0 with no outputs if there are no pending submissions.
"""

import json
import os
from pathlib import Path

from extract_form_data import get_next_submission
from map_to_template_vars import map_to_site_config


def set_output(name: str, value: str):
    output_file = os.environ.get("GITHUB_OUTPUT", "")
    if output_file:
        with open(output_file, "a") as f:
            f.write(f"{name}={value}\n")
    else:
        print(f"::set-output name={name}::{value}")


def main():
    raw = get_next_submission()
    if raw is None:
        print("No pending submissions. Exiting.")
        return

    # No output_dir — assets are downloaded at build time, not queue time
    config = map_to_site_config(raw)

    slug          = config["slug"]
    business_name = config["business"]["name"]
    trade_id      = config["tradeId"]
    submitted_at  = config.get("submittedAt", "")

    pending_dir = Path("submissions/pending")
    pending_dir.mkdir(parents=True, exist_ok=True)

    dest = pending_dir / f"{slug}.json"
    dest.write_text(json.dumps(config, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Saved {dest}")

    set_output("slug", slug)
    set_output("business_name", business_name)
    set_output("trade_id", trade_id)
    set_output("submitted_at", submitted_at)


if __name__ == "__main__":
    main()
