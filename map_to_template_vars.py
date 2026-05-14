"""
map_to_template_vars.py
-----------------------
Takes the raw client dict from extract_form_data.py and maps it to the
exact variable shape the React template expects in src/config/siteConfig.ts.

This is the layer that handles:
  - Defaults for missing/empty fields
  - Sanitising user input (strip tags, normalise phone numbers, etc.)
  - Downloading assets (logo, hero image) from Google Drive
  - Generating a unique site slug for the client's subdomain
  - Producing the final siteConfig.ts file content ready to write into the repo
"""

import os
import re
import json
import logging
import unicodedata
import urllib.request
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

# ── Defaults ──────────────────────────────────────────────────────────────────
# These values are used whenever the client left a field blank.
# Update to match your brand / sensible fallbacks.

DEFAULTS = {
    "tagline":          "Quality you can trust",
    "about_text":       "We are a local business dedicated to serving our community.",
    "opening_hours":    "Mon–Fri 9am–5pm",
    "primary_colour":   "#1a1a2e",
    "facebook_url":     "",
    "instagram_url":    "",
    "hero_image_drive_url": "",
}

# Fallback stock hero images per site type (Unsplash — free, no key needed)
HERO_FALLBACKS = {
    "plumber":    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600",
    "barber":     "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1600",
    "restaurant": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600",
    "fitness":    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600",
    "beauty":     "https://images.unsplash.com/photo-1560066984-138daaa4e4e0?w=1600",
    "default":    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600",
}

# ── Sanitisation helpers ──────────────────────────────────────────────────────

def strip_html(text: str) -> str:
    """Remove any HTML tags a client might have accidentally pasted."""
    return re.sub(r"<[^>]+>", "", text).strip()


def normalise_phone(phone: str) -> str:
    """
    Keep only digits, spaces, +, (, ), and -.
    Makes sure a UK number starting 07 is displayed cleanly.
    """
    cleaned = re.sub(r"[^\d\s\+\(\)\-]", "", phone).strip()
    return cleaned


def slugify(text: str) -> str:
    """
    Convert a business name to a URL-safe slug.
    "Joe's Plumbing & Heating" → "joes-plumbing-heating"
    """
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def format_address(line1: str, city: str, postcode: str) -> str:
    parts = [p.strip() for p in [line1, city, postcode] if p.strip()]
    return ", ".join(parts)


def parse_services(services_list: list[str]) -> list[dict]:
    """
    Turn a flat list of service strings into structured objects.
    ["Boiler repair", "Leak detection"] →
    [{"name": "Boiler repair", "icon": "wrench"}, ...]
    """
    return [{"name": svc, "icon": "default"} for svc in services_list]


def ensure_https(url: str) -> str:
    if url and not url.startswith("http"):
        return "https://" + url
    return url


# ── Asset downloading ──────────────────────────────────────────────────────────

def download_asset(url: str, dest_path: Path) -> str:
    """
    Download an asset from a URL to dest_path.
    Returns the relative path string to embed in config, or "" on failure.
    """
    if not url:
        return ""
    try:
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(url, dest_path)
        logger.info(f"Downloaded asset → {dest_path}")
        return str(dest_path)
    except Exception as e:
        logger.warning(f"Could not download {url}: {e}")
        return ""


def download_client_assets(data: dict, output_dir: Path) -> dict:
    """
    Download logo and hero image into the template's public/assets folder.
    Returns updated data dict with local relative paths filled in.
    """
    slug = data["site_slug"]
    asset_dir = output_dir / "public" / "assets"

    # Logo
    logo_url = data.get("logo_drive_url", "")
    if logo_url:
        ext = ".png"  # Drive exports are usually PNG; could sniff content-type
        logo_dest = asset_dir / f"{slug}-logo{ext}"
        local_path = download_asset(logo_url, logo_dest)
        data["logo_path"] = f"/assets/{slug}-logo{ext}" if local_path else ""
    else:
        data["logo_path"] = ""

    # Hero image — use fallback stock photo if none provided
    hero_url = data.get("hero_image_drive_url", "")
    if not hero_url:
        site_type = data.get("site_type", "default")
        hero_url = HERO_FALLBACKS.get(site_type, HERO_FALLBACKS["default"])
        data["hero_image_is_external"] = True
    else:
        data["hero_image_is_external"] = False

    if not data.get("hero_image_is_external"):
        hero_dest = asset_dir / f"{slug}-hero.jpg"
        local_path = download_asset(hero_url, hero_dest)
        data["hero_image_path"] = f"/assets/{slug}-hero.jpg" if local_path else hero_url
    else:
        data["hero_image_path"] = hero_url   # external URL used directly

    return data


# ── Core mapping ──────────────────────────────────────────────────────────────

