"""
ci_deploy.py
------------
CI helper for Workflow 2 (build-and-deploy). Two steps:

  --step prep  (before npm build)
    - Downloads logo and hero image from Google Drive into
      templates/{template}/public/assets/
    - Writes templates/{template}/src/config/siteConfig.ts
    - Outputs: template name (so workflow can run npm ci --prefix templates/{template})

  --step post  (after npm build)
    - Deploys templates/{template}/dist/ to Netlify
    - Sends confirmation email to client
    - Logs deployed URL + timestamp back to Google Sheet
    - Outputs: site_url (used in the git commit message)

Usage:
    python ci_deploy.py --step prep --slug mackay-painting-20260514120000
    python ci_deploy.py --step post --slug mackay-painting-20260514120000
"""

import argparse
import json
import os
from pathlib import Path

from map_to_template_vars import download_client_assets, write_config_to_repo
from build_and_deploy import deploy_to_netlify, send_confirmation_email, log_result_to_sheet


def set_output(name: str, value: str):
    output_file = os.environ.get("GITHUB_OUTPUT", "")
    if output_file:
        with open(output_file, "a") as f:
            f.write(f"{name}={value}\n")
    else:
        print(f"::set-output name={name}::{value}")


def main():
    parser = argparse.ArgumentParser(description="CI deploy helper")
    parser.add_argument("--step", choices=["prep", "post"], required=True)
    parser.add_argument("--slug", required=True)
    args = parser.parse_args()

    config_path = Path(f"submissions/pending/{args.slug}.json")
    config = json.loads(config_path.read_text(encoding="utf-8"))
    template = config["template"]

    if args.step == "prep":
        template_dir = Path("templates") / template

        asset_data = {
            "site_slug":             config["slug"],
            "trade_id":              config["tradeId"],
            "logo_drive_url":        config.get("logoDownloadUrl", ""),
            "hero_image_drive_url":  config.get("heroDownloadUrl", ""),
        }
        asset_data = download_client_assets(asset_data, template_dir)

        config["logoPath"]      = asset_data.get("logo_path", config["logoPath"])
        config["heroImagePath"] = asset_data.get("hero_image_path", config["heroImagePath"])

        # Write updated config back so --step post reads correct asset paths
        config_path.write_text(
            json.dumps(config, indent=2, ensure_ascii=False), encoding="utf-8"
        )

        write_config_to_repo(config, Path("."))
        print(f"siteConfig.ts written for {args.slug} (template: {template})")

        set_output("template", template)

    elif args.step == "post":
        dist_dir  = Path("templates") / template / "dist"
        site_name = config["meta"]["slug"]

        deploy_result = deploy_to_netlify(dist_dir, site_name)
        send_confirmation_email(config, deploy_result["site_url"])
        log_result_to_sheet(config, deploy_result)

        print(f"Deployed {args.slug} → {deploy_result['site_url']}")
        set_output("site_url", deploy_result["site_url"])


if __name__ == "__main__":
    main()
