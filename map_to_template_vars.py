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
  - Building the sections object from form toggle answers + style theme
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

DEFAULTS = {
    "about_text":         "We are a local business dedicated to serving our community.",
    "opening_hours":      "Mon–Fri 9am–5pm",
    "primary_colour":     "#1a1a2e",
    "facebook_url":       "",
    "instagram_url":      "",
    "hero_image_drive_url": "",
    "style_theme":        "modern",
    "want_sticky_bar":    "Yes",
    "contact_preference": "Quote form",
}

# Fallback stock hero images per trade (Unsplash — free, no key needed)
HERO_FALLBACKS = {
    "plumber":     "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600",
    "barber":      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1600",
    "restaurant":  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600",
    "fitness":     "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600",
    "beauty":      "https://images.unsplash.com/photo-1560066984-138daaa4e4e0?w=1600",
    "default":     "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600",
}

# Maps form answer for "What is your trade?" → internal trade ID
TRADE_MAP = {
    "Painter / Decorator": "painter",
    "Painter":             "painter",
    "Decorator":           "painter",
    "Roofer":              "roofer",
    "Electrician":         "electrician",
    "Landscaper":          "landscaper",
    "Plumber":             "plumber",
    "Barber":              "barber",
    "Hair Salon":          "barber",
    "Barber / Hair Salon": "barber",
}

# Maps form answer for "What style suits your business?" → internal theme name
STYLE_MAP = {
    "Modern & Clean":         "modern",
    "Bold & Industrial":      "industrial",
    "Classic & Professional": "classic",
    "Fresh & Natural":        "fresh",
    "Warm & Earthy":          "warm",
    "Fresh & Bright":         "fresh",
    "Bold":                   "industrial",
    "Modern":                 "modern",
    "Classic":                "classic",
    "Warm & Classic":         "warm",
}

# Maps trade ID → which template directory to use
TEMPLATE_MAP = {
    "painter":     "trades",
    "roofer":      "trades",
    "electrician": "trades",
    "landscaper":  "trades",
    "plumber":     "trades",
    "barber":      "trades",
}

# Sections available per trade — gates what can appear in the sections object
TRADE_AVAILABLE_SECTIONS = {
    "painter":     ["hero", "services", "gallery", "testimonials", "contact"],
    "roofer":      ["hero", "trust", "services", "testimonials", "contact"],
    "electrician": ["hero", "certifications", "services", "trust", "testimonials", "contact"],
    "landscaper":  ["hero", "services", "gallery", "testimonials", "contact"],
    "plumber":     ["hero", "trust", "services", "testimonials", "contact"],
    "barber":      ["hero", "services", "gallery", "testimonials", "contact"],
}

# ── Sanitisation helpers ──────────────────────────────────────────────────────

def strip_html(text: str) -> str:
    """Remove any HTML tags a client might have accidentally pasted."""
    return re.sub(r"<[^>]+>", "", text).strip()


def normalise_phone(phone: str) -> str:
    """Keep only digits, spaces, +, (, ), and -."""
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


def ensure_https(url: str) -> str:
    if url and not url.startswith("http"):
        return "https://" + url
    return url


# ── Asset downloading ──────────────────────────────────────────────────────────