def map_to_site_config(raw: dict, output_dir: Path | None = None) -> dict:
    """
    Transform raw form data into the siteConfig shape.

    Args:
        raw:        Dict from extract_form_data.row_to_dict()
        output_dir: Root of the cloned template repo — if provided, assets
                    are downloaded into public/assets/

    Returns:
        Dict matching the SiteConfig TypeScript interface in the template.
    """
    def get(field: str) -> str:
        val = raw.get(field, "").strip()
        return val if val else DEFAULTS.get(field, "")

    # Generate a unique site slug from business name + timestamp
    name_slug   = slugify(get("business_name"))
    timestamp   = datetime.now().strftime("%Y%m%d%H%M%S")
    site_slug   = f"{name_slug}-{timestamp}"

    config = {
        # ── Identity ──
        "businessName":   strip_html(get("business_name")),
        "tagline":        strip_html(get("tagline")),
        "ownerName":      strip_html(get("owner_name")),
        "siteSlug":       site_slug,
        "siteType":       get("site_type") or "default",

        # ── Contact ──
        "email":          get("email").lower(),
        "phone":          normalise_phone(get("phone")),
        "address":        format_address(
                              get("address_line1"),
                              get("address_city"),
                              get("address_postcode"),
                          ),
        "addressLine1":   get("address_line1"),
        "addressCity":    get("address_city"),
        "addressPostcode": get("address_postcode"),

        # ── Content ──
        "aboutText":      strip_html(get("about_text")),
        "openingHours":   strip_html(get("opening_hours")),
        "services":       parse_services(raw.get("services_list", [])),

        # ── Assets (paths resolved below if output_dir provided) ──
        "logoPath":       "",
        "heroImagePath":  HERO_FALLBACKS.get(get("site_type"), HERO_FALLBACKS["default"]),

        # ── Social ──
        "facebookUrl":    ensure_https(get("facebook_url")),
        "instagramUrl":   ensure_https(get("instagram_url")),

        # ── Styling ──
        "primaryColour":  get("primary_colour"),

        # ── Meta / SEO ──
        "metaTitle":      f"{strip_html(get('business_name'))} | {strip_html(get('tagline'))}",
        "metaDescription": strip_html(get("about_text"))[:160],

        # ── Internal tracking ──
        "_submittedAt":   raw.get("submitted_at_iso", ""),
        "_generatedAt":   datetime.now().isoformat(),
    }

    # Download assets if we have a target directory
    if output_dir:
        config_with_assets = {**raw, **{"site_slug": site_slug}}
        config_with_assets = download_client_assets(config_with_assets, output_dir)
        config["logoPath"]      = config_with_assets.get("logo_path", "")
        config["heroImagePath"] = config_with_assets.get("hero_image_path", config["heroImagePath"])

    return config


# ── TypeScript config file generator ─────────────────────────────────────────

def generate_site_config_ts(config: dict) -> str:
    """
    Produce the contents of src/config/siteConfig.ts that the React template
    imports.  The template reads from this file at build time.
    """
    services_json = json.dumps(config["services"], ensure_ascii=False, indent=4)
    services_ts   = services_json.replace('"name"', 'name').replace('"icon"', 'icon')

    # Build social object — omit keys with empty values so the UI can hide them
    social_entries = []
    if config["facebookUrl"]:
        social_entries.append(f'    facebook: "{config["facebookUrl"]}"')
    if config["instagramUrl"]:
        social_entries.append(f'    instagram: "{config["instagramUrl"]}"')
    social_block = "{\n" + ",\n".join(social_entries) + "\n  }" if social_entries else "{}"

    ts = f"""// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Generated: {config['_generatedAt']}
// Source submission: {config['_submittedAt']}

export const siteConfig = {{
  // Identity
  businessName: "{config['businessName']}",
  tagline:      "{config['tagline']}",
  ownerName:    "{config['ownerName']}",
  siteSlug:     "{config['siteSlug']}",
  siteType:     "{config['siteType']}",

  // Contact
  email:          "{config['email']}",
  phone:          "{config['phone']}",
  address:        "{config['address']}",
  addressLine1:   "{config['addressLine1']}",
  addressCity:    "{config['addressCity']}",
  addressPostcode: "{config['addressPostcode']}",

  // Content
  aboutText:    "{config['aboutText']}",
  openingHours: "{config['openingHours']}",
  services: {services_json},

  // Assets
  logoPath:      "{config['logoPath']}",
  heroImagePath: "{config['heroImagePath']}",

  // Social
  social: {social_block},

  // Styling
  primaryColour: "{config['primaryColour']}",

  // SEO
  metaTitle:       "{config['metaTitle']}",
  metaDescription: "{config['metaDescription']}",
}} as const;

export type SiteConfig = typeof siteConfig;
"""
    return ts


def write_config_to_repo(config: dict, repo_root: Path):
    """Write the generated siteConfig.ts into the template repo."""
    config_dir = repo_root / "src" / "config"
    config_dir.mkdir(parents=True, exist_ok=True)
    dest = config_dir / "siteConfig.ts"
    dest.write_text(generate_site_config_ts(config), encoding="utf-8")
    logger.info(f"Wrote siteConfig.ts → {dest}")


# ── CLI entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    # Accept raw JSON on stdin (piped from extract_form_data.py)
    raw_data = json.load(sys.stdin)
    config   = map_to_site_config(raw_data)

    print(json.dumps(config, indent=2, ensure_ascii=False))
