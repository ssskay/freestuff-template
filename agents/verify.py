#!/usr/bin/env python3
"""
Verifier Agent for Free Stuff @ Dartmouth
Checks all entries in resources.json for broken links and content drift
"""

import json
import os
import sys
import time
from datetime import date
from typing import Dict, List, Any
import requests
from anthropic import Anthropic

# Configuration
RESOURCES_PATH = "src/content/resources.json"
REPORT_PATH = "verification-report.md"
METRICS_DIR = "agents/metrics"
MODEL = "claude-sonnet-4-5-20250929"
TIMEOUT = 10  # seconds
USER_AGENT = "Dartmouth-Verifier/1.0 (freestuff-dartmouth; link verification)"

# Sonnet 4.5 list price, USD per 1M tokens (update if pricing changes).
PRICE_INPUT_PER_MTOK = 3.0
PRICE_OUTPUT_PER_MTOK = 15.0
# Assumed minutes of human review per flagged (broken / needs-review) item.
REVIEW_MINUTES_PER_ITEM = 2.0

# Per-run usage accumulator for cost reporting.
METRICS = {"claude_calls": 0, "input_tokens": 0, "output_tokens": 0}

# Initialize Anthropic client
client = Anthropic()

def log(message: str):
    """Print timestamped log message"""
    print(f"[{date.today()}] {message}")

def _record_usage(message) -> None:
    """Accumulate Claude token usage from a response for the run metrics."""
    METRICS["claude_calls"] += 1
    usage = getattr(message, "usage", None)
    if usage is not None:
        METRICS["input_tokens"] += getattr(usage, "input_tokens", 0) or 0
        METRICS["output_tokens"] += getattr(usage, "output_tokens", 0) or 0

def load_resources() -> List[Dict[str, Any]]:
    """Load resources from JSON file"""
    log(f"Loading resources from {RESOURCES_PATH}")
    with open(RESOURCES_PATH, 'r') as f:
        resources = json.load(f)
    log(f"Loaded {len(resources)} resources")
    return resources

def save_resources(resources: List[Dict[str, Any]]):
    """Save resources back to JSON file"""
    log(f"Saving {len(resources)} resources to {RESOURCES_PATH}")
    with open(RESOURCES_PATH, 'w') as f:
        json.dump(resources, f, indent=2)
    log("Resources saved successfully")

def check_url(url: str) -> tuple[int, str]:
    """
    Check if URL is accessible
    Returns: (status_code, content or error_message)
    """
    log(f"  Checking URL: {url}")
    try:
        response = requests.get(
            url,
            timeout=TIMEOUT,
            headers={"User-Agent": USER_AGENT},
            allow_redirects=True
        )
        log(f"  HTTP {response.status_code}")

        if response.status_code == 200:
            # Get text content
            return (response.status_code, response.text[:10000])  # First 10k chars
        else:
            return (response.status_code, f"HTTP {response.status_code}")

    except requests.exceptions.Timeout:
        log(f"  ERROR: Timeout after {TIMEOUT}s")
        return (0, "Timeout")
    except requests.exceptions.ConnectionError as e:
        log(f"  ERROR: Connection error - {str(e)[:100]}")
        return (0, f"Connection error: {str(e)[:100]}")
    except Exception as e:
        log(f"  ERROR: {str(e)[:100]}")
        return (0, f"Error: {str(e)[:100]}")

def verify_content_with_claude(resource: Dict[str, Any], page_content: str) -> tuple[bool, str]:
    """
    Use Claude to verify page content matches the resource description
    Returns: (matches, explanation)
    """
    log(f"  Asking Claude to verify content...")

    prompt = f"""You are verifying that a web page still describes the perk it's supposed to.

Resource entry:
- Name: {resource['name']}
- Description: {resource['description']}
- Category: {resource['category']}
- Expected content: A page about "{resource['name']}" for Dartmouth {', '.join(resource['eligibility'])}

Page content (first 10k chars):
{page_content}

Question: Does this page still describe the perk "{resource['name']}" as promised?

Respond with ONLY:
1. "MATCH" if the page clearly describes this perk
2. "NO_MATCH: [one-line reason]" if it doesn't match (page moved, content changed, wrong page, etc.)
3. "UNCLEAR: [one-line reason]" if you can't tell from the content provided

Be strict but not pedantic. If the page is about the right service/perk but the details changed slightly, that's still a MATCH.
"""

    try:
        message = client.messages.create(
            model=MODEL,
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )

        _record_usage(message)
        response_text = message.content[0].text.strip()
        log(f"  Claude says: {response_text[:100]}")

        if response_text.startswith("MATCH"):
            return (True, "Content verified")
        elif response_text.startswith("NO_MATCH:"):
            reason = response_text.replace("NO_MATCH:", "").strip()
            return (False, reason)
        elif response_text.startswith("UNCLEAR:"):
            reason = response_text.replace("UNCLEAR:", "").strip()
            return (False, f"Unclear - {reason}")
        else:
            log(f"  WARNING: Unexpected Claude response: {response_text}")
            return (False, f"Unexpected response: {response_text[:100]}")

    except Exception as e:
        log(f"  ERROR calling Claude: {str(e)[:100]}")
        return (False, f"Claude error: {str(e)[:100]}")