def download_asset(url: str, dest_path: Path) -> str:
    """
    Download an asset from a URL to dest_path.
    Returns the local path string, or "" on failure.
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


def download_client_assets(data: dict, template_dir: Path) -> dict:
    """
    Download logo and hero image into the template's public/assets folder.
    template_dir must point to the Vite project root (e.g. templates/trades/).
    Returns updated data dict with local relative paths filled in.
    """
    slug      = data["site_slug"]
    asset_dir = template_dir / "public" / "assets"

    # Logo
    logo_url = data.get("logo_drive_url", "")
    if logo_url:
        ext       = ".png"
        logo_dest = asset_dir / f"{slug}-logo{ext}"
        local     = download_asset(logo_url, logo_dest)
        data["logo_path"] = f"/assets/{slug}-logo{ext}" if local else ""
    else:
        data["logo_path"] = ""

    # Hero image — use fallback stock photo if none provided
    hero_url = data.get("hero_image_drive_url", "")
    if not hero_url:
        trade_id = data.get("trade_id", "default")
        hero_url = HERO_FALLBACKS.get(trade_id, HERO_FALLBACKS["default"])
        data["hero_image_is_external"] = True
    else:
        data["hero_image_is_external"] = False

    if not data.get("hero_image_is_external"):
        hero_dest = asset_dir / f"{slug}-hero.jpg"
        local     = download_asset(hero_url, hero_dest)
        data["hero_image_path"] = f"/assets/{slug}-hero.jpg" if local else hero_url
    else:
        data["hero_image_path"] = hero_url  # external URL used directly in CSS

    return data


# ── Section builder ────────────────────────────────────────────────────────────

def build_sections(data: dict, trade_id: str, style_theme: str) -> dict:
    """
    Construct the sections object from form toggle answers and style theme.
    Only sections listed in TRADE_AVAILABLE_SECTIONS for this trade can appear.
    """
    available = TRADE_AVAILABLE_SECTIONS.get(trade_id, TRADE_AVAILABLE_SECTIONS["painter"])
    sections  = {}

    # Hero — always included; variant influenced by style
    sections["hero"] = "hero-split" if style_theme == "industrial" else "hero-bold-cta"

    # Trust — if available for this trade AND client selected it
    if "trust" in available and data.get("want_trust") == "Yes":
        sections["trust"] = "trust-bold" if style_theme == "industrial" else "trust-badges"

    # Certifications — electricians/plumbers only, shown if client listed any
    if "certifications" in available and data.get("certifications"):
        sections["certifications"] = "certs-prominent"

    # Services — always included
    sections["services"] = "services-cards"

    # Gallery — optional
    if "gallery" in available and data.get("want_gallery") == "Yes":
        sections["gallery"] = "gallery-masonry"

    # Testimonials — optional
    if "testimonials" in available and data.get("want_testimonials") == "Yes":
        sections["testimonials"] = "testimonials-cards"

    # Contact — always included; variant from form choice
    sections["contact"] = (
        "contact-form" if data.get("contact_preference", "Quote form") == "Quote form"
        else "contact-simple"
    )

    return sections


# ── Core mapping ──────────────────────────────────────────────────────────────

def map_to_site_config(raw: dict, output_dir: Path | None = None) -> dict:
    """
    Transform raw form data into the siteConfig shape (submission JSON schema).

    Args:
        raw:        Dict from extract_form_data.row_to_dict()
        output_dir: Root of the cloned template repo — if provided, assets
                    are downloaded into templates/{template}/public/assets/

    Returns:
        Dict matching the submission JSON schema and the SiteConfig TS interface.
    """
    def get(field: str) -> str:
        val = raw.get(field, "")
        if isinstance(val, str):
            val = val.strip()
        return val if val else DEFAULTS.get(field, "")

    # Resolve trade ID and template from form answer
    trade_id    = TRADE_MAP.get(get("site_type"), "painter")
    template    = TEMPLATE_MAP.get(trade_id, "trades")
    style_theme = STYLE_MAP.get(get("style_theme"), "modern")

    # Generate unique slug
    name_slug = slugify(get("business_name") or "site")
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    site_slug = f"{name_slug}-{timestamp}"

    # Build derived fields
    address = format_address(
        get("address_line1"),
        get("address_city"),
        get("address_postcode"),
    )
    services_list = raw.get("services_list", [])
    show_sticky   = get("want_sticky_bar").lower() not in ("no", "false", "0", "")

    sections = build_sections(raw, trade_id, style_theme)

    section_toggles = {
        "wantGallery":       raw.get("want_gallery", "") == "Yes",
        "wantTestimonials":  raw.get("want_testimonials", "") == "Yes",
        "wantTrust":         raw.get("want_trust", "") == "Yes",
        "wantOpeningHours":  raw.get("want_opening_hours", "") == "Yes",
        "contactPreference": get("contact_preference"),
    }

    business_name = strip_html(get("business_name"))
    about_text    = strip_html(get("about_text"))

    config = {
        # Pipeline metadata
        "template":     template,
        "slug":         site_slug,
        "status":       "pending",
        "submittedAt":  raw.get("submitted_at_iso", ""),
        "generatedAt":  datetime.now().isoformat(),
        "sheetRow":     raw.get("_sheet_row", 0),

        # Site identity
        "tradeId":      trade_id,
        "styleTheme":   style_theme,
        "showStickyBar": show_sticky,

        # Business details
        "business": {
            "name":              business_name,
            "phone":             normalise_phone(get("phone")),
            "location":          strip_html(get("address_city")),
            "about":             about_text,
            "yearsInBusiness":   get("years_in_business"),
            "email":             get("email").lower(),
            "address":           address,
            "openingHours":      strip_html(get("opening_hours")),
            "emergencyCallouts": get("emergency_callouts").lower() in ("yes", "true", "1"),
        },

        # Sections computed from form toggles + style theme
        "sections":        sections,
        "sectionToggles":  section_toggles,

        # Services from form (overrides trade config defaults)
        "services": services_list,

        # Styling
        "primaryColour": get("primary_colour"),

        # Assets (paths resolved below if output_dir provided)
        "logoPath":      "",
        "heroImagePath": HERO_FALLBACKS.get(trade_id, HERO_FALLBACKS["default"]),

        # Social links (empty string = hide in template)
        "social": {
            "facebook":  ensure_https(get("facebook_url")),
            "instagram": ensure_https(get("instagram_url")),
        },

        # SEO
        "meta": {
            "title":       f"{business_name} | {strip_html(get('address_city'))}",
            "description": about_text[:160],
            "slug":        site_slug,
        },

        # Deployment (filled in after build-and-deploy)
        "deployedUrl": "",
        "deployedAt":  "",
    }

    # Download assets if we have a target directory
    if output_dir:
        template_dir   = output_dir / "templates" / template
        asset_data     = {**raw, "site_slug": site_slug, "trade_id": trade_id}
        asset_data     = download_client_assets(asset_data, template_dir)
        config["logoPath"]      = asset_data.get("logo_path", "")
        config["heroImagePath"] = asset_data.get("hero_image_path", config["heroImagePath"])

    return config


# ── TypeScript config file generator ─────────────────────────────────────────

def generate_site_config_ts(config: dict) -> str:
    """
    Produce the contents of src/config/siteConfig.ts that the React template
    imports at build time.
    """
    # Services array as TS string[]
    services_ts = json.dumps(config["services"], ensure_ascii=False)

    # Sections object — keys unquoted TS object literal
    sections_lines = "\n".join(
        f'    {key}: "{val}",' for key, val in config["sections"].items()
    )
    sections_block = f"{{\n{sections_lines}\n  }}"

    # Social — always emit both keys
    facebook  = config["social"]["facebook"]
    instagram = config["social"]["instagram"]

    # Business block
    b = config["business"]
    emergency_callouts_ts = "true" if b["emergencyCallouts"] else "false"

    ts = f"""// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Generated: {config['generatedAt']}
