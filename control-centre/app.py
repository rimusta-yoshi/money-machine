"""
control-centre/app.py
---------------------
Local Flask app for reviewing and approving pending website submissions.

Start from the repo root:
    python control-centre/app.py

Or set REPO_ROOT env var if running from another directory.
"""

import json
import os
import platform
import subprocess
import sys
from pathlib import Path

import requests
from flask import Flask, jsonify, redirect, render_template, request, url_for

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

# ── Repo root ──────────────────────────────────────────────────────────────────
_env_root = os.getenv("REPO_ROOT", "")
REPO_ROOT = Path(_env_root).resolve() if _env_root else Path(__file__).parent.parent.resolve()
sys.path.insert(0, str(REPO_ROOT))

from map_to_template_vars import TRADE_AVAILABLE_SECTIONS, write_config_to_repo  # noqa: E402

# ── Config ─────────────────────────────────────────────────────────────────────
GITHUB_PAT   = os.getenv("GITHUB_PAT", "")
GITHUB_OWNER = os.getenv("GITHUB_OWNER", "roff-dev")
GITHUB_REPO  = os.getenv("GITHUB_REPO", "money-machine")
PORT         = int(os.getenv("PORT", "5000"))

TEMPLATE_DIR        = REPO_ROOT / "templates" / "trades"
SITE_CONFIG_PATH    = TEMPLATE_DIR / "src" / "config" / "siteConfig.ts"
SITE_CONFIG_EXAMPLE = TEMPLATE_DIR / "src" / "config" / "siteConfig.example.ts"
PENDING_DIR         = REPO_ROOT / "submissions" / "pending"
COMPLETED_DIR       = REPO_ROOT / "submissions" / "completed"

SECTION_VARIANTS = {
    "hero":           [("hero-bold-cta", "Bold CTA"), ("hero-split", "Split with photo")],
    "services":       [("services-cards", "Service cards"), ("services-list", "Simple list")],
    "gallery":        [("gallery-masonry", "Before & after grid"), ("gallery-row", "Horizontal strip")],
    "testimonials":   [("testimonials-cards", "Review cards"), ("testimonials-simple", "Quote strip")],
    "contact":        [("contact-form", "Quote form"), ("contact-simple", "Phone + email")],
    "trust":          [("trust-bold", "Bold trust banner"), ("trust-badges", "Badge row")],
    "certifications": [("certs-prominent", "Cert showcase"), ("certs-badges", "Badge strip")],
}

STYLE_THEMES = ["modern", "industrial", "classic", "fresh", "warm"]

# ── Dev server ─────────────────────────────────────────────────────────────────
_dev_server: subprocess.Popen | None = None


def _npm_popen(*args) -> subprocess.Popen:
    if platform.system() == "Windows":
        cmd = "npm.cmd " + " ".join(args)
        return subprocess.Popen(
            cmd, cwd=str(TEMPLATE_DIR), shell=True,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
    return subprocess.Popen(
        ["npm", *args], cwd=str(TEMPLATE_DIR),
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def start_dev_server():
    global _dev_server
    if _dev_server and _dev_server.poll() is None:
        return
    _dev_server = _npm_popen("run", "dev")


def stop_dev_server():
    global _dev_server
    if _dev_server:
        _dev_server.terminate()
        try:
            _dev_server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            _dev_server.kill()
        _dev_server = None
    restore_siteconfig()


def dev_server_running() -> bool:
    return _dev_server is not None and _dev_server.poll() is None


# ── Submission helpers ─────────────────────────────────────────────────────────

def list_pending() -> list[dict]:
    items = []
    for p in sorted(PENDING_DIR.glob("*.json")):
        try:
            items.append(json.loads(p.read_text(encoding="utf-8")))
        except Exception:
            pass
    return items


def read_submission(slug: str) -> dict:
    path = PENDING_DIR / f"{slug}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def write_submission(slug: str, config: dict):
    path = PENDING_DIR / f"{slug}.json"
    path.write_text(json.dumps(config, indent=2, ensure_ascii=False), encoding="utf-8")


def _set_nested(d: dict, dotted_key: str, value):
    keys = dotted_key.split(".")
    for k in keys[:-1]:
        d = d.setdefault(k, {})
    d[keys[-1]] = value


def apply_patch(slug: str, patch: dict) -> dict:
    config = read_submission(slug)
    for key, value in patch.items():
        _set_nested(config, key, value)
    write_submission(slug, config)
    write_config_to_repo(config, REPO_ROOT)
    return config


def restore_siteconfig():
    if SITE_CONFIG_EXAMPLE.exists():
        SITE_CONFIG_PATH.write_text(
            SITE_CONFIG_EXAMPLE.read_text(encoding="utf-8"), encoding="utf-8"
        )


# ── GitHub helpers ─────────────────────────────────────────────────────────────

def _gh_headers() -> dict:
    return {
        "Authorization": f"token {GITHUB_PAT}",
        "Accept": "application/vnd.github.v3+json",
    }


def dispatch_build(slug: str) -> bool:
    url = (
        f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}"
        "/actions/workflows/build-and-deploy.yml/dispatches"
    )
    resp = requests.post(
        url,
        headers=_gh_headers(),
        json={"ref": "main", "inputs": {"submission_slug": slug}},
        timeout=15,
    )
    return resp.status_code == 204


def get_build_runs() -> list[dict]:
    url = (
        f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}"
        "/actions/workflows/build-and-deploy.yml/runs"
    )
    try:
        resp = requests.get(url, headers=_gh_headers(), params={"per_page": 15}, timeout=15)
        if resp.status_code != 200:
            return []
        runs = resp.json().get("workflow_runs", [])
        return [
            {
                "id":         r["id"],
                "status":     r["status"],
                "conclusion": r["conclusion"],
                "created_at": r["created_at"],
                "html_url":   r["html_url"],
                "display_title": r.get("display_title", r.get("name", "")),
            }
            for r in runs
        ]
    except Exception:
        return []


