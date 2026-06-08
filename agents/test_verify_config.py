import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import verify_config  # noqa: E402


def test_config_loads_school_and_domains():
    cfg = verify_config.load_config()
    assert cfg["school"] == "Dartmouth"
    assert "library.dartmouth.edu" in cfg["recovery_domains"]


def test_domain_map_is_built_from_config():
    cfg = verify_config.load_config()
    dm = verify_config.build_domain_map(cfg)
    for d in cfg["recovery_domains"]:
        assert dm[d] == d


def test_user_agent_comes_from_config():
    cfg = verify_config.load_config()
    assert cfg["user_agent"].startswith("Dartmouth-Verifier/")