// Submission slug: {config['slug']}

export const siteConfig = {{
  tradeId:      "{config['tradeId']}",
  styleTheme:   "{config['styleTheme']}",
  showStickyBar: {str(config['showStickyBar']).lower()},

  business: {{
    name:              "{b['name']}",
    phone:             "{b['phone']}",
    location:          "{b['location']}",
    about:             "{b['about']}",
    yearsInBusiness:   "{b['yearsInBusiness']}",
    email:             "{b['email']}",
    address:           "{b['address']}",
    openingHours:      "{b['openingHours']}",
    emergencyCallouts: {emergency_callouts_ts},
  }},

  sections: {sections_block},

  services: {services_ts},

  primaryColour: "{config['primaryColour']}",
  logoPath:      "{config['logoPath']}",
  heroImagePath: "{config['heroImagePath']}",

  social: {{
    facebook:  "{facebook}",
    instagram: "{instagram}",
  }},

  meta: {{
    title:       "{config['meta']['title']}",
    description: "{config['meta']['description']}",
    slug:        "{config['meta']['slug']}",
  }},

  mode: "site",
}} as const;

export type SiteConfig = typeof siteConfig;
"""
    return ts


def write_config_to_repo(config: dict, repo_root: Path):
    """Write the generated siteConfig.ts into the correct template subdirectory."""
    template   = config.get("template", "trades")
    config_dir = repo_root / "templates" / template / "src" / "config"
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
