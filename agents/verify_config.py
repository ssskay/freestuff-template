"""School-specific configuration for the link verifier — the single fork seam.

Kept dependency-free (stdlib only) so it can be imported and unit-tested without
the anthropic SDK or an API key, unlike verify.py which constructs an API client
at import time.
"""
import json
import os

_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "verify.config.json")


def load_config():
    """Load the verifier's school config (name, user_agent, recovery_domains)."""
    with open(_CONFIG_PATH, encoding="utf-8") as fh:
        return json.load(fh)


def build_domain_map(cfg):
    """Identity map of recovery domains. Replaces the hardcoded Dartmouth whitelist;
    link-recovery searches only these domains, so a fork must set its own."""
    return {d: d for d in cfg["recovery_domains"]}
