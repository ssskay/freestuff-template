#!/usr/bin/env python3
"""Keyless freshness check: dead links + stale verified-dates.

The smart verifier (verify.py) needs an Anthropic API key. This does NOT — it is
pure stdlib (urllib), so the weekly workflow can keep the catalog honest for free:
flag links that broke and entries whose "verified" date is going stale, so a human
knows exactly where to look. No key, no pip install, no network deps.

Usage:
  python3 agents/freshness_check.py [--stale-days 180] [--timeout 12] [--limit N]

Exit code: 1 if any broken links are found (a signal for local runs); the weekly
job runs it non-fatally and surfaces the report instead of failing red.
"""
import argparse
import concurrent.futures
import json
import sys
import urllib.error
import urllib.request
from datetime import date, datetime
from pathlib import Path

RESOURCES = Path(__file__).resolve().parent.parent / "src" / "content" / "resources.json"
REPORT = Path(__file__).resolve().parent.parent / "freshness-report.md"
UA = "freestuff-freshness/1.0 (+https://campusfreebies.com; link check)"

# 401/403/429 mean "we were blocked", not "the page is gone" — never call those
# broken (avoids false alarms from bot-walls). Broken = clearly-dead responses.
BROKEN_STATUS = {400, 404, 410}


def check_link(url, timeout):
    """Return (state, detail). state in {ok, broken, blocked, error}."""
    req = urllib.request.Request(url, headers={"User-Agent": UA}, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return ("ok", resp.status)
    except urllib.error.HTTPError as e:
        if e.code in BROKEN_STATUS or 500 <= e.code < 600:
            return ("broken", f"HTTP {e.code}")
        if e.code in (401, 403, 429):
            return ("blocked", f"HTTP {e.code}")
        return ("blocked", f"HTTP {e.code}")
    except urllib.error.URLError as e:
        reason = str(e.reason)
        # A cert-chain problem usually means the page still works in a browser
        # (more lenient CA handling) — flag it, but don't call it dead.
        if "CERTIFICATE" in reason.upper() or "SSL" in reason.upper():
            return ("blocked", f"TLS: {reason[:70]}")
        return ("broken", f"unreachable: {reason[:80]}")
    except TimeoutError:
        return ("broken", "timeout")
    except Exception as e:  # malformed URL, etc.
        return ("error", str(e)[:80])


def age_days(last_verified, today):
    try:
        d = datetime.strptime(last_verified, "%Y-%m-%d").date()
        return (today - d).days
    except (ValueError, TypeError):
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stale-days", type=int, default=180)
    ap.add_argument("--timeout", type=int, default=12)
    ap.add_argument("--limit", type=int, default=0, help="check only the first N (testing)")
    args = ap.parse_args()

    entries = json.loads(RESOURCES.read_text())
    if args.limit:
        entries = entries[: args.limit]
    today = date.today()

    # Link checks run concurrently; staleness is local.
    broken, blocked, stale = [], [], []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(check_link, e["link"], args.timeout): e for e in entries}
        for fut in concurrent.futures.as_completed(futures):
            e = futures[fut]
            state, detail = fut.result()
            if state == "broken" or state == "error":
                broken.append((e, detail))
            elif state == "blocked":
                blocked.append((e, detail))

    for e in entries:
        a = age_days(e.get("last_verified"), today)
        if a is not None and a > args.stale_days:
            stale.append((e, a))

    lines = [f"# Freshness report — {today.isoformat()}", ""]
    lines.append(f"{len(entries)} entries · {len(broken)} broken · {len(blocked)} blocked · {len(stale)} stale (> {args.stale_days}d)")
    lines.append("")
    if broken:
        lines.append(f"## ❌ Broken links ({len(broken)}) — fix or remove")
        for e, d in sorted(broken, key=lambda x: x[0]["id"]):
            lines.append(f"- `{e['id']}` — {d} — {e['link']}")
        lines.append("")
    if stale:
        lines.append(f"## ⏳ Stale (> {args.stale_days} days since verified) ({len(stale)})")
        for e, a in sorted(stale, key=lambda x: -x[1]):
            lines.append(f"- `{e['id']}` — {a} days — verify and bump last_verified")
        lines.append("")
    if blocked:
        lines.append(f"## ⚠️ Blocked (couldn't confirm — bot-wall, not necessarily dead) ({len(blocked)})")
        for e, d in sorted(blocked, key=lambda x: x[0]["id"]):
            lines.append(f"- `{e['id']}` — {d} — {e['link']}")
        lines.append("")
    if not (broken or stale or blocked):
        lines.append("All links resolve and every entry is within the freshness window. ✅")

    report = "\n".join(lines)
    print(report)
    REPORT.write_text(report + "\n")

    # GitHub annotations (no-op locally): surface broken links in the Actions UI.
    for e, d in broken:
        print(f"::warning title=Broken link::{e['id']}: {d} ({e['link']})")

    return 1 if broken else 0


if __name__ == "__main__":
    sys.exit(main())
