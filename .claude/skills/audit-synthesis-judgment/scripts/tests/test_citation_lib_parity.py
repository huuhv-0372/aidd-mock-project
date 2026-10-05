"""Copy-parity + self-containment tests for the copied _citation_lib.py.

_citation_lib.py is COPIED from audit-doc-parity (see its docstring + CHANGELOG). These tests guard
against silent drift from the source and prove the skill runs without audit-doc-parity present.
"""
import sys
from pathlib import Path

_SCRIPTS = Path(__file__).parent.parent
sys.path.insert(0, str(_SCRIPTS))
import _citation_lib as ours  # noqa: E402


class TestRegexParity:
    def test_citation_re_still_matches_parity_pattern(self):
        # The regex is the anchoring foundation; a silent change breaks phantom detection.
        assert ours.CITATION_RE.pattern == r"\*\*Source:\*\*\s+`?([^`\n:]+):(\d+)(?:-(\d+))?`?"

    def test_basic_range_parse(self):
        m = ours.CITATION_RE.search("**Source:** `src/foo.py:10-20`")
        assert m and m.group(1) == "src/foo.py" and m.group(2) == "10" and m.group(3) == "20"


class TestTraversalGuard:
    def test_traversal_detected(self):
        assert ours._is_traversal("../etc/passwd") is True
        assert ours._is_traversal("/abs/path") is True
        assert ours._is_traversal("src/ok.py") is False


class TestSelfContainment:
    def test_no_runtime_import_of_audit_doc_parity(self):
        # No script in this skill may import from audit-doc-parity at runtime.
        for py in _SCRIPTS.glob("*.py"):
            text = py.read_text(encoding="utf-8")
            for line in text.splitlines():
                stripped = line.strip()
                if stripped.startswith(("import ", "from ")):
                    assert "audit_doc_parity" not in stripped and "audit-doc-parity" not in stripped
