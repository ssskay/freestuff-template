#!/usr/bin/env python3
"""Free-bar audit: flag catalog entries whose conditions mention money.

A reviewer aid, not a link checker. It reads src/content/resources.json and
groups entries by how strongly they signal a cost, per docs/quality-guidelines.md:

  LETHAL  pay-to-obtain / "a discount, not free" — must be removed or rescoped.
          Mirrors tests/free-bar.test.ts; exit code is non-zero if any are found.
  REVIEW  a price appears somewhere — usually a disclosed paid upgrade that is
          fine (e.g. "free in labs; take-home costs $250/yr"). Eyeball each.

Run:  python3 agents/audit_free.py        (from the repo root)
Stdlib only; no network, no deps.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RESOURCES = ROOT / "src" / "content" / "resources.json"

# Marketing prose (scenario pages, homepage blurbs, config copy) must clear the
# bar too — removing a not-free entry once left copy still calling it "free or
# cheap". Plain "$"/"discount" are allowed in prose (honest paid-upgrade mentions).
BAD_PROSE = re.compile(r"free or cheap|free or discounted|free-ish|free\(ish\)", re.I)

# Pay-to-obtain — keep in lockstep with tests/free-bar.test.ts.
LETHAL = [
    (re.compile(r"(membership|subscription|dues|to join|enroll)\b[^.]{0,50}\$\s?\d", re.I), "paid membership/subscription to obtain it"),
    (re.compile(r"\$\s?\d[\d.,]*\s*/\s*(year|yr|month|mo)\b[^.]{0,50}(membership|subscription|dues|to join)", re.I), "recurring fee to obtain it"),
    (re.compile(r"\bdiscounted\s+\$\s?\d", re.I), "a discounted price (a discount is not free)"),
    (re.compile(r"\bdiscount,\s*not free\b", re.I), "self-described as a discount, not free"),
]

# Softer money signals worth a human glance. Negations like "no cost" / "at no
# charge" / "no admission fee" are stripped first so they do not trip this.
NEGATION = re.compile(r"\b(no|free of|without|at no)\s+(additional\s+)?(cost|charge|fee|admission fee|application fee)\b", re.I)
REVIEW = re.compile(r"\$\s?\d|\bfee\b|\bdues\b|\bdeposit\b|\bsurcharge\b|\bpaid\b|\bcosts?\b|\bdiscount", re.I)

FIELDS = ("name", "description", "notes")


def text_of(entry):
    parts = [entry.get(f) or "" for f in FIELDS]
    parts += entry.get("eligibility") or []
    return "  ".join(parts)


def context(text, m):
    s, e = max(0, m.start() - 35), min(len(text), m.end() + 35)
    return "…" + text[s:e].strip() + "…"


def main():
    entries = json.loads(RESOURCES.read_text())
    lethal, review = [], []
    for r in entries:
        t = text_of(r)
        hits = [(rx.search(t), why) for rx, why in LETHAL]
        hits = [(m, why) for m, why in hits if m]
        if hits:
            lethal.append((r, hits))
            continue
        stripped = NEGATION.sub(" ", t)
        m = REVIEW.search(stripped)
        if m:
            review.append((r, m, t))

    if lethal:
        print(f"\n❌ LETHAL — not free, fix before shipping ({len(lethal)}):")
        for r, hits in lethal:
            print(f"  • {r['id']} [{r.get('category')}] annual_value={r.get('annual_value')}")
            for m, why in hits:
                print(f"      {why}: \"{m.group(0).strip()}\"")

    if review:
        print(f"\n⚠️  REVIEW — price mentioned, confirm the free part is real ({len(review)}):")
        for r, m, t in review:
            print(f"  • {r['id']} [{r.get('category')}]: {context(t, m)}")

    # Scan marketing prose for free/cheap conflation.
    prose = []
    prose_files = list((ROOT / "src" / "pages").rglob("*.astro"))
    cfg = ROOT / "src" / "site.config.ts"
    if cfg.exists():
        prose_files.append(cfg)
    for f in prose_files:
        text = f.read_text()
        for m in BAD_PROSE.finditer(text):
            prose.append(f"{f.relative_to(ROOT)}: \"{m.group(0)}\"")
    for r in entries:
        for m in BAD_PROSE.finditer(text_of(r)):
            prose.append(f"{r['id']} (catalog): \"{m.group(0)}\"")
    if prose:
        print(f"\n❌ PROSE — copy conflates free with not-free ({len(prose)}):")
        for p in prose:
            print(f"  • {p}")

    bad = len(lethal) + len(prose)
    print(f"\n{len(entries)} entries · {len(lethal)} lethal · {len(review)} to review · {len(prose)} prose")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