def find_replacement_url(resource: Dict[str, Any]) -> str | None:
    """
    Try to find a replacement URL by searching Dartmouth subdomains
    Returns: suggested_url or None
    """
    log(f"  Searching for replacement URL...")

    # Extract likely subdomain from source
    domain_map = {
        "library.dartmouth.edu": "library.dartmouth.edu",
        "services.dartmouth.edu": "services.dartmouth.edu",
        "alumni.dartmouth.edu": "alumni.dartmouth.edu",
        "outdoors.dartmouth.edu": "outdoors.dartmouth.edu",
        "students.dartmouth.edu": "students.dartmouth.edu",
    }

    search_domain = None
    for domain in domain_map.values():
        if domain in resource['source']:
            search_domain = domain
            break

    if not search_domain:
        log(f"  No obvious search domain from source: {resource['source']}")
        return None

    # Ask Claude to suggest a search and interpret results
    prompt = f"""A link is broken. Help find the correct replacement URL.

Broken resource:
- Name: {resource['name']}
- Description: {resource['description']}
- Broken link: {resource['link']}
- Likely domain: {search_domain}

Task: Suggest a Google search query to find the correct page on {search_domain} for "{resource['name']}".

Respond with ONLY a search query string, like:
site:{search_domain} "{resource['name']}"
"""

    try:
        message = client.messages.create(
            model=MODEL,
            max_tokens=100,
            messages=[{"role": "user", "content": prompt}]
        )

        _record_usage(message)
        search_query = message.content[0].text.strip()
        log(f"  Suggested search: {search_query}")
        return f"SEARCH: {search_query}"

    except Exception as e:
        log(f"  ERROR: {str(e)[:100]}")
        return None

def verify_resource(resource: Dict[str, Any]) -> tuple[Dict[str, Any], List[str]]:
    """
    Verify a single resource entry
    Returns: (updated resource dict, verification notes for report)
    """
    log(f"\nVerifying: {resource['name']} ({resource['id']})")

    result = resource.copy()
    notes = []

    # Check URL
    status_code, content_or_error = check_url(resource['link'])

    if status_code != 200:
        # Link is broken
        log(f"  BROKEN: {content_or_error}")
        result['status'] = 'broken'
        notes.append(f"Broken link: {content_or_error}")

        # Try to find replacement
        replacement = find_replacement_url(resource)
        if replacement:
            notes.append(f"Search suggestion: {replacement}")
    else:
        # Link works, verify content
        matches, explanation = verify_content_with_claude(resource, content_or_error)

        if matches:
            log(f"  ✓ VERIFIED")
            result['status'] = 'active'
            result['last_verified'] = str(date.today())
        else:
            # 'needs_review' keeps the resource visible (catalog treats only
            # 'broken'/'inactive' as hidden) while flagging it for human review.
            log(f"  ⚠ NEEDS REVIEW: {explanation}")
            result['status'] = 'needs_review'
            notes.append(f"Content mismatch: {explanation}")

    # Update last_verified for all entries (even broken ones, to track when we checked)
    result['last_verified'] = str(date.today())

    return result, notes