# ── Flask app ──────────────────────────────────────────────────────────────────
app = Flask(__name__)


@app.route("/")
def dashboard():
    pending = list_pending()
    completed_count = len(list(COMPLETED_DIR.glob("*.json")))
    return render_template("dashboard.html", pending=pending, completed_count=completed_count)


@app.route("/submissions")
def submissions():
    pending = list_pending()
    return render_template("submissions.html", submissions=pending)


@app.route("/submissions/<slug>")
def submission_detail(slug):
    try:
        config = read_submission(slug)
    except FileNotFoundError:
        return redirect(url_for("submissions"))
    available_sections = TRADE_AVAILABLE_SECTIONS.get(config.get("tradeId", "painter"), [])
    return render_template(
        "submission.html",
        config=config,
        slug=slug,
        available_sections=available_sections,
        section_variants=SECTION_VARIANTS,
        style_themes=STYLE_THEMES,
        dev_running=dev_server_running(),
    )


@app.route("/submissions/<slug>/update", methods=["POST"])
def update_submission(slug):
    patch = request.get_json(force=True)
    if not patch:
        return jsonify({"error": "empty patch"}), 400
    try:
        config = apply_patch(slug, patch)
        return jsonify({"ok": True, "slug": config["slug"]})
    except FileNotFoundError:
        return jsonify({"error": "submission not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/submissions/<slug>/approve", methods=["POST"])
def approve_submission(slug):
    ok = dispatch_build(slug)
    if ok:
        return jsonify({"ok": True, "message": f"Build dispatched for {slug}"})
    return jsonify({"ok": False, "message": "GitHub dispatch failed — check GITHUB_PAT"}), 502


@app.route("/submissions/<slug>/reject", methods=["POST"])
def reject_submission(slug):
    try:
        config = read_submission(slug)
        config["status"] = "rejected"
        COMPLETED_DIR.mkdir(parents=True, exist_ok=True)
        dest = COMPLETED_DIR / f"{slug}.json"
        dest.write_text(json.dumps(config, indent=2, ensure_ascii=False), encoding="utf-8")
        (PENDING_DIR / f"{slug}.json").unlink()
        return jsonify({"ok": True, "redirect": url_for("submissions")})
    except FileNotFoundError:
        return jsonify({"error": "submission not found"}), 404


@app.route("/devserver/start", methods=["POST"])
def devserver_start():
    data = request.get_json(force=True) or {}
    slug = data.get("slug", "")
    if slug:
        try:
            config = read_submission(slug)
            write_config_to_repo(config, REPO_ROOT)
        except FileNotFoundError:
            pass
    start_dev_server()
    return jsonify({"ok": True, "running": True})


@app.route("/devserver/stop", methods=["POST"])
def devserver_stop():
    stop_dev_server()
    return jsonify({"ok": True, "running": False})


@app.route("/builds")
def builds():
    runs = get_build_runs()
    return render_template("builds.html", runs=runs)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True, use_reloader=False)
