import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import verify_config  # noqa: E402


def test_load_config_returns_required_keys_with_correct_types():
    """Loader contract — survives any legitimate fork (CMU, etc.)."""
    cfg = verify_config.load_config()
    assert isinstance(cfg["school"], str) and cfg["school"]
    assert isinstance(cfg["user_agent"], str) and cfg["user_agent"]
    assert isinstance(cfg["recovery_domains"], list) and cfg["recovery_domains"]
    assert all(isinstance(d, str) for d in cfg["recovery_domains"])


def test_build_domain_map_is_identity_over_recovery_domains():
    """Structural property — not pinned to specific domains."""
    cfg = verify_config.load_config()
    dm = verify_config.build_domain_map(cfg)
    assert dm == {d: d for d in cfg["recovery_domains"]}


def test_build_domain_map_rejects_missing_or_empty_domains():
    import pytest
    with pytest.raises(SystemExit):
        verify_config.build_domain_map({})
    with pytest.raises(SystemExit):
        verify_config.build_domain_map({"recovery_domains": []})


def test_dartmouth_config_content_smoke():
    """Pack #1 data smoke test — Dartmouth-specific; expected to change per fork."""
    cfg = verify_config.load_config()
    assert cfg["school"] == "Dartmouth"
    assert "library.dartmouth.edu" in cfg["recovery_domains"]
    assert cfg["user_agent"].startswith("Dartmouth-Verifier/")