def generate_report(original: List[Dict], verified: List[Dict]) -> str:
    """Generate markdown verification report"""

    report_lines = [
        "# Verification Report",
        f"**Date:** {date.today()}",
        f"**Total Resources:** {len(verified)}",
        "",
    ]

    # Count by status
    active = [r for r in verified if r['status'] == 'active']
    broken = [r for r in verified if r['status'] == 'broken']
    needs_review = [r for r in verified if r['status'] == 'needs_review']

    report_lines.extend([
        "## Summary",
        f"- ✓ **Active:** {len(active)}",
        f"- ✗ **Broken:** {len(broken)}",
        f"- ⚠ **Needs Review:** {len(needs_review)}",
        "",
    ])

    # Broken links
    if broken:
        report_lines.extend([
            "## Broken Links",
            ""
        ])
        for r in broken:
            report_lines.append(f"### {r['name']}")
            report_lines.append(f"- **Link:** {r['link']}")
            report_lines.append(f"- **Issue:** {r['verification_notes'][0]}")
            if len(r['verification_notes']) > 1:
                report_lines.append(f"- **Suggestion:** {r['verification_notes'][1]}")
            report_lines.append("")

    # Needs review
    if needs_review:
        report_lines.extend([
            "## Needs Review",
            ""
        ])
        for r in needs_review:
            report_lines.append(f"### {r['name']}")
            report_lines.append(f"- **Link:** {r['link']}")
            report_lines.append(f"- **Issue:** {', '.join(r['verification_notes'])}")
            report_lines.append("")

    # Active (just count, don't list all)
    if active:
        report_lines.extend([
            "## Active Resources",
            f"{len(active)} resources verified successfully.",
            ""
        ])

    return "\n".join(report_lines)

def write_metrics(verified: List[Dict[str, Any]], duration_s: float) -> Dict[str, Any]:
    """Compute and persist per-run maintenance metrics: status counts, the
    human-review queue size and its estimated minutes, LLM token cost, and wall
    time. Output supports tracking the real cost-to-maintain over successive runs."""
    total = len(verified)
    active = sum(1 for r in verified if r.get('status') == 'active')
    broken = sum(1 for r in verified if r.get('status') == 'broken')
    needs_review = sum(1 for r in verified if r.get('status') == 'needs_review')
    flagged = broken + needs_review
    in_tok = METRICS["input_tokens"]
    out_tok = METRICS["output_tokens"]
    est_cost = (in_tok / 1_000_000) * PRICE_INPUT_PER_MTOK + (out_tok / 1_000_000) * PRICE_OUTPUT_PER_MTOK
    est_minutes = flagged * REVIEW_MINUTES_PER_ITEM

    metrics = {
        "date": str(date.today()),
        "duration_seconds": round(duration_s, 1),
        "resources_checked": total,
        "active": active,
        "broken": broken,
        "needs_review": needs_review,
        "items_needing_human_review": flagged,
        "est_human_review_minutes": round(est_minutes, 1),
        "claude_calls": METRICS["claude_calls"],
        "input_tokens": in_tok,
        "output_tokens": out_tok,
        "est_llm_cost_usd": round(est_cost, 4),
    }

    os.makedirs(METRICS_DIR, exist_ok=True)
    with open(os.path.join(METRICS_DIR, f"run-{date.today()}.json"), 'w') as f:
        json.dump(metrics, f, indent=2)
    with open(os.path.join(METRICS_DIR, "history.jsonl"), 'a') as f:
        f.write(json.dumps(metrics) + "\n")

    log("")
    log("=== Maintenance metrics ===")
    log(f"  Checked {total}: active {active} / broken {broken} / needs-review {needs_review}")
    log(f"  Human-review queue: {flagged} item(s), ~{est_minutes:.0f} min")
    log(f"  LLM: {METRICS['claude_calls']} calls, {in_tok} in / {out_tok} out tokens, ~${est_cost:.4f}")
    log(f"  Wall time: {duration_s:.1f}s")
    return metrics

def main():
    start = time.monotonic()
    log("Starting verification run")

    # Check for API key
    if not os.getenv("ANTHROPIC_API_KEY"):
        log("ERROR: ANTHROPIC_API_KEY not set")
        sys.exit(1)

    # Load resources
    resources = load_resources()

    # Verify each resource
    verified = []
    all_notes = {}  # Map resource_id -> notes
    for resource in resources:
        try:
            result, notes = verify_resource(resource)
            verified.append(result)
            if notes:
                all_notes[result['id']] = notes
        except Exception as e:
            log(f"ERROR verifying {resource['id']}: {str(e)}")
            # Keep original if verification fails
            verified.append(resource)

    # Save updated resources
    save_resources(verified)

    # Add notes back for report generation
    verified_with_notes = []
    for r in verified:
        r_copy = r.copy()
        if r['id'] in all_notes:
            r_copy['verification_notes'] = all_notes[r['id']]
        else:
            r_copy['verification_notes'] = []
        verified_with_notes.append(r_copy)

    # Generate report
    report = generate_report(resources, verified_with_notes)

    # Save report
    with open(REPORT_PATH, 'w') as f:
        f.write(report)
    log(f"Report saved to {REPORT_PATH}")

    write_metrics(verified, time.monotonic() - start)

    log("Verification complete!")

if __name__ == "__main__":
    main()
